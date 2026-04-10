"""
NYC Council Legistar Scraper (Real Data)
----------------------------------------
Fetches official NYC City Council legislation and transcripts from the
Legistar Web API. This replaces the previous NYT RSS placeholder with
high-signal, official government records.

API: https://webapi.legistar.com/v1/nyc/
Key Requirements: 
  - Token required for production (set NYC_COUNCIL_API_KEY in .env)
  - Public read-only access sometimes works for low-volume testing.
"""

import sys
import os
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper
from embedding_engine import EmbeddingEngine
from tag_classifier import TagClassifier

# Configuration
NYC_COUNCIL_API_KEY = os.getenv("NYC_COUNCIL_API_KEY")
LEGISTAR_BASE_URL = "https://webapi.legistar.com/v1/nyc"

class NYCCouncilLegistarScraper(BaseScraper):
    """
    Scrapes NYC Council legislation and full text transcripts from Legistar.
    This provides the 'what' (bill text) and 'why' (hearing transcripts).
    """

    def __init__(self):
        self.embedder = EmbeddingEngine()
        self.classifier = TagClassifier()

    def scrape(self, limit: int = 10) -> List[Dict[str, Any]]:
        print(f"Fetching {limit} NYC Council Legislation records from Legistar API...")
        
        if not NYC_COUNCIL_API_KEY:
            print("  ✗ NYC_COUNCIL_API_KEY not found. Skipping NYC Council scraping.")
            return []

        try:
            import requests
            # 1. Fetch recent Matters (legislation)
            # Use the provided limit for backfill control
            # Auth is handled via the 'token' query parameter
            url = f"{LEGISTAR_BASE_URL}/Matters"
            params = {
                "$top": limit,
                "$orderby": "MatterLastModifiedUtc desc",
                "token": NYC_COUNCIL_API_KEY
            }
            response = requests.get(url, params=params, headers={"User-Agent": "CivicSpiegel/0.1"}, timeout=15)
            
            if response.status_code != 200:
                print(f"  ✗ Failed to fetch matters: {response.status_code} - {response.text}")
                return []

            matters = response.json()
            all_data = []

            for matter in matters:
                matter_id = matter.get("MatterId")
                # 2. Fetch full text for this matter if available
                text_url = f"{LEGISTAR_BASE_URL}/Matters/{matter_id}/MattersTexts"
                text_resp = requests.get(text_url, params={"token": NYC_COUNCIL_API_KEY}, headers={"User-Agent": "CivicSpiegel/0.1"}, timeout=10)
                
                full_text = ""
                if text_resp.status_code == 200:
                    texts = text_resp.json()
                    # MatterTexts returns a list of versions; we take the latest
                    if texts and len(texts) > 0:
                        # Sometimes the text is in 'MatterTextPlain' or 'MatterTextHtml'
                        # We'll try to find any content
                        full_text = texts[-1].get("MatterTextPlain", "")
                
                matter["_full_text"] = full_text
                all_data.append(matter)

            print(f"  Fetched {len(all_data)} legislation records from Legistar.")
            return all_data

        except Exception as e:
            print(f"Error fetching NYC Legistar data: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        print("Processing NYC Council legislation...")
        processed = []

        for item in raw_data:
            matter_id = item.get("MatterId", "unknown")
            file_number = item.get("MatterFile", "Unknown")
            title = item.get("MatterName", "No Title")
            description = item.get("MatterTitle", "")
            content = item.get("_full_text", "") or description
            
            published_date = item.get("MatterLastModifiedDate")
            status = item.get("MatterStatusName", "Unknown Status")
            matter_type = item.get("MatterTypeName", "Legislation")

            # Classification
            ml_tags = self.classifier.classify(title, content)
            
            # High-Density AI Summarization
            summarized_content = self.embedder.summarize(content)
            
            # Embeddings (on summarized content)
            chunks_text = self.embedder.chunk_text(summarized_content)
            vectors = self.embedder.generate_embeddings(chunks_text)

            document_chunks = []
            for i, (text, vector) in enumerate(zip(chunks_text, vectors)):
                document_chunks.append({
                    "chunk_index": i,
                    "text_content": text,
                    "embedding": vector,
                })

            processed.append({
                "title": f"NYC Council {matter_type} ({file_number}): {title}",
                "source_url": f"https://legistar.council.nyc.gov/LegislationDetail.aspx?ID={matter_id}",
                "source_type": "NYC Council Legistar",
                "published_date": published_date,
                "metadata_tags": {
                    "matter_id": matter_id,
                    "file_number": file_number,
                    "status": status,
                    "jurisdiction": "NYC Council",
                    **ml_tags
                },
                "chunks": document_chunks,
            })

        return processed


    def run(self, output_filename: str = "nyc_council_legistar.json", use_json: bool = False, limit: int = 10):
        print(f"Starting {self.__class__.__name__} (Limit: {limit})")
        raw_data = self.scrape(limit=limit)
        print(f"Scraped {len(raw_data)} items.")

        parsed_items = self.process(raw_data)
        print(f"Processed into {len(parsed_items)} clean documents.")

        if use_json:
            self.save_to_json(parsed_items, output_filename)
        else:
            self.save_to_db(parsed_items)

        return parsed_items

if __name__ == "__main__":
    scraper = NYCCouncilLegistarScraper()
    scraper.run(output_filename="nyc_council_legistar.json", use_json=True)
