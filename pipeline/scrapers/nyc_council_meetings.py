"""
NYC Council Meetings Scraper (NYC Open Data)
--------------------------------------------
Fetches NYC City Council meeting records from the official NYC Open Data
Socrata API. Each record includes committee name, meeting date, location,
and a direct Legistar URL to the full agenda/minutes.

Source: https://data.cityofnewyork.us/resource/m48u-yjt8.json
Type:   Official Government Record
Signal: High — structured metadata for LegislationEvent table
        + Legistar URL links to full agenda text for future deeper scraping

No API key required for read-only access under Socrata's public tier
(rate limit: 1000 req/day unauthenticated — sufficient for MVP).
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper
from embedding_engine import EmbeddingEngine
from tag_classifier import TagClassifier
from typing import List, Dict, Any


# NYC Open Data SODA endpoint for Council Meetings 1999-2024
NYC_COUNCIL_MEETINGS_URL = (
    "https://data.cityofnewyork.us/resource/m48u-yjt8.json"
    "?$order=meeting_date DESC"
    "&$limit=50"
    "&$where=minutes_status='Final'"  # Only finalized meetings with published minutes
)


class NYCCouncilMeetingsScraper(BaseScraper):
    """
    Scrapes official NYC City Council meeting records from NYC Open Data.

    Each record provides:
      - committee name (e.g., "City Council", "Committee on Housing and Buildings")
      - meeting date and time
      - location
      - Legistar URL (links to full agenda/minutes for deeper scraping)

    This scraper populates the LegislationEvent table and builds a corpus
    of council meeting metadata. The Legistar URL can be followed in a
    future scraper to extract the actual transcript text.
    """

    def __init__(self):
        self.embedder = EmbeddingEngine()
        self.classifier = TagClassifier()

    def scrape(self) -> List[Dict[str, Any]]:
        print(f"Fetching NYC Council meetings from NYC Open Data...")
        try:
            import requests

            headers = {
                "User-Agent": "Mozilla/5.0 (CivicSpiegel/0.1; civic research bot)",
            }
            response = requests.get(NYC_COUNCIL_MEETINGS_URL, headers=headers, timeout=15)
            response.raise_for_status()
            records = response.json()
            print(f"  Fetched {len(records)} meeting records.")
            return records

        except Exception as e:
            print(f"Error fetching NYC Open Data council meetings: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        print("Processing NYC Council meeting records...")
        processed = []

        for record in raw_data:
            event_id = record.get("event_id", "unknown")
            committee = record.get("committee", "NYC Council")
            meeting_date = record.get("meeting_date", "")
            meeting_time = record.get("meeting_time", "")
            location = record.get("meeting_location", "")
            agenda_status = record.get("agenda_status", "")
            minutes_status = record.get("minutes_status", "")
            legistar_url = ""
            if isinstance(record.get("url"), dict):
                legistar_url = record["url"].get("url", "")
            elif isinstance(record.get("url"), str):
                legistar_url = record["url"]

            # Build a descriptive text summary for embedding
            # This is what the LLM will use as context
            summary_text = (
                f"NYC City Council Meeting\n"
                f"Committee: {committee}\n"
                f"Date: {meeting_date[:10] if meeting_date else 'Unknown'} at {meeting_time}\n"
                f"Location: {location}\n"
                f"Agenda Status: {agenda_status} | Minutes Status: {minutes_status}\n"
                f"Full agenda and minutes available at: {legistar_url}"
            )

            chunks_text = self.embedder.chunk_text(summary_text)
            vectors = self.embedder.generate_embeddings(chunks_text)

            document_chunks = []
            for i, (text, vector) in enumerate(zip(chunks_text, vectors)):
                document_chunks.append({
                    "chunk_index": i,
                    "text_content": text,
                    "embedding": vector,
                })

            processed.append({
                "title": f"{committee} Meeting — {meeting_date[:10] if meeting_date else 'Unknown Date'}",
                "source_url": legistar_url or f"https://data.cityofnewyork.us/resource/m48u-yjt8/{event_id}",
                "source_type": "NYC Council Meeting Record",
                "published_date": meeting_date,
                "metadata_tags": {
                    "event_id": event_id,
                    "committee": committee,
                    "meeting_time": meeting_time,
                    "location": location,
                    "agenda_status": agenda_status,
                    "minutes_status": minutes_status,
                    "jurisdiction": "NYC Council",
                    "legistar_url": legistar_url,
                    **self.classifier.classify(committee, summary_text)
                },
                "chunks": document_chunks,
            })

        return processed


if __name__ == "__main__":
    scraper = NYCCouncilMeetingsScraper()
    scraper.run(output_filename="nyc_council_meetings.json")
