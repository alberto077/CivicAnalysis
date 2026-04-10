# Civic Spiegel: Full Team Onboarding

*Briefing on the technical decisions, architecture, and current progress of the MVP*

## 1. Core Decisions & Stack
- **Budget:** $0 - every tool on free tier or fully local

- **Frontend:** Next.js + TypeScript + Tailwind. 
- **Zero-Auth** - demographic user data stays in the browser's `localStorage` only.
- **Backend API:** Python + FastAPI, bridging the pipeline to the frontend via REST. Deployed on Render (Active).
- **Database:** Neon Serverless Postgres + `pgvector`. The schema is defined in `backend/schema.py` using SQLModel. (Provisioned & Live).
- **Data & Pipeline:** Automated Python scrapers running on **GitHub Actions** (7GB RAM Muskcle).
- **Embeddings:** FastEmbed (`BAAI/bge-small-en-v1.5`) via ONNX on Github Actions. (Finalized).
- **AI Summarization Layer:** Groq API (**Llama 3.1 8B**) used as a high-density pre-processor to condense verbose records.
- **LLM:** Groq API (`llama-3.1-8b-instant`) for fast, free inference. (Active).

## 2. Current Development Environment

*You do not need to wait for the Neon Postgres database to start writing ML or scraping logic.*

We have created a robust pipeline in `pipeline/`.
*   All scrapers inherit from `pipeline/base_scraper.py`.
*   Scrapers push results directly to the live Neon Postgres database.
*   The FastAPI backend performs `pgvector` similarity search to retrieve the most relevant context for the RAG loop.
*   Local testing: You can still run scrapers with the `--json` flag to verify data without hitting the cloud database.

## 3. Running the Backend Server
```bash
cd backend
# Activate your virtual environment, then:
uvicorn main:app --reload
```
- API available at: `http://127.0.0.1:8000`
- Interactive docs (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `GET http://127.0.0.1:8000/api/health`
- Chat endpoint: `POST http://127.0.0.1:8000/api/chat`

**Example request body for `/api/chat`:**
```json
{
  "query": "How does this housing bill affect renters?",
  "demographics": {
    "housing_status": "Renter",
    "borough": "Brooklyn",
    "income": "Under $25K"
  }
}
```

## 4. Running the Data Pipeline
```bash
cd pipeline
pip install -r requirements.txt
# Run all scrapers in sequence (default to Neon DB, or use --json):
python run_pipeline.py --json

# Run individual NYS/NYC scrapers:
python -m scrapers.nyc_council_meetings --json
python -m scrapers.nyc_council_legistar --json
python -m scrapers.nys_senate_bills --json
python -m scrapers.nys_senate_transcripts --json

# Run a full multi-year historical backfill (2021-2026):
python backfill_history.py --json
```
Output JSON files are saved to `pipeline/output/`.

## 5. Environment Variables (`.env` in `/backend`)
Create a `.env` file in the `backend/` folder before deploying or using real APIs:
```
DATABASE_URL=<your Neon postgres connection string>
GROQ_API_KEY=<your Groq API key>
NYS_SENATE_API_KEY=<your NYS Senate API key>
NYC_COUNCIL_API_KEY=<your NYC Council Legistar API key>
BACKEND_PROD_URL=<your Render backend URL>
```
Without these, the backend runs in full mock mode — which is fine for local development.

## 6. Key Files Reference
| File | Purpose |
|------|---------|
| `backend/schema.py` | 5-table SQLModel schema (Postgres-ready) |
| `backend/main.py` | FastAPI server — CORS, `/api/chat`, `/api/health` |
| `backend/llm_engine.py` | Groq LLM wrapper with mock bypass |
| `pipeline/base_scraper.py` | Abstract base class all scrapers must inherit |
| `pipeline/embedding_engine.py` | Text chunker + FastEmbed stub (real model commented out) |
| `pipeline/scrapers/nys_senate_bills.py` | Official NYS legislative records scraper |
| `pipeline/scrapers/nys_senate_transcripts.py` | High-signal NYS transcript scraper |
| `cron/` | Keep-alive heartbeat script |
| `docs/DATA_SYSTEM_INTEGRATION.md` | Comprehensive system architecture & FE guide |
| `docs/PLANNING.md` | Master project plan and benchmarks |
| `docs/ARCHITECTURE_DECISIONS.md` | Logic behind technology choices |
| `docs/DOMAINS_AND_NUANCES.md` | NYC/NYS political context |

## 7. What Needs to Happen Next

**Current State:**
- [x] Core Data Pipeline & ML Tagger (NYS + NYC ready)
- [x] Scraper Orchestration via GitHub Actions
- [x] Backend RAG endpoints (Decoupled from Pipeline)

**What Needs to Happen Next:**
- [ ] Frontend Team: Connect Chat UI to `POST /api/chat`
- [ ] Frontend Team: Build Dashboard filters using `metadata_tags` schema (see `DATA_SYSTEM_INTEGRATION.md`)
- [x] DevOps: Set up GitHub Action (run_pipeline.yml) and Secrets.
- [x] DevOps: Set up [cron-job.org](https://cron-job.org) for backend Keep-Alive.
