import sys
from scrapers.gothamist_rss import GothamistRSSScraper
from scrapers.nyc_council_meetings import NYCCouncilMeetingsScraper
from scrapers.nyc_council_legistar import NYCCouncilLegistarScraper
from scrapers.nys_senate_bills import NYSSenateBillsScraper
from scrapers.nys_senate_transcripts import NYSSenateTranscriptsScraper


def run_full_pipeline():
    """
    Unified runner for all civic scrapers.
    Each scraper writes directly to Neon DB via BaseScraper.save_to_db().
    Pass --json flag for local JSON fallback.
    """
    use_json = "--json" in sys.argv

    scrapers = [
        # GothamistRSSScraper(),  # Skip Gothamist for now as per user request to avoid 403s
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

    print(f"\nPipeline Complete!")
    print(f"Total documents processed: {total}")


if __name__ == "__main__":
    run_full_pipeline()