"""
NYS Senate Transcripts Scraper
------------------------------
Fetches transcripts from NYS Senate floor sessions and public hearings.
These transcripts provide the critical context ("the why") behind legislative
decisions, helping the RAG pipeline explain politician stances beyond binary votes.

Source: https://legislation.nysenate.gov/api/3/transcripts/{type}/{year}
Type:   Official Government Record (Transcript)
Signal: Extremely High — raw testimony and debate text
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

class NYSSenateTranscriptsScraper(BaseScraper):
    """
    Scrapes official NYS Senate and Public Hearing transcripts.
    This is the highest-value data source for semantic search.
    """

    def __init__(self):
        self.embedder = EmbeddingEngine()
        self.classifier = TagClassifier()

    def scrape(self, year: int = SESSION_YEAR) -> List[Dict[str, Any]]:
        print(f"Fetching NYS Senate transcripts for {year}...")
        
        if not NYS_SENATE_API_KEY:
            print("  ✗ NYS_SENATE_API_KEY not found. Skipping NYS Senate Transcripts scraping.")
            return []

        try:
            import requests
            headers = {"User-Agent": "CivicSpiegel/0.1; civic research bot"}
            
            headers = {"User-Agent": "CivicSpiegel/0.1; civic research bot"}
            url = f"https://legislation.nysenate.gov/api/3/transcripts/{year}"
            params = {"key": NYS_SENATE_API_KEY, "limit": 40}
            
            response = requests.get(url, params=params, headers=headers, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if data and "result" in data and "items" in data["result"]:
                    items = data["result"]["items"]
                    print(f"  Fetched {len(items)} transcript records total.")
                    return items
            else:
                print(f"  ✗ Failed to fetch transcripts: {response.status_code} - {response.text}")
                return []

            return []

        except Exception as e:
            print(f"Error fetching NYS Senate transcripts: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]], year: int = SESSION_YEAR) -> List[Dict]:
        print(f"Processing NYS Senate transcripts for {year}...")
        processed = []

        for trans in raw_data:
            session_type = trans.get("sessionType", "session")
            date_str = trans.get("dateTime", "Unknown Date")
            t_type = session_type

            # Transcripts in this API usually have multiple segments or a full text
            # We'll take the 'plainText' if available or concatenate segments
            content = trans.get("plainText", "")
            if not content and "sections" in trans:
                content = "\n\n".join([s.get("text", "") for s in trans["sections"]])
            
            if not content:
                content = f"Transcript for {t_type} session on {date_str}. Full text pending official publication."

            title = f"NYS Senate {t_type.capitalize()} Transcript — {date_str}"
            
            chunks_text = self.embedder.chunk_text(content)
            vectors = self.embedder.generate_embeddings(chunks_text)

            document_chunks = []
            for i, (text, vector) in enumerate(zip(chunks_text, vectors)):
                document_chunks.append({
                    "chunk_index": i,
                    "text_content": text,
                    "embedding": vector,
                })

            # Classification
            ml_tags = self.classifier.classify(title, content)
            
            metadata = {
                "transcript_date": date_str,
                "session_year": year,
                "transcript_type": session_type,
                "location": "NYS Senate Chamber",
                "jurisdiction": "NYS Legislature",
                "published_date": date_str,
                **ml_tags
            }

            processed.append({
                "title": title,
                "source_url": f"https://www.nysenate.gov/transcripts/{year}/{date_str}/{session_type}",
                "source_type": "NYS Senate Transcript",
                "published_date": date_str,
                "metadata_tags": metadata,
                "chunks": document_chunks,
            })

        return processed

    def run(self, output_filename: str = "nys_senate_transcripts.json", use_json: bool = False, year: int = SESSION_YEAR):
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
    scraper = NYSSenateTranscriptsScraper()
    scraper.run(output_filename="nys_senate_transcripts.json", use_json=True)
