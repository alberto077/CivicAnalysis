import os
import json
from scrapers.gothamist_rss import GothamistRSSScraper
from scrapers.nyc_council_meetings import NYCCouncilMeetingsScraper
from scrapers.nyc_council_rss import NYCCouncilRSSScraper

def run_full_pipeline():
    """
    Unified runner for all civic scrapers.
    Collects results and saves to a unified mock_db.json for the backend.
    """
    scrapers = [
        # GothamistRSSScraper(), # Skip Gothamist for now as per user request to avoid 403s
        NYCCouncilMeetingsScraper(),
        NYCCouncilRSSScraper()
    ]
    
    all_documents = []
    
    print("=== Starting Civic Spiegel Unified Pipeline ===")
    
    for scraper in scrapers:
        try:
            # Note: BaseScraper.run() returns the processed parsed_items
            # and already saves individual JSONs to pipeline/output/
            items = scraper.run(output_filename=f"docs_{scraper.__class__.__name__}.json")
            all_documents.extend(items)
        except Exception as e:
            print(f"Error running scraper {scraper.__class__.__name__}: {e}")
            
    # Save the consolidated mock database
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)
    
    db_path = os.path.join(output_dir, "mock_db.json")
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(all_documents, f, indent=4, default=str)
        
    print(f"\n=== Pipeline Complete! ===")
    print(f"Total Documents: {len(all_documents)}")
    print(f"Unified DB saved to: {db_path}")

if __name__ == "__main__":
    run_full_pipeline()
