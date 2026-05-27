"""
Fetches NYC Council legislation from the Legistar Web API and populates:
  - LegislationEvent  (one row per enacted/adopted/approved/failed matter)

NOTE: The Legistar NYC API does not expose per-member vote records via /Matters/{id}/Votes (returns 404 for all matters). 
We instead populate LegislationEvents with outcome data only (Passed/Failed/Pending) and leave VoteRecord empty. 
Idempotent — safe to re-run as a nightly cron job.

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

_THIS_DIR     = os.path.dirname(os.path.abspath(__file__))   # pipeline/scrapers/
_PIPELINE_DIR = os.path.dirname(_THIS_DIR)                   # pipeline/
_PROJECT_ROOT = os.path.dirname(_PIPELINE_DIR)               # project root
_BACKEND_DIR  = os.path.join(_PROJECT_ROOT, "backend")       # backend/

for _p in (_BACKEND_DIR, _PROJECT_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from db import engine
from schema import LegislationEvent

API_KEY    = os.getenv("NYC_COUNCIL_API_KEY", "")
BASE       = "https://webapi.legistar.com/v1/nyc"
UA         = {"User-Agent": "CivicSpiegel/0.1; civic research bot"}
RATE_SLEEP = 0.15

# Legistar status values that represent a completed floor vote
VOTED_STATUSES = ["Enacted", "Adopted", "Approved", "Failed", "Vetoed", "Withdrawn"]

# Map Legistar status → our outcome field
STATUS_TO_OUTCOME = {
    "Enacted":   "Passed",
    "Adopted":   "Passed",
    "Approved":  "Passed",
    "Failed":    "Failed",
    "Vetoed":    "Failed",
    "Withdrawn": "Failed",
}


def legistar_get(path: str, params: Optional[dict] = None) -> list | dict:
    p = {"token": API_KEY, **(params or {})}
    r = requests.get(f"{BASE}{path}", params=p, headers=UA, timeout=20)
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


def populate_votes(limit: int = 200, year_filter: Optional[int] = None) -> None:
    if not API_KEY:
        print("✗  NYC_COUNCIL_API_KEY not set — aborting.")
        sys.exit(1)

    print(f"Fetching NYC Council legislation (statuses: {', '.join(VOTED_STATUSES)})…")

    inserted = 0
    updated  = 0
    per_status = max(1, limit // len(VOTED_STATUSES))

    with Session(engine) as session:
        for status in VOTED_STATUSES:
            params: dict = {
                "$top":      per_status,
                "$orderby":  "MatterLastModifiedUtc desc",
                "$filter":   f"MatterStatusName eq '{status}'",
            }
            if year_filter:
                params["$filter"] += f" and year(MatterLastModifiedUtc) eq {year_filter}"

            try:
                matters = legistar_get("/Matters", params)
            except Exception as e:
                print(f"  ⚠  Failed to fetch status={status!r}: {e}")
                continue

            if not isinstance(matters, list):
                continue

            print(f"  {status}: {len(matters)} matters")

            for matter in matters:
                matter_id   = matter.get("MatterId")
                file_number = matter.get("MatterFile", "")
                title       = matter.get("MatterName", "Untitled")
                matter_type = matter.get("MatterTypeName", "Legislation")
                event_date  = parse_date(matter.get("MatterLastModifiedDate"))
                event_url   = (
                    f"https://legistar.council.nyc.gov/gateway.aspx"
                    f"?m=l&id=/matter.aspx?key={matter_id}"
                )
                full_title  = f"NYC Council {matter_type} ({file_number}): {title}"
                outcome     = STATUS_TO_OUTCOME.get(status, "Pending")

                existing = session.exec(
                    select(LegislationEvent).where(
                        LegislationEvent.event_url == event_url
                    )
                ).first()

                if existing:
                    existing.status     = outcome
                    existing.event_date = event_date
                    session.add(existing)
                    updated += 1
                else:
                    session.add(LegislationEvent(
                        title=full_title,
                        description=matter.get("MatterTitle", "") or matter.get("MatterName", ""),
                        jurisdiction="NYC Council",
                        status=outcome,
                        event_date=event_date,
                        event_url=event_url,
                    ))
                    inserted += 1

                time.sleep(RATE_SLEEP)

            session.commit()

    print(
        f"\n✓  Done.\n"
        f"   LegislationEvents: {inserted} inserted, {updated} updated\n"
        f"   Note: Per-member VoteRecords not available from Legistar NYC API.\n"
        f"         Bill outcomes (Passed/Failed) are stored in LegislationEvent.status."
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate NYC Council legislation outcomes from Legistar")
    parser.add_argument("--limit", type=int, default=200, help="Max matters to fetch total (split across statuses, default 200)")
    parser.add_argument("--year",  type=int, default=None, help="Filter by year e.g. 2024")
    args = parser.parse_args()
    populate_votes(limit=args.limit, year_filter=args.year)