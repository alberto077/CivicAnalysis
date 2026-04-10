# Civic Spiegel

**Civic Spiegel** is a high-signal civic research platform that uses Retrieval-Augmented Generation (RAG) to help residents understand how local legislation, budgets, and transcripts affect them personally.

Instead of reading confusing government documents, users receive simple, personalized policy briefings.

Most residents don’t know:

❖ what policies exist  
❖ what their local representatives are actually voting on
❖ how those decisions affect their neighborhood and daily life  
❖ what the impacts might be

---

## Architecture & Tech Stack
Civic Spiegel guarantees un-biased, fact-checked RAG summaries without compromising user data. 

* **Frontend:** Next.js + TypeScript + Tailwind (Zero-auth: demographic queries stay localized in `localStorage` ensuring absolute privacy).
* **Backend API:** FastAPI (Python) running on Render.
* **Database:** Neon Serverless PostgreSQL with with `pgvector` for instant semantic similarity mapping via 5 normalized SQLModel tables (**`halfvec` (16-bit)** for optimal storage density across years of historical data).
* **Embeddings & LLM:** Llama-3.1-8B (Groq) for lightning-fast inference, processing contexts generated via `fastembed` (BAAI/bge-small-en-v1.5) with an **AI Summarization Layer** that condenses verbose transcripts into fact-rich briefings.
* **Orchestration:** **GitHub Actions** handles the high-RAM data pipeline, while **cron-job.org** handles backend keep-alive pings.

## 🏛️ Comprehensive Jurisdictional Coverage

The platform integrates official data from both the City and State levels:

### New York City (NYC Council)
*   **Legistar Integration:** Scrapes official bills, resolutions, and local laws directly from the [NYC Council Legistar](https://legistar.council.nyc.gov/) API.
*   **Meeting Metadata:** Integrates official committee metadata from the [NYC Open Data Portal](https://opendata.cityofnewyork.us/).
*   **Transcript Engine:** Extracts full-text transcripts from Council hearings to provide semantic context ("The Why") behind policy decisions.

### New York State (NYS Legislature)
*   **Senate Open Legislation:** Scrapes bills and resolutions using the official Senate API.
*   **Transcript Engine:** Extracts full-text transcripts from State floor sessions to provide semantic context ("The Why").

---

## ⚙️ Core System Architecture

Designed for **$0 infrastructure cost** and maximum performance:

### 1. The Data Pipeline (`/pipeline` + Github Actions)
*   **Abstract Scrapers:** Standardized Python interface (`BaseScraper`) for all sources.
*   **ML Tagger:** Hybrid NLP engine (spaCy + Keyword rules) in [tag_classifier.py](/pipeline/tag_classifier.py) that identifies policy areas and affected demographics.
*   **Embedding Engine:** Local FastEmbed (`BAAI/bge-small-en-v1.5`) running on CPU using ONNX for high-speed, cost-free vectorization.
*   **High-RAM Environment:** The pipeline (FastEmbed + spaCy) runs on GitHub Actions (7GB RAM), bypassing the memory limitations of free-tier hosting.
*   **Automated Updates:** Scrapes, classifies, and embeds new civic data, pushing directly to the Neon DB.

### 2. Backend API (`/backend` + Render)
*   **FastAPI:** Serves the RAG loop and system metadata on Render.
*   **pgvector:** High-performance vector similarity search on Neon Postgres.
*   **RAM-Safety Hardening:** The API includes a safety guard to prevent Render Free Tier crashes, deferring heavy production runs to GitHub Actions.

### 3. Orchestration & Maintenance
*   **Keep-Alive:** A dedicated [cron-job.org](https://cron-job.org) task pings the backend every 10 minutes to prevent Render "cold starts" via [keep_alive.py](/cron/keep_alive.py)

---

## 🚀 Getting Started

### Prerequisites
1.  Python 3.10+
2.  Neon Postgres account (with `pgvector` enabled)
3.  [Groq API Key](https://console.groq.com/)
4.  (Optional) [NYS Senate API Key](https://legislation.nysenate.gov/)
5.  (Optional) [NYC Council Legistar API Key](https://council.nyc.gov/data/legislative-api/)

### Installation & Deployment
```bash
# 1. Clone & Set up environment
cp .env.example .env  # Fill in your keys

# 2. Set up Backend
cd backend
pip install -r requirements.txt
python init_db.py  # Initialize Neon tables

# 3. Populate Historical Data (required for context)
python pipeline/backfill_history.py 
```

#### Automated Pipeline (GitHub Actions)
1. Add `DATABASE_URL`, `GROQ_API_KEY`, and scraper keys to **GitHub Repository Secrets**.
2. Push code to `main` - the workflow in `.github/workflows/pipeline.yml` will activate.

# 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)
