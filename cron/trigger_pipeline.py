import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

# The production URL of your Render backend
BACKEND_URL = os.getenv("BACKEND_PROD_URL", "http://localhost:8000")

def trigger_pipeline():
    """
    Triggers the daily data scraping pipeline via the FastAPI endpoint.
    """
    endpoint = f"{BACKEND_URL}/api/pipeline/run"
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Triggering full pipeline via {endpoint}...")
    try:
        # We assume a basic level of protection or just internal use
        response = requests.post(endpoint, timeout=300) # Long timeout for full pipeline
        if response.status_code == 200:
            print("  ✓ Pipeline Triggered Successfully")
            print(f"  Response: {response.json()}")
        else:
            print(f"  ✗ Failed: Status {response.status_code}")
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"  ✗ Error: {e}")

if __name__ == "__main__":
    trigger_pipeline()
