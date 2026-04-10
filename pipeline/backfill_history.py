import sys
import os
from datetime import datetime
from scrapers.nyc_council_legistar import NYCCouncilLegistarScraper
from scrapers.nys_senate_bills import NYSSenateBillsScraper
from scrapers.nys_senate_transcripts import NYSSenateTranscriptsScraper
from scrapers.nyc_council_meetings import NYCCouncilMeetingsScraper

def run_historical_backfill(use_json: bool = False):
    """
    One-time script to populate the database with high-density historical data (2020-2026).
    Uses the new AI Summarization layer to keep storage footprint minimal.
    """
    if not use_json:
        use_json = "--json" in sys.argv

    # NYS Senate sessions are biennial and must be queried by the ODD session-start year
    # (e.g., 2023 covers both 2023 and 2024).
    years = [2021, 2023, 2025]
    
    print("=== Civic Spiegel: Historical Backfill Starting ===")
    print(f"Target Years: {years}")
    print(f"Mode: {'JSON (local)' if use_json else 'Neon DB'}")
    print("Optimization: HIGH-DENSITY (AI Summarization + Half-Precision Vectors)\n")

    # 1. NYC Council Legislation (Bulk Matter Fetch)
    print("--- [1/4] NYC Council Legistar Backfill ---")
    legistar = NYCCouncilLegistarScraper()
    # Fetch 50 most recent recent items for backfill (Legistar doesn't use years in the same way)
    legistar.run(use_json=use_json, limit=50)

    # 2. NYC Council Meetings (Historical Metadata)
    print("\n--- [2/4] NYC Council Meetings Backfill ---")
    meetings = NYCCouncilMeetingsScraper()
    meetings.run(use_json=use_json) 

    # 3. NYS Senate Bills (Multi-Year)
    print("\n--- [3/4] NYS Senate Bills Backfill ---")
    nys_bills = NYSSenateBillsScraper()
    for year in years:
        nys_bills.run(use_json=use_json, year=year)

    # 4. NYS Senate Transcripts (Multi-Year)
    print("\n--- [4/4] NYS Senate Transcripts Backfill ---")
    nys_transcripts = NYSSenateTranscriptsScraper()
    for year in years:
        nys_transcripts.run(use_json=use_json, year=year)

    print("\n=== Historical Backfill Complete! ===")
    print("Your database now has a dense foundation of historical context.")

if __name__ == "__main__":
    run_historical_backfill()
