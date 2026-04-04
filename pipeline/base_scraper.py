import json
import os
from abc import ABC, abstractmethod
from typing import List, Dict, Any

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
        """
        pass

    def save_to_json(self, data: List[Dict], filename: str):
        """
        Temporary storage mechanism for MVP until Neon DB is connected.
        Saves output to pipeline/output/
        """
        output_dir = os.path.join(os.path.dirname(__file__), "output")
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        print(f"Saved {len(data)} items to {filepath}")

    def run(self, output_filename: str = "mock_db.json"):
        """
        Standard execution flow.
        """
        print(f"Starting {self.__class__.__name__}...")
        raw_data = self.scrape()
        print(f"Scraped {len(raw_data)} items.")
        
        parsed_items = self.process(raw_data)
        print(f"Processed into {len(parsed_items)} clean documents.")
        
        # Save locally until DB is ready
        self.save_to_json(parsed_items, output_filename)
        return parsed_items
