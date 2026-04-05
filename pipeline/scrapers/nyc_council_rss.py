from typing import List, Dict, Any
import sys
import os

# Ensure we can import from the parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper
from embedding_engine import EmbeddingEngine
from tag_classifier import TagClassifier

class NYCCouncilRSSScraper(BaseScraper):
    """
    Boilerplate for scraping NYC Council legislation updates via their RSS feed.
    """
    
    def __init__(self, feed_url: str = "https://rss.nytimes.com/services/xml/rss/nyt/NYRegion.xml"):
        self.feed_url = feed_url
        self.embedder = EmbeddingEngine()
        self.classifier = TagClassifier()
        
    def scrape(self) -> List[Dict[str, Any]]:
        print(f"Executing live scrape from {self.feed_url}...")
        try:
            import requests
            from bs4 import BeautifulSoup
            
            # Using a standard browser User-Agent so we don't get 403 Forbidden
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(self.feed_url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, features="xml")
            items = soup.find_all("item")
            
            scraped_data = []
            # Just grab the top 5 recent articles for our test run to avoid massive embedding waits
            for item in items[:5]:
                title = item.title.text if item.title else "No Title"
                link = item.link.text if item.link else self.feed_url
                description = item.description.text if item.description else "No Content"
                pub_date = item.pubDate.text if item.pubDate else None
                
                scraped_data.append({
                    "title": title,
                    "link": link,
                    "description": description,
                    "pub_date": pub_date
                })
                
            return scraped_data

        except Exception as e:
            print(f"Error scraping NY Local News RSS: {e}")
            return []

    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        print("Processing NY Local News RSS...")
        processed = []
        for item in raw_data:
            # Chunk the text
            chunks = self.embedder.chunk_text(item["description"])
            
            # Generate the vector arrays
            vectors = self.embedder.generate_embeddings(chunks)
            
            # Generate advanced classification tags
            ml_tags = self.classifier.classify(item["title"], item["description"])

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
                "source_type": "News RSS",
                "published_date": item.get("pub_date"),
                "metadata_tags": {
                    "outlet": "NYT Regional",
                    "jurisdiction": "NYC/NYS",
                    **ml_tags
                },
                "chunks": document_chunks
            })
            
        return processed

if __name__ == "__main__":
    scraper = NYCCouncilRSSScraper()
    scraper.run(output_filename="nyc_council_rss_test.json")
