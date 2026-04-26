
# Load NYC Council District -> ZIP and District -> Neighborhood crosswalks.


import json
import os
import sys
from typing import Dict, List

import requests
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from sqlmodel import Session, select

# backend imports workaround for db and schema
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from db import engine
from schema import District, Politician

DISTRICTS_GEOJSON = os.path.join(
    os.path.dirname(__file__), "..", "backend", "districts.geojson"
)
MODZCTA_URL = (
    "https://data.cityofnewyork.us/api/geospatial/pri4-ifjk"
    "?method=export&format=GeoJSON"
)
NTA_URL = (
    "https://data.cityofnewyork.us/api/geospatial/9nt8-h7nd"
    "?method=export&format=GeoJSON"
)
CACHE_DIR = os.path.join(os.path.dirname(__file__), "output", "geo_cache")

# Min fraction of the candidate feature that must overlap a council district
# for the feature to count as belonging to that district. Filters out polygons
# that only touch at edges or share a sliver from coordinate noise.
MIN_OVERLAP_FRACTION = 0.01


def fetch_geojson(url: str, cache_name: str) -> dict:
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(CACHE_DIR, cache_name)
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            return json.load(f)
    print(f"Fetching {url}")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    with open(cache_path, "w") as f:
        json.dump(data, f)
    return data


def load_council_polygons() -> Dict[str, BaseGeometry]:
    with open(DISTRICTS_GEOJSON) as f:
        gj = json.load(f)
    polygons: Dict[str, BaseGeometry] = {}
    for feat in gj["features"]:
        props = feat.get("properties") or {}
        dist_num = str(props.get("coun_dist") or "").strip()
        if not dist_num:
            continue
        polygons[dist_num] = shape(feat["geometry"])
    return polygons


def crosswalk(
    council: Dict[str, BaseGeometry],
    features: list,
    label_field: str,
) -> Dict[str, List[str]]:
    by_dist: Dict[str, set] = {num: set() for num in council}
    for feat in features:
        props = feat.get("properties") or {}
        label = props.get(label_field)
        if not label:
            continue
        try:
            geom = shape(feat["geometry"])
        except Exception:
            continue
        if geom.is_empty:
            continue
        feat_area = geom.area or 1e-12
        for num, poly in council.items():
            if not poly.intersects(geom):
                continue
            try:
                inter = poly.intersection(geom)
            except Exception:
                continue
            if inter.is_empty:
                continue
            if inter.area / feat_area < MIN_OVERLAP_FRACTION:
                continue
            by_dist[num].add(str(label).strip())
    return {num: sorted(labels) for num, labels in by_dist.items()}


def borough_map_from_politicians(session: Session) -> Dict[str, str]:
    rows = session.exec(
        select(Politician).where(Politician.role == "Council Member")
    ).all()
    out: Dict[str, str] = {}
    for p in rows:
        if p.district_number and p.location_borough and p.district_number not in out:
            out[p.district_number] = p.location_borough
    return out


def upsert_districts(
    zip_map: Dict[str, List[str]],
    nta_map: Dict[str, List[str]],
) -> None:
    with Session(engine) as session:
        boroughs = borough_map_from_politicians(session)
        existing = session.exec(
            select(District).where(District.jurisdiction == "NYC Council")
        ).all()
        by_num = {d.district_number: d for d in existing}

        all_nums = set(zip_map) | set(nta_map)
        inserted = 0
        updated = 0
        for num in sorted(all_nums, key=lambda x: int(x) if x.isdigit() else 9999):
            zips = zip_map.get(num, [])
            ntas = nta_map.get(num, [])
            borough = boroughs.get(num)
            if num in by_num:
                row = by_num[num]
                row.zip_codes = zips
                row.neighborhoods = ntas
                if borough:
                    row.borough = borough
                session.add(row)
                updated += 1
            else:
                session.add(
                    District(
                        district_number=num,
                        jurisdiction="NYC Council",
                        borough=borough,
                        zip_codes=zips,
                        neighborhoods=ntas,
                    )
                )
                inserted += 1
        session.commit()
        print(f"Districts upserted: {inserted} inserted, {updated} updated.")


def main() -> None:
    council = load_council_polygons()
    print(f"Loaded {len(council)} council district polygons.")

    zcta = fetch_geojson(MODZCTA_URL, "modzcta.geojson")
    nta = fetch_geojson(NTA_URL, "nta_2020.geojson")

    zip_map = crosswalk(council, zcta.get("features", []), "modzcta")
    nta_map = crosswalk(council, nta.get("features", []), "ntaname")

    sample = sorted(zip_map, key=lambda x: int(x) if x.isdigit() else 9999)[:3]
    for num in sample:
        print(
            f"  District {num}: "
            f"zips={zip_map.get(num, [])[:5]} "
            f"neighborhoods={nta_map.get(num, [])[:3]}"
        )

    upsert_districts(zip_map, nta_map)


if __name__ == "__main__":
    main()
