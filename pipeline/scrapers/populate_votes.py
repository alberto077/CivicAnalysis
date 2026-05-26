"""
Fetches NYC Council bill votes from the Legistar Web API and populates:
  - LegislationEvent  (one row per bill/matter)
  - VoteRecord        (one row per council member vote on each bill)

Run:   python pipeline/scrapers/populate_votes.py --limit 200
"""

import os
import sys
import time
import argparse
from datetime import datetime, date
from typing import Optional

import requests
from dotenv import load_dotenv
from sqlmodel import Session, select

load_dotenv()

_THIS_DIR    = os.path.dirname(os.path.abspath(__file__))          # pipeline/scrapers/
_PIPELINE_DIR = os.path.dirname(_THIS_DIR)                         # pipeline/
_PROJECT_ROOT = os.path.dirname(_PIPELINE_DIR)                     # project root
_BACKEND_DIR  = os.path.join(_PROJECT_ROOT, "backend")             # backend/

for _p in (_BACKEND_DIR, _PROJECT_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from db import engine
from schema import LegislationEvent, VoteRecord, Politician

API_KEY   = os.getenv("NYC_COUNCIL_API_KEY", "")
BASE      = "https://webapi.legistar.com/v1/nyc"
UA        = {"User-Agent": "CivicSpiegel/0.1; civic research bot"}
RATE_SLEEP = 0.25   # seconds between requests — Legistar is generous but not unlimited



def legistar_get(path: str, params: Optional[dict] = None) -> list | dict:
    p = {"token": API_KEY, **(params or {})}
    url = f"{BASE}{path}"
    r = requests.get(url, params=p, headers=UA, timeout=20)
    r.raise_for_status()
    return r.json()


def parse_date(raw: Optional[str]) -> Optional[date]:
    if not raw:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw[:19], fmt).date()
        except (ValueError, TypeError):
            pass
    return None


# politician lookup (council member name → Politician.id)
def build_politician_map(session: Session) -> dict[str, int]:
    """
    Return a dict of  normalized_name → politician.id  for all council members.
    We match Legistar voter names against this map.
    """
    rows = session.exec(
        select(Politician).where(Politician.role == "Council Member")
    ).all()
    m: dict[str, int] = {}
    for p in rows:
        key = p.full_name.strip().lower() if p.full_name else ""
        if key and p.id:
            m[key] = p.id
    return m


def fuzzy_match_politician(
    voter_name: str,
    pol_map: dict[str, int],
) -> Optional[int]:
    """
    Try exact, then last-name, match between a Legistar voter name and our
    Politician table. Returns politician.id or None.
    """
    key = voter_name.strip().lower()
    if key in pol_map:
        return pol_map[key]
    # last-name fallback
    last = key.split()[-1] if key.split() else ""
    for name, pid in pol_map.items():
        if name.split()[-1] == last:
            return pid
    return None


# vote value normalisation
VOTE_MAP = {
    "affirmative": "Yea",
    "yea": "Yea",
    "yes": "Yea",
    "negative": "Nay",
    "nay": "Nay",
    "no": "Nay",
    "abstain": "Abstain",
    "absent": "Absent",
    "non-voting": "Absent",
    "excused": "Absent",
}


def normalise_vote(raw: str) -> str:
    return VOTE_MAP.get((raw or "").strip().lower(), "Abstain")


# main ingestion logic
def populate_votes(limit: int = 100, year_filter: Optional[int] = None) -> None:
    if not API_KEY:
        print("✗  NYC_COUNCIL_API_KEY not set — aborting.")
        sys.exit(1)

    print(f"Fetching up to {limit} recent NYC Council matters from Legistar…")

    params: dict = {
        "$top": limit,
        "$orderby": "MatterLastModifiedUtc desc",
    }
    if year_filter:
        # Filter server-side by year using OData
        params["$filter"] = (
            f"year(MatterLastModifiedUtc) eq {year_filter}"
        )

    matters = legistar_get("/Matters", params)
    if not isinstance(matters, list):
        print("Unexpected API response:", matters)
        return

    print(f"  Retrieved {len(matters)} matters.")

    with Session(engine) as session:
        pol_map = build_politician_map(session)
        print(f"  Loaded {len(pol_map)} council members for vote matching.")

        inserted_events  = 0
        updated_events   = 0
        inserted_votes   = 0
        skipped_votes    = 0

        for matter in matters:
            matter_id   = matter.get("MatterId")
            file_number = matter.get("MatterFile", "")
            title       = matter.get("MatterName", "Untitled")
            status      = matter.get("MatterStatusName", "Unknown")
            matter_type = matter.get("MatterTypeName", "Legislation")
            event_date  = parse_date(matter.get("MatterLastModifiedDate"))
            event_url   = (
                f"https://legistar.council.nyc.gov/gateway.aspx"
                f"?m=l&id=/matter.aspx?key={matter_id}"
            )
            full_title  = f"NYC Council {matter_type} ({file_number}): {title}"

            # Upsert LegislationEvent
            existing_event = session.exec(
                select(LegislationEvent).where(
                    LegislationEvent.event_url == event_url
                )
            ).first()

            if existing_event:
                existing_event.status = status
                existing_event.event_date = event_date
                session.add(existing_event)
                event_obj = existing_event
                updated_events += 1
            else:
                event_obj = LegislationEvent(
                    title=full_title,
                    description=matter.get("MatterTitle", ""),
                    jurisdiction="NYC Council",
                    status=status,
                    event_date=event_date,
                    event_url=event_url,
                )
                session.add(event_obj)
                session.flush()   # get the new id
                inserted_events += 1

            # Fetch votes for this matter
            time.sleep(RATE_SLEEP)
            try:
                vote_records = legistar_get(f"/Matters/{matter_id}/Votes")
            except requests.exceptions.HTTPError as e:
                if e.response is not None and e.response.status_code == 404:
                    # 404 = no votes for this matter yet (still in committee or an admin/non-votable item) - skip
                    continue
                print(f"  ⚠  Votes fetch failed for matter {matter_id}: {e}")
                continue
            except Exception as e:
                print(f"  ⚠  Votes fetch failed for matter {matter_id}: {e}")
                continue

            if not isinstance(vote_records, list) or not vote_records:
                continue   # no votes yet (committee stage, not floor-voted)

            for vr in vote_records:
                voter_name  = vr.get("VotePersonName", "")
                vote_value  = normalise_vote(vr.get("VoteValueName", ""))
                pol_id      = fuzzy_match_politician(voter_name, pol_map)

                if pol_id is None:
                    skipped_votes += 1
                    continue   # voter not in our Politician table - skip

                # Dedup: one VoteRecord per (event, politician)
                existing_vote = session.exec(
                    select(VoteRecord).where(
                        VoteRecord.legislation_event_id == event_obj.id,
                        VoteRecord.politician_id == pol_id,
                    )
                ).first()

                if existing_vote:
                    existing_vote.vote_cast = vote_value
                    session.add(existing_vote)
                else:
                    session.add(
                        VoteRecord(
                            politician_id=pol_id,
                            legislation_event_id=event_obj.id,
                            vote_cast=vote_value,
                        )
                    )
                    inserted_votes += 1

            session.commit()

        print(
            f"\n✓  Done.\n"
            f"   LegislationEvents:  {inserted_events} inserted, {updated_events} updated\n"
            f"   VoteRecords:        {inserted_votes} inserted, {skipped_votes} skipped "
            f"(voter not in Politician table)"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate NYC Council votes from Legistar")
    parser.add_argument("--limit",  type=int, default=100,   help="Max matters to fetch (default 100)")
    parser.add_argument("--year",   type=int, default=None,  help="Filter by year e.g. 2025")
    args = parser.parse_args()
    populate_votes(limit=args.limit, year_filter=args.year)