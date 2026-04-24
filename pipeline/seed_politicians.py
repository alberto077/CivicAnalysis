import os
import sys
import requests
from sqlmodel import Session, select

# backend imports workaround
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from db import engine
from schema import Politician

# NYC Open Data SODA endpoint for Council Members (1999-Present)
# Note: We filter for 'active' and current terms where possible, or just take the latest set.
NYC_COUNCIL_MEMBERS_URL = "https://data.cityofnewyork.us/resource/4pc6-f5fb.json"

def seed_politicians():
    print("Fetching NYC Council members from Open Data...")
    try:
        response = requests.get(NYC_COUNCIL_MEMBERS_URL, timeout=15)
        response.raise_for_status()
        members = response.json()
        print(f"Fetched {len(members)} records.")
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
            borough = m.get("borough", "")
            party = m.get("party", "")
            bio_url = ""
            if isinstance(m.get("url"), dict):
                bio_url = m["url"].get("url", "")
            elif isinstance(m.get("url"), str):
                bio_url = m["url"]

            # Check if exists
            existing = session.exec(
                select(Politician).where(Politician.full_name == name)
            ).first()

            if existing:
                existing.district_number = str(district)
                existing.location_borough = borough
                existing.party = party
                existing.bio_url = bio_url
                session.add(existing)
                updated += 1
            else:
                p = Politician(
                    full_name=name,
                    role="Council Member",
                    district_number=str(district),
                    location_borough=borough,
                    party=party,
                    bio_url=bio_url
                )
                session.add(p)
                inserted += 1
        
        session.commit()
        print(f"Seeding complete: {inserted} inserted, {updated} updated.")

if __name__ == "__main__":
    seed_politicians()
