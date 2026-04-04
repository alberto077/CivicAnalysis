from typing import List, Dict, Any
import sys
import os

# Ensure we can import from the parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper
from embedding_engine import EmbeddingEngine

class NYCCouncilRSSScraper(BaseScraper):
    """
    Boilerplate for scraping NYC Council legislation updates via their RSS feed.
    """
    
    def __init__(self, feed_url: str = "https://legistar.council.nyc.gov/rss.ashx"):
        self.feed_url = feed_url
        self.embedder = EmbeddingEngine()
        
    def scrape(self) -> List[Dict[str, Any]]:
        print(f"Executing live scrape from {self.feed_url}...")
        try:
            import requests
            from bs4 import BeautifulSoup
            
            response = requests.get(self.feed_url)
            response.raise_for_status()
            
            # The NYC feed is XML RSS format
            soup = BeautifulSoup(response.content, features="xml")
            items = soup.find_all("item")
            
            scraped_data = []
            for item in items:
                # Basic parsing, with fallbacks in case tags are missing
                title = item.title.text if item.title else "No Title"
                link = item.link.text if item.link else self.feed_url
                description = item.description.text if item.description else "No Content"
                
                # Try to parse the published date (optional)
                pub_date = item.pubDate.text if item.pubDate else None
                
                scraped_data.append({
                    "title": title,
                    "link": link,
                    "description": description,
                    "pub_date": pub_date
                })
                
            return scraped_data

        except Exception as e:
            print(f"Error scraping NYC Council RSS: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        print("Simulating processing data...")
        processed = []
        for item in raw_data:
            # Chunk the text
            chunks = self.embedder.chunk_text(item["description"])
            
            # Generate the vector arrays
            vectors = self.embedder.generate_embeddings(chunks)
            
            document_chunks = []
            for i, (text, vector) in enumerate(zip(chunks, vectors)):
                document_chunks.append({
                    "chunk_index": i,
                    "text_content": text,
                    "embedding": vector # List of 384 floats
                })
                
            processed.append({
                "title": item["title"],
                "source_url": item["link"],
                "chunks": document_chunks
            })
            
        return processed

if __name__ == "__main__":
    scraper = NYCCouncilRSSScraper()
    scraper.run(output_filename="nyc_council_rss_test.json")
