import os
import sys
import requests
from datetime import datetime
from sqlmodel import Session, select

# backend imports workaround
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from db import engine
from schema import Politician

# Official NYC Open Data API for Council Members (uvw5-9znb)
NYC_COUNCIL_API = "https://data.cityofnewyork.us/resource/uvw5-9znb.json"

# GeoJSON for NYC Council Districts (mkqi-d8x3)
NYC_DISTRICTS_GEOJSON = "https://data.cityofnewyork.us/resource/mkqi-d8x3.geojson"

def sync_council_members():
    print("Fetching live NYC Council members from Open Data...")
    try:
        # We fetch all but filter for current terms
        params = {
            "$limit": 1000,
            "$order": "term_end DESC"
        }
        response = requests.get(NYC_COUNCIL_API, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        print(f"  Received {len(data)} records from API.")
    except Exception as e:
        print(f"  Error: {e}")
        return

    current_date = datetime.utcnow().isoformat()
    
    # Simple mapping for districts to boroughs for context
    # In a real app, this would be a lookup table
    district_to_borough = {
        "1": "Manhattan", "2": "Manhattan", "3": "Manhattan", "4": "Manhattan", "5": "Manhattan",
        "6": "Manhattan", "7": "Manhattan", "8": "Manhattan/Bronx", "9": "Manhattan", "10": "Manhattan",
        "11": "Bronx", "12": "Bronx", "13": "Bronx", "14": "Bronx", "15": "Bronx", "16": "Bronx", "17": "Bronx", "18": "Bronx",
        "19": "Queens", "20": "Queens", "21": "Queens", "22": "Queens", "23": "Queens", "24": "Queens", "25": "Queens",
        "26": "Queens", "27": "Queens", "28": "Queens", "29": "Queens", "30": "Queens", "31": "Queens", "32": "Queens",
        "33": "Brooklyn", "34": "Brooklyn", "35": "Brooklyn", "36": "Brooklyn", "37": "Brooklyn", "38": "Brooklyn", "39": "Brooklyn",
        "40": "Brooklyn", "41": "Brooklyn", "42": "Brooklyn", "43": "Brooklyn", "44": "Brooklyn", "45": "Brooklyn", "46": "Brooklyn",
        "47": "Brooklyn", "48": "Brooklyn", "49": "Staten Island", "50": "Staten Island", "51": "Staten Island"
    }

    with Session(engine) as session:
        synced = 0
        skipped = 0
        
        # Filter for current members: term_end must be in the future or very recent
        # The API doesn't have 'party' directly in this specific endpoint, we'll infer or keep as None
        for m in data:
            name = m.get("name")
            term_end_str = m.get("term_end")
            district = m.get("district")
            
            if not name or not district:
                continue
                
            # Filter for current/future terms
            if term_end_str and term_end_str < current_date:
                skipped += 1
                continue

            term_end = datetime.fromisoformat(term_end_str.replace("Z", "+00:00")) if term_end_str else None

            # Dedup/Update
            existing = session.exec(
                select(Politician).where(Politician.full_name == name, Politician.district_number == district)
            ).first()

            if existing:
                existing.term_end = term_end
                existing.office_id = m.get("office_id")
                session.add(existing)
            else:
                p = Politician(
                    full_name=name,
                    role="Council Member",
                    district_number=district,
                    location_borough=district_to_borough.get(district, "Unknown"),
                    bio_url=f"https://council.nyc.gov/district-{district}/",
                    term_end=term_end,
                    office_id=m.get("office_id")
                )
                session.add(p)
            synced += 1

        session.commit()
        print(f"  Sync complete: {synced} synced, {skipped} historical records skipped.")

def cache_geojson():
    print("Downloading District GeoJSON...")
    try:
        response = requests.get(NYC_DISTRICTS_GEOJSON, timeout=30)
        response.raise_for_status()
        
        # Save to backend/static or just a local file for the API to serve
        output_path = os.path.join(os.path.dirname(__file__), "..", "backend", "districts.geojson")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(response.text)
        print(f"  GeoJSON cached to {output_path}")
    except Exception as e:
        print(f"  Error caching GeoJSON: {e}")

if __name__ == "__main__":
    sync_council_members()
    cache_geojson()
