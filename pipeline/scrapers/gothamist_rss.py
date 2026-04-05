"""
Gothamist RSS Scraper
--------------------
Scrapes local NYC political news from Gothamist's RSS feed.
Gothamist is a primary NYC civic journalism outlet covering City Hall,
Albany, housing, transit, policing, and community issues.

Source: https://gothamist.com/feed
Type:   News RSS (local civic journalism)
Signal: Medium-High — journalistic context and political impact analysis
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper
from embedding_engine import EmbeddingEngine
from tag_classifier import TagClassifier
from typing import List, Dict, Any
from html.parser import HTMLParser


class _HTMLStripper(HTMLParser):
    """Minimal HTML tag stripper for RSS description fields."""
    def __init__(self):
        super().__init__()
        self._text = []

    def handle_data(self, data):
        self._text.append(data)

    def get_text(self):
        return " ".join(self._text).strip()


def _strip_html(html: str) -> str:
    s = _HTMLStripper()
    s.feed(html)
    return s.get_text()


# Simple civic keyword filter — skip articles that are clearly not policy-related.
_CIVIC_KEYWORDS = [
    "council", "bill", "law", "budget", "mayor", "housing", "rent", "zoning",
    "police", "nypd", "transit", "mta", "subway", "immigration", "education",
    "school", "albany", "legislature", "senate", "assembly", "election",
    "vote", "policy", "ordinance", "hearing", "legislation", "tenant",
    "landlord", "eviction", "affordable", "contract", "sanitation", "health",
    "hospital", "pension", "tax", "funding", "program", "agency", "city hall",
    "borough", "district", "community", "nonprofit", "infrastructure"
]


def _is_civic_relevant(title: str, description: str) -> bool:
    """Returns True if the article appears to be civic/policy-related."""
    combined = (title + " " + description).lower()
    return any(kw in combined for kw in _CIVIC_KEYWORDS)


class GothamistRSSScraper(BaseScraper):
    """
    Scrapes the Gothamist RSS feed for NYC civic and political news.
    Applies a keyword filter to skip non-policy articles (sports, entertainment, etc).
    """

    FEED_URL = "https://gothamist.com/feed"
    MAX_ITEMS = 20  # Fetch more; filter will reduce to civic-relevant ones

    def __init__(self):
        self.embedder = EmbeddingEngine()
        self.classifier = TagClassifier()

    def scrape(self) -> List[Dict[str, Any]]:
        print(f"Scraping Gothamist RSS from {self.FEED_URL}...")
        try:
            import requests
            from bs4 import BeautifulSoup

            headers = {"User-Agent": "Mozilla/5.0 (CivicSpiegel/0.1; civic research bot)"}
            response = requests.get(self.FEED_URL, headers=headers, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, features="xml")
            items = soup.find_all("item")

            scraped = []
            for item in items[:self.MAX_ITEMS]:
                title = item.title.text.strip() if item.title else ""
                link = item.link.text.strip() if item.link else self.FEED_URL
                raw_desc = item.description.text if item.description else ""
                description = _strip_html(raw_desc)
                pub_date = item.pubDate.text.strip() if item.pubDate else None
                category = item.category.text.strip() if item.category else "News"
                author = item.find("dc:creator")
                author = author.text.strip() if author else "Gothamist"

                if not _is_civic_relevant(title, description):
                    continue

                scraped.append({
                    "title": title,
                    "link": link,
                    "description": description,
                    "pub_date": pub_date,
                    "category": category,
                    "author": author,
                })

            print(f"  {len(scraped)} civic-relevant articles found (from {len(items[:self.MAX_ITEMS])} total).")
            return scraped

        except Exception as e:
            print(f"Error scraping Gothamist RSS: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        print("Processing Gothamist articles...")
        processed = []
        for item in raw_data:
            full_text = f"{item['title']}\n\n{item['description']}"
            chunks_text = self.embedder.chunk_text(full_text)
            vectors = self.embedder.generate_embeddings(chunks_text)
            
            # Generate advanced classification tags
            ml_tags = self.classifier.classify(item["title"], item["description"])

            document_chunks = []
            for i, (text, vector) in enumerate(zip(chunks_text, vectors)):
                document_chunks.append({
                    "chunk_index": i,
                    "text_content": text,
                    "embedding": vector,
                })

            # Merge manual tags with ML-derived tags
            metadata = {
                "outlet": "Gothamist",
                "category": item.get("category", "News"),
                "author": item.get("author"),
                "jurisdiction": "NYC/NYS",
            }
            metadata.update(ml_tags)

            processed.append({
                "title": item["title"],
                "source_url": item["link"],
                "source_type": "News RSS",
                "published_date": item.get("pub_date"),
                "metadata_tags": metadata,
                "chunks": document_chunks,
            })

        return processed


if __name__ == "__main__":
    scraper = GothamistRSSScraper()
    scraper.run(output_filename="gothamist_news.json")
