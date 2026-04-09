import requests
import time
import os
from dotenv import load_dotenv

load_dotenv()

# The production URL of your Render backend
BACKEND_URL = os.getenv("BACKEND_PROD_URL", "http://localhost:8000")

def keep_alive():
    """
    Pings the health endpoint to prevent Render free-tier from sleeping.
    """
    endpoint = f"{BACKEND_URL}/api/health"
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Pinging {endpoint}...")
    try:
        response = requests.get(endpoint, timeout=10)
        if response.status_code == 200:
            print("  ✓ Success")
        else:
            print(f"  ✗ Failed: Status {response.status_code}")
    except Exception as e:
        print(f"  ✗ Error: {e}")

if __name__ == "__main__":
    keep_alive()
