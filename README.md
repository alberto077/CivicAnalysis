# Civic Spiegel

RAG-powered analytical platform designed to demystify NYC local government by providing personalized, location-aware policy briefings.

Instead of reading confusing government documents, users receive simple, personalized policy briefings.

Most residents don’t know:

❖ what policies exist  
❖ what their local representatives are actually voting on
❖ how it affects their neighborhood and daily life  
❖ what the impacts might be

## Architecture & Tech Stack
Civic Spiegel guarantees un-biased, fact-checked RAG summaries without compromising user data. 

* **Frontend:** Next.js + TypeScript + Tailwind (Zero-auth: demographic queries stay localized in `localStorage` ensuring absolute privacy).
* **Backend API:** FastAPI (Python) running on Render.
* **Database:** Neon Serverless PostgreSQL with `pgvector` for instant semantic similarity mapping via 5 normalized SQLModel tables.
* **Embeddings & LLM:** Llama-3.1-8B (Groq) for lightning-fast inference, processing contexts generated locally via `fastembed` (BAAI/bge-small-en-v1.5).

## Running Locally

### 1. The Data Pipeline
*Currently utilizing an offline JSON fallback (`mock_db.json`) so ML/Data execution requires no live Neon DB connection.*

```bash
# 1. Install unified dependencies
pip install -r requirements.txt

# 2. Run the unified pipeline (scrapes, classifies, and embeds)
python pipeline/run_pipeline.py
```

### 2. The Frontend
```bash
cd frontend
npm run dev
Open http://localhost:3000
```

