import sys
import os

_PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))   # pipeline/
_PROJECT_ROOT = os.path.dirname(_PIPELINE_DIR)               # project root
_BACKEND_DIR  = os.path.join(_PROJECT_ROOT, "backend")       # backend/

for _p in (_BACKEND_DIR, _PROJECT_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from scrapers.nyc_council_meetings import NYCCouncilMeetingsScraper
from scrapers.nyc_council_legistar import NYCCouncilLegistarScraper
from scrapers.nys_senate_bills import NYSSenateBillsScraper
from scrapers.nys_senate_transcripts import NYSSenateTranscriptsScraper
from scrapers.populate_votes import populate_votes


def run_full_pipeline(use_json: bool = False):
    """
    Unified runner for all civic scrapers.
    Each scraper writes directly to Neon DB via BaseScraper.save_to_db().
    Pass --json flag for local JSON fallback.
    """
    # If not explicitly set, check command line arguments
    if not use_json:
        use_json = "--json" in sys.argv

    scrapers = [

        NYCCouncilMeetingsScraper(),
        NYCCouncilLegistarScraper(),
        NYSSenateBillsScraper(),
        NYSSenateTranscriptsScraper(),
    ]

    total = 0

    print("Starting Civic Spiegel Unified Pipeline")
    print(f"Mode: {'JSON (local)' if use_json else 'Neon DB'}\n")

    for scraper in scrapers:
        try:
            items = scraper.run(
                output_filename=f"docs_{scraper.__class__.__name__}.json",
                use_json=use_json,
            )
            total += len(items)
        except Exception as e:
            print(f"Error running {scraper.__class__.__name__}: {e}")

    print("\nRunning vote scraper (Legistar)")
    try:
        populate_votes(limit=200)
    except Exception as e:
        print(f"Error running populate_votes: {e}")

    print(f"\nPipeline Complete!")
    print(f"Total documents processed: {total}")


if __name__ == "__main__":
    run_full_pipeline()