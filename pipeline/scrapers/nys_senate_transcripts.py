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

    def scrape(self) -> List[Dict[str, Any]]:
        print(f"Fetching NYS Senate transcripts for {SESSION_YEAR}...")
        
        if not NYS_SENATE_API_KEY:
            print("  ✗ NYS_SENATE_API_KEY not found. Skipping NYS Senate Transcripts scraping.")
            return []

        try:
            import requests
            headers = {"User-Agent": "CivicSpiegel/0.1; civic research bot"}
            
            # We fetch both floor sessions and public hearings
            transcript_types = ["floor", "public-hearing"]
            all_transcripts = []

            for t_type in transcript_types:
                url = f"https://legislation.nysenate.gov/api/3/transcripts/{t_type}/{SESSION_YEAR}"
                params = {"key": NYS_SENATE_API_KEY, "limit": 20}
                
                response = requests.get(url, params=params, headers=headers, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    if data and "result" in data and "items" in data["result"]:
                        items = data["result"]["items"]
                        # Tag them by type
                        for item in items:
                            item["_transcript_type"] = t_type
                        all_transcripts.extend(items)
                else:
                    print(f"  ✗ Failed to fetch {t_type} transcripts: {response.status_code}")

            print(f"  Fetched {len(all_transcripts)} transcript records total.")
            return all_transcripts

        except Exception as e:
            print(f"Error fetching NYS Senate transcripts: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        print("Processing NYS Senate transcripts...")
        processed = []

        for trans in raw_data:
            t_type = trans.get("_transcript_type", "unknown")
            date_str = trans.get("transcriptDate", "Unknown Date")
            location = trans.get("location", "NYS Senate Chamber")
            
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
                "transcript_type": t_type,
                "location": location,
                "jurisdiction": "NYS Legislature",
                "published_date": trans.get("transcriptDate"),
                **ml_tags
            }

            processed.append({
                "title": title,
                "source_url": f"https://www.nysenate.gov/transcripts/{t_type}/{SESSION_YEAR}/{date_str}",
                "source_type": "NYS Senate Transcript",
                "published_date": trans.get("transcriptDate"),
                "metadata_tags": metadata,
                "chunks": document_chunks,
            })

        return processed


if __name__ == "__main__":
    scraper = NYSSenateTranscriptsScraper()
    scraper.run(output_filename="nys_senate_transcripts.json", use_json=True)
