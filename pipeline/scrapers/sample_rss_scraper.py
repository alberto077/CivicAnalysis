import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from base_scraper import BaseScraper
from typing import List, Dict, Any
from datetime import datetime

class SampleRSSScraper(BaseScraper):
    def scrape(self) -> List[Dict[str, Any]]:
        # Mock fetching data from an RSS feed
        return [
            {
                "title": "NYC Council passes new housing bill",
                "link": "https://example.com/housing-bill",
                "pubDate": "2024-04-03",
                "content": "The NYC council today voted to approve a new zoning ordinance, which will dramatically affect housing rates and renter protections."
            }
        ]
        
    def process(self, raw_data: List[Dict[str, Any]]) -> List[Dict]:
        results = []
        for item in raw_data:
            # Map the raw data to our schema structure
            doc = {
                "document": {
                    "title": item["title"],
                    "source_url": item["link"],
                    "source_type": "News RSS",
                    "published_date": datetime.strptime(item["pubDate"], "%Y-%m-%d"),
                    "metadata_tags": {"topic": "housing", "demographics": ["renters"]}
                },
                "chunks": [
                    {
                        "chunk_index": 0,
                        "text_content": item["content"]
                    }
                ]
            }
            results.append(doc)
        return results

if __name__ == "__main__":
    scraper = SampleRSSScraper()
    data = scraper.run()
    import json
    print("\nSample Output Format:")
    print(json.dumps(data, indent=2, default=str))
