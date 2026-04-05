# Civic Spiegel: Full Team Onboarding

*Briefing on the technical decisions, architecture, and current progress of the MVP*

## 1. Core Decisions & Stack
- **Budget:** $0 - every tool on free tier or fully local

- **Frontend:** Next.js + TypeScript + Tailwind. 
- **Zero-Auth** - demographic user data stays in the browser's `localStorage` only.
- **Backend API:** Python + FastAPI, bridging the pipeline to the frontend via REST. Deployed on Render.
- **Database:** Neon Serverless Postgres + `pgvector`. The schema is defined in `backend/schema.py` using SQLModel. 
    - *Neon account not yet set up - using local JSON mock in the meantime, but will be needed for deployment*
- **Data & Pipeline:** Abstract Python scrapers (`BaseScraper`) that output structured JSON matching the DB schema.
- **Embeddings:** FastEmbed (`BAAI/bge-small-en-v1.5`) running locally on CPU via ONNX. 
    - *Currently mocked with zero-vectors - real model activation requires one code change: uncommenting the import and model loading in `pipeline/embedding_engine.py`*
- **LLM:** Groq API (`llama-3.1-8b-instant`) for fast, free inference. 
    - *Running in mock bypass mode - no Groq key needed to test locally, but will be needed for deployment*

## 2. Current Development Environment

*You do not need to wait for the Neon Postgres database to start writing ML or scraping logic.*

We have created an **offline mock-database pipeline** in `pipeline/`.
*   All scrapers inherit from `pipeline/base_scraper.py`.
*   Once a scraper extracts data and passes it through `embedding_engine.py`, the `run()` function dumps a structured JSON file to `pipeline/output/`.
*   The FastAPI backend reads this JSON directly, so the frontend and backend can run and test the full RAG loop without any cloud infrastructure.
*   Once Neon is provisioned, the only change needed is replacing `save_to_json()` with `save_to_postgres()`.

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
# Run the NYC Council RSS scraper (currently hits NYT Regional RSS as placeholder):
python -m scrapers.nyc_council_rss
# Run the sample mock scraper (shows expected output format):
python -m scrapers.sample_rss_scraper
```
Output JSON files are saved to `pipeline/output/`.

## 5. Environment Variables (`.env` in `/backend`)
Create a `.env` file in the `backend/` folder before deploying or using real APIs:
```
DATABASE_URL=<your Neon postgres connection string>
GROQ_API_KEY=<your Groq API key>
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
| `pipeline/scrapers/nyc_council_rss.py` | Live scraper (NYT RSS placeholder) |
| `pipeline/scrapers/sample_rss_scraper.py` | Hardcoded mock data showing correct output schema |
| `pipeline/output/` | Local JSON files used by the backend as mock DB |
| `docs/PLANNING.md` | Master project plan, benchmarks, and timeline |
| `docs/ARCHITECTURE_DECISIONS.md` | Why we chose each tool/approach |
| `docs/DATABASE_ARCHITECTURE.md` | Schema details, ER diagram, and blocker actions |
| `docs/DOMAINS_AND_NUANCES.md` | NYC/NYS political context — important for fair data modeling |

## 7. What Needs to Happen Next (ML/BE Focus)

**Backend blockers (BE team):**
- [ ] Create Neon Postgres account → save `DATABASE_URL` to `.env`
- [ ] Create Groq account → save `GROQ_API_KEY` to `.env`
- [ ] Write and run `init_db.py` to create tables in Neon
- [ ] Replace JSON mock retrieval with `pgvector` cosine similarity in `/api/chat`

**Pipeline next steps (ML team):**
- [ ] Activate real FastEmbed in `embedding_engine.py` (uncomment 3 lines)
- [ ] Replace NYT RSS placeholder with real NYC civic data sources
- [ ] Add `metadata_tags` classification (policy area, affected demographics) to `process()` output
- [ ] Build `save_to_postgres()` in `BaseScraper` once Neon is available
