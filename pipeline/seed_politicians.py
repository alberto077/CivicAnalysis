import os
import sys
import requests
from sqlalchemy import text
from sqlmodel import Session

# backend imports workaround
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from db import engine
# NYC Open Data SODA endpoints for Council Members.
# Try in order so seeding still works if one dataset ID is retired.
NYC_COUNCIL_MEMBERS_URLS = [
    "https://data.cityofnewyork.us/resource/uvw5-9znb.json",
    "https://data.cityofnewyork.us/resource/4pc6-f5fb.json",
]

DISTRICT_TO_BOROUGH = {
    "1": "Manhattan", "2": "Manhattan", "3": "Manhattan", "4": "Manhattan", "5": "Manhattan",
    "6": "Manhattan", "7": "Manhattan", "8": "Manhattan/Bronx", "9": "Manhattan", "10": "Manhattan",
    "11": "Bronx", "12": "Bronx", "13": "Bronx", "14": "Bronx", "15": "Bronx", "16": "Bronx", "17": "Bronx", "18": "Bronx",
    "19": "Queens", "20": "Queens", "21": "Queens", "22": "Queens", "23": "Queens", "24": "Queens", "25": "Queens",
    "26": "Queens", "27": "Queens", "28": "Queens", "29": "Queens", "30": "Queens", "31": "Queens", "32": "Queens",
    "33": "Brooklyn", "34": "Brooklyn", "35": "Brooklyn", "36": "Brooklyn", "37": "Brooklyn", "38": "Brooklyn", "39": "Brooklyn",
    "40": "Brooklyn", "41": "Brooklyn", "42": "Brooklyn", "43": "Brooklyn", "44": "Brooklyn", "45": "Brooklyn", "46": "Brooklyn",
    "47": "Brooklyn", "48": "Brooklyn", "49": "Staten Island", "50": "Staten Island", "51": "Staten Island",
}


def fetch_members():
    last_error = None
    for url in NYC_COUNCIL_MEMBERS_URLS:
        try:
            print(f"  Trying {url}")
            response = requests.get(url, timeout=20)
            response.raise_for_status()
            members = response.json()
            print(f"  Fetched {len(members)} records from {url}")
            return members
        except Exception as e:
            last_error = e
            print(f"  Failed {url}: {e}")
    raise RuntimeError(f"All NYC council endpoints failed. Last error: {last_error}")

def seed_politicians():
    print("Fetching NYC Council members from Open Data...")
    try:
        members = fetch_members()
    except Exception as e:
        print(f"Error fetching members: {e}")
        return

    # Filter for unique members in the current/most recent session
    # The dataset has historical data. We want the most recent entries for each district.
    unique_members = {}
    for m in members:
        # We use name and district as a key to identify unique current members
        # The dataset fields are: 'name', 'district', 'borough', 'party', 'url'
        name = m.get("name", "Unknown")
        district = m.get("district", "")
        
        # Simple heuristic: if it's historical, we might see duplicates. 
        # For MVP, we'll just take the first occurrence of each unique name.
        if name not in unique_members:
            unique_members[name] = m

    with Session(engine) as session:
        inserted = 0
        updated = 0
        
        for name, m in unique_members.items():
            district = m.get("district", "")
            district_str = str(district).strip()
            borough = (m.get("borough") or DISTRICT_TO_BOROUGH.get(district_str, "")).strip()
            party = m.get("party", "")
            bio_url = ""
            if isinstance(m.get("url"), dict):
                bio_url = m["url"].get("url", "")
            elif isinstance(m.get("url"), str):
                bio_url = m["url"]
            if not bio_url and district_str:
                bio_url = f"https://council.nyc.gov/district-{district_str}/"

            # Use raw SQL against guaranteed columns only so this still works
            # when optional ORM fields (e.g. term_end/office_id) are missing in DB.
            existing = session.exec(
                text("SELECT id FROM politician WHERE full_name = :name LIMIT 1"),
                params={"name": name},
            ).first()

            if existing:
                session.exec(
                    text(
                        """
                        UPDATE politician
                        SET district_number = :district_number,
                            location_borough = :location_borough,
                            party = :party,
                            bio_url = :bio_url
                        WHERE full_name = :name
                        """
                    ),
                    params={
                        "name": name,
                        "district_number": district_str,
                        "location_borough": borough,
                        "party": party,
                        "bio_url": bio_url,
                    },
                )
                updated += 1
            else:
                session.exec(
                    text(
                        """
                        INSERT INTO politician
                            (full_name, role, district_number, location_borough, party, bio_url)
                        VALUES
                            (:full_name, :role, :district_number, :location_borough, :party, :bio_url)
                        """
                    ),
                    params={
                        "full_name": name,
                        "role": "Council Member",
                        "district_number": district_str,
                        "location_borough": borough,
                        "party": party,
                        "bio_url": bio_url,
                    },
                )
                inserted += 1
        
        session.commit()
        print(f"Seeding complete: {inserted} inserted, {updated} updated.")

if __name__ == "__main__":
    seed_politicians()
