"""
NYS Senate Bills Scraper
------------------------
Fetches recent New York State Senate and Assembly bills from the
official NYS Senate Open Legislation API.

Source: https://legislation.nysenate.gov/api/3/bills/{year}
Type:   Official Government Record
Signal: High — primary legislative source for policy impact analysis
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
NYS_SENATE_API_KEY = os.getenv("NYS_SENATE_API_KEY")
SESSION_YEAR = datetime.now().year

class NYSSenateBillsScraper(BaseScraper):
    """
    Scrapes official NYS legislative records (bills and resolutions).
    Leverages the Open Legislation API for high-fidelity data.
    """

    def __init__(self):
        self.embedder = EmbeddingEngine()
        self.classifier = TagClassifier()

    def scrape(self, year: int = SESSION_YEAR) -> List[Dict[str, Any]]:
        print(f"Fetching NYS Senate bills for {year}...")
        
        if not NYS_SENATE_API_KEY:
            print("  ✗ NYS_SENATE_API_KEY not found. Skipping NYS Senate Bills scraping.")
            return []

        try:
            import requests
            url = f"https://legislation.nysenate.gov/api/3/bills/{year}"
            params = {
                "key": NYS_SENATE_API_KEY,
                "limit": 50,
                "sort": "publishedDateTime:DESC",
                "offset": 0
            }
            
            headers = {"User-Agent": "CivicSpiegel/0.1; civic research bot"}
            response = requests.get(url, params=params, headers=headers, timeout=15)
            if response.status_code != 200:
                print(f"  ✗ Failed to fetch NYS Senate bills: {response.status_code} - {response.text}")
                return []
            response.raise_for_status()
            
            data = response.json()
            if data and "result" in data and "items" in data["result"]:
                items = data["result"]["items"]
                print(f"  Fetched {len(items)} bill records.")
                return items
            return []

        except Exception as e:
            print(f"Error fetching NYS Senate bills: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]], year: int = SESSION_YEAR) -> List[Dict]:
        print(f"Processing NYS Senate bill records for {year}...")
        processed = []

        for bill in raw_data:
            print(bill)
            # The NYS Senate API returns items which might be bills or resolutions
            bill_id = bill.get("printNo", "unknown")
            title = bill.get("title", f"NYS Bill {bill_id}")
            summary = bill.get("summary", "")
            if not summary:
                # Fallback to memo if summary is missing
                summary = bill.get("memo", "No summary available.")
            
            # Combine title and summary for the LLM context
            full_content = (
                f"NYS Legislative Bill: {bill_id}\n"
                f"Title: {title}\n"
                f"Status: {bill.get('status', {}).get('statusDesc', 'Unknown')}\n"
                f"Sponsor: {bill.get('sponsor', {}).get('member', {}).get('fullName', 'Unknown')}\n\n"
                f"Summary: {summary}\n"
            )

            # Date parsing
            pub_date = bill.get("publishedDateTime") or bill.get("approvalDate")
            
            # High-Density AI Summarization
            summarized_content = self.embedder.summarize(full_content)
            
            chunks_text = self.embedder.chunk_text(summarized_content)
            vectors = self.embedder.generate_embeddings(chunks_text)

            document_chunks = []
            for i, (text, vector) in enumerate(zip(chunks_text, vectors)):
                document_chunks.append({
                    "chunk_index": i,
                    "text_content": text,
                    "embedding": vector,
                })

            # Advanced classification
            ml_tags = self.classifier.classify(title, summary)
            
            metadata = {
                "bill_id": bill_id,
                "session_year": year,
                "jurisdiction": "NYS Legislature",
                "sponsor": bill.get("sponsor", {}).get("member", {}).get("fullName"),
                "status": bill.get("status", {}).get("statusDesc"),
                "chamber": bill.get("billType", {}).get("chamber"),
                **ml_tags
            }

            processed.append({
                "title": f"NYS Bill {bill_id}: {title}",
                "source_url": f"https://www.nysenate.gov/legislation/bills/{year}/{bill_id}",
                "source_type": "NYS Legislation",
                "published_date": pub_date,
                "metadata_tags": metadata,
                "chunks": document_chunks,
            })

        return processed

    def run(self, output_filename: str = "nys_senate_bills.json", use_json: bool = False, year: int = SESSION_YEAR):
        print(f"Starting {self.__class__.__name__} for Year: {year}")
        raw_data = self.scrape(year=year)
        print(f"Scraped {len(raw_data)} items.")

        parsed_items = self.process(raw_data, year=year)
        print(f"Processed into {len(parsed_items)} clean documents.")

        if use_json:
            self.save_to_json(parsed_items, output_filename)
        else:
            self.save_to_db(parsed_items)

        return parsed_items


if __name__ == "__main__":
    scraper = NYSSenateBillsScraper()
    scraper.run(output_filename="nys_senate_bills.json", use_json=True)
