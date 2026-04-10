import json
import os
import sys
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any

# backend imports workaround for db and schema
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))


class BaseScraper(ABC):
    """
    Abstract base class for all data scrapers in the Civic Spiegel pipeline.
    Team members should inherit from this class to build new scrapers.
    """

    @abstractmethod
    def scrape(self) -> List[Dict[str, Any]]:
        """
        Connect to the data source and fetch the raw data.
        Should return a list of raw data dictionaries.
        """
        pass

    @abstractmethod
    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        """
        Process the raw data into formatted dictionaries that match
        the PolicyDocument and its associated DocumentChunks.

        Expected dict shape:
            {
                "title": str,
                "source_url": str,
                "source_type": str,
                "published_date": str | None,   # ISO format
                "metadata_tags": dict,
                "chunks": [
                    {"chunk_index": int, "text_content": str, "embedding": list[float]},
                    ...
                ]
            }
        """
        pass

    # Database persistence (primary)

    def save_to_db(self, data: List[Dict]):
        """
        Insert processed documents and their chunks into Neon/Postgres.
        Skips documents whose source_url already exists (dedup).
        Wraps the entire batch in a single transaction.
        """
        from sqlmodel import Session, select
        from db import engine
        from schema import PolicyDocument, DocumentChunk

        inserted = 0
        skipped = 0
        failed = 0

        with Session(engine) as session:
            for i, item in enumerate(data):
                # Dedup on source_url
                existing = session.exec(
                    select(PolicyDocument)
                    .where(PolicyDocument.source_url == item["source_url"])
                ).first()

                if existing:
                    skipped += 1
                    continue

                try:
                    # Savepoint for failed items
                    with session.begin_nested():

                        # Parse published_date string to datetime if present
                        pub_date = None
                        if item.get("published_date"):
                            try:
                                pub_date = datetime.fromisoformat(
                                    item["published_date"].replace("Z", "+00:00")
                                )
                            except (ValueError, AttributeError):
                                pub_date = None

                        doc = PolicyDocument(
                            title=item["title"],
                            source_url=item["source_url"],
                            source_type=item["source_type"],
                            published_date=pub_date,
                            metadata_tags=item.get("metadata_tags", {}),
                        )
                        session.add(doc)
                        session.flush()  # assigns doc.id before we reference it

                        for chunk_data in item.get("chunks", []):
                            chunk = DocumentChunk(
                                document_id=doc.id,
                                text_content=chunk_data["text_content"],
                                chunk_index=chunk_data["chunk_index"],
                                embedding=chunk_data.get("embedding"),
                            )
                            session.add(chunk)

                    inserted += 1

                except Exception as e:
                    failed += 1
                    src = item.get("source_url", "unknown")
                    print(f"  ✗ Item {i} failed ({src}): {e}")

            session.commit()

        print(f"DB insert complete: {inserted} added, {skipped} duplicates skipped, {failed} failed.")

    # Fallback / debugging

    def save_to_json(self, data: List[Dict], filename: str):
        """
        Save to local JSON file. Kept as a fallback for offline dev
        or teammates without DB credentials.
        """
        output_dir = os.path.join(os.path.dirname(__file__), "output")
        os.makedirs(output_dir, exist_ok=True)

        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, default=str)
        print(f"Saved {len(data)} items to {filepath}")

    # entrypoint 

    def run(self, output_filename: str = "mock_db.json", use_json: bool = False):
        """
        Standard execution flow.
        Defaults to writing to Neon DB. Pass use_json=True for local fallback.
        """
        print(f"Starting {self.__class__.__name__}")
        raw_data = self.scrape()
        print(f"Scraped {len(raw_data)} items.")

        parsed_items = self.process(raw_data)
        print(f"Processed into {len(parsed_items)} clean documents.")

        if use_json:
            self.save_to_json(parsed_items, output_filename)
        else:
            self.save_to_db(parsed_items)

        return parsed_items