# Civic Spiegel: Architecture & Technology Decisions

This document serves as the master decision log for the Civic Spiegel project. It outlines the alternatives considered for every major component of the application, the final decisions made, and how these choices respect the bounds of our MVP and project constraints (strict zero-dollar budget, high development velocity, and the nuanced political domain of NYC/NYS governance).

This documentation is designed to be easily referenced for academic project defenses, demonstrations, and onboarding new team members.

---

## 1. Authentication & User Data Privacy
**Decision:** Absolute Zero-Auth (`localStorage` + URL Parameters)
* **Alternatives Considered:** JWT Auth, NextAuth, Firebase Auth, storing user demographics in the Postgres database.
* **How We Decided:** 
  * **Privacy first:** By storing all sensitive demographic data (age, income, race, housing status) exclusively in the user's browser `localStorage`, we completely eliminate PII (Personally Identifiable Information) risk. We never see it, never store it, never touch it.
  * **Frictionless Onboarding:** Users do not need to create an account to start getting value from the app.
  * **Development Velocity:** Removing an auth backend saves significant implementation time and massively simplifies frontend state management.
  * **Shareability:** URL parameter-based filters allow users to share specific dashboards (e.g., "see housing bills affecting renters in Brooklyn") without requiring login sessions.
* **Tradeoff:** Users cannot sync preferences across devices. This is acceptable for the MVP scope.

---

## 2. Frontend Framework & Styling
**Decision:** Next.js + TypeScript + TailwindCSS
* **Alternatives Considered:** Plain React (Create React App), Vue, Svelte.
* **How We Decided:** 
  * Next.js provides App Router and server-side rendering out-of-the-box, ensuring high performance and SEO.
  * TypeScript provides rigid typing for our complex Civic API schemas (e.g., legislation event structures), reducing runtime bugs.
  * TailwindCSS allows for beautifully styled, modern components with minimal CSS bloat and no context-switching for the frontend team.

---

## 3. Backend API Framework
**Decision:** Python + FastAPI (separated from the frontend)
* **Alternatives Considered:** Next.js API Routes (Serverless Functions), Express.js (Node).
* **How We Decided:** 
  * Next.js API Routes are great, but maintaining a heavy NLP, Web Scraping, and ML pipeline in TypeScript serverless functions is an uphill battle. 
  * Python owns the ecosystem for Data Science and Scraping (`BeautifulSoup`, `spaCy`, `fastembed`). Using FastAPI allows the backend to natively process Python-based schemas (via `SQLModel`), run ML scripts natively, and provide lightning-fast async networking.
  * **Separation of Concerns:** The ML/Data team lives entirely in Python; the Frontend team lives entirely in TS/React. No cross-contamination.

---

## 4. Vector Database & Main Storage
**Decision:** Neon Serverless Postgres + `pgvector`
* **Alternatives Considered:** Standalone vector databases (ChromaDB, Pinecone, Qdrant); native SQLite.
* **How We Decided:** 
  * **Unified Architecture:** A single database handles BOTH relational tabular data (e.g., Council Member profiles, legislation metadata) and non-relational vector embeddings side-by-side.
  * **Referential Integrity:** We can write real SQL joins (e.g., "give me all `DocumentChunk`s linked to `PolicyDocument`s linked to `LegislationEvent`s voted on by Politician X") - something pure vector DBs cannot do.
  * Neon offers a generous free tier requiring no credit card, perfectly aligning with our $0 budget constraints.
* **Current Status:** **[ACTIVE]** Neon Postgres is the primary storage engine. ALL data (relational metadata and vector embeddings) is persisted via `pgvector` in the cloud instance using standard 32-bit Vectors. (Note: `halfvec` was reverted due to `pgvector` Python client instantiation errors).

---

## 5. Primary Embeddings Engine (Data Pipeline)
**Decision:** `fastembed` (by Qdrant) running locally on CPU
* **Alternatives Considered:** `sentence-transformers` (HuggingFace), Voyage AI API, OpenAI Embeddings API.
* **How We Decided:** 
  * **Cost & Limit Constraints:** We required a 100% free solution to batch-process thousands of NYC Council minutes and news articles. API free tiers (like Voyage AI) restrict to 3 Requests Per Minute without a credit card, which is unworkable for bulk scraping.
  * **Local Overhead Constraint:** `sentence-transformers` requires downloading massive PyTorch libraries (1-2GB+). `fastembed` uses the ONNX runtime to execute quantized models (e.g., `BAAI/bge-small-en-v1.5`) solely on the CPU - fast, low memory, no GPU needed.
  * **384 dimensions** is intentionally small - it matches our `pgvector` column in `DocumentChunk` and keeps index sizes manageable on a free DB tier.
* **Current Status:** Fully activated. `EmbeddingEngine` provides sentence-aware chunking with word overlap and generates 384-dimension vectors via `BAAI/bge-small-en-v1.5`.

---

## 6. Precision Document Retrieval (RAG Reranking)
**Decision:** Voyage AI Reranker API (`voyage-rerank-2`), deployed as a complementary Phase 2 step
* **Alternatives Considered:** Standard `pgvector` cosine similarity only.
* **How We Decided:** 
  * Standard embedding cosine similarity retrieves the top-K *most similar* chunks but can miss nuanced legal or political phrasing that appears in NYC legislative text.
  * Voyage AI's reranker models are specifically trained on civic/legal document types, making them well-suited for NYC Council transcripts and legislation.
  * **The Hybrid Strategy:** FastEmbed retrieves Top 20 chunks via cosine similarity (free, local). Voyage AI reranks those 20 down to the Top 5 (only 1 API call). This gets enterprise-grade legal intelligence at zero effective cost under the free tier.
* **Current Status:** Not yet implemented. Proposed for May 01 milestone.

---

## 7. Intelligent Inference (LLM)
**Decision:** Llama 3.1 8B via Groq API
* **Alternatives Considered:** OpenAI API (paid), local HuggingFace open models (slow, requires massive GPU).
* **How We Decided:** 
  * We cannot run a high-quality LLM locally without requiring users to have powerful GPUs - not a realistic constraint for a civic app targeting everyday NYC residents.
  * Groq's specialized LPU (Language Processing Unit) hardware provides near-instantaneous inference, making the RAG chat UI feel remarkably smooth and premium.
  * The Groq Developer free-tier covers our expected usage volume for the MVP.
  * `llama-3.1-8b-instant` is specifically optimized for fast, concise responses - which matches our "brief civic briefing" use case (not a document writer).
* **Civic-specific prompt design:** The system prompt instructs the model to answer using ONLY retrieved context (RAG) and to explicitly address how a policy affects the user's stated demographics. This prevents hallucination in a domain where accuracy is critical.
* **Current Status:** Running in mock bypass mode - `LLMEngine` checks for `GROQ_API_KEY` at startup and returns a structured placeholder response if not found. Real inference activates automatically once the key is set.

---

## 8. Data Pipeline & Scraper Orchestration
**Decision:** Abstract Python `BaseScraper` class, automated via **GitHub Actions**.
* **Alternatives Considered:** Apache Airflow, Prefect, Celery, `cron-job.org` webhooks.
* **How We Decided:** 
  * **Complexity tradeoffs:** Tools like Airflow require dedicated Docker infrastructure, massive configuration, and high memory usage. That's overhead we cannot justify for an MVP on a $0 budget.
  * NYC Council minutes and civic data update infrequently (weekly hearings, monthly budget updates, not by the millisecond). Scheduled Python scripts are a perfect fit.
  * **Stability First:** We originally considered webhooks on Render, but the 512MB RAM limit caused frequent OOM crashes during scraping.
  * **Unified Orchestration:** By using GitHub Actions (7GB RAM), we run the pipeline in a separate, high-resource environment. 
  * **Clean Security:** We removed the "Trigger Webhook" from the backend entirely. This eliminates the need for `CRON_SECRET` tokens and ensures that the production database can only be updated via official GitHub workflows.
  * **Keep-Alive:** A dedicated `cron/keep_alive.py` script (triggered via `cron-job.org`) ensures the Render free-tier remains active, eliminating cold-start delays.

---

## 9. Data Source Strategy

Given the NYC/NYS civic domain (see `DOMAINS_AND_NUANCES.md`), our scraping priorities are intentionally ordered by data quality and political signal strength:

| Priority | Source | What it provides | Signal strength |
|----------|--------|-----------------|-----------------|
| 🥇 High | NYS Senate Open Legislation API | State-level bills, transcripts, and floor debate | Extremely high — official state record |
| 🥇 High | NYC Council Legistar (API + Scraping) | Full transcripts and meeting minutes | Extremely high — raw testimony |
| 🥇 High | NYC Open Data (Socrata API) | Structured metadata for `LegislationEvent` tables | High — official record |
| 🥈 Medium | NYC Mayor's Office press releases | Executive branch position statements | Medium — curated messaging |
| Low/None | Local news RSS (NYT NYC, Gothamist) | Journalistic context and political impact analysis | Medium — interpreted |

**Current State:** **[COMPLETE]** The pipeline now integrates real NYC Legistar data (including transcripts) and NYS Senate records. No placeholder RSS feeds are used for core legislative data.

---

## 10. The Omnibus Nuance: Why Raw Votes Are Insufficient
**Decision:** Prioritize LLM contextual analysis over naive vote-to-stance mapping.
* **The Problem:** NYC and NYS legislators frequently vote for legislative packages they partially oppose, or against bills they partially support. Omnibus budget bills routinely bundle education funding, policing budgets, environmental programs, and transit cuts into a single vote.
* **Why this matters for the app:** A naive `VoteRecord` scraper would mark a member as "pro-NYPD expansion" simply because they voted for a budget that *included* NYPD expansion alongside school funding they needed. This is factually misleading and a reputational risk.
* **The RAG solution:** By prioritizing transcript and statement scraping, we give the LLM the evidence it needs to explain: *"Although Council Member X voted Yea on the Fiscal Year 2025 budget, their public statements and committee testimony consistently criticized the NYPD budget provisions."*
* **Stretch Feature:** An "Omnibus Breakdown" UI that renders the specific policy sub-components of a package vote, letting users see which parts of a bill their demographics care about — decoupled from the binary floor vote.

---

## 11. Deployment Hosting Strategy
**Decision:** Vercel (Frontend) + Render or Fly.io (Backend)
* **Alternatives Considered:** Single DigitalOcean Droplet, AWS EC2, Heroku.
* **How We Decided:** 
  * **Zero DevOps:** Vercel automatically deploys every Next.js GitHub commit with highly optimized CDN caching. Render/Fly.io offer free Python web-service tiers without requiring us to manage Nginx or SSL certificates.
  * Both support environment variables (`.env`) natively - critical for injecting `GROQ_API_KEY` and `DATABASE_URL` securely.
* **Tradeoff:** Free-tier Render instances "sleep" after 15 minutes of inactivity, causing a ~30-second cold start delay on the first request. Acceptable for an MVP demo; can be mitigated with a cron-job.org ping to keep the service warm.

---

## 12. Decoupled Pipeline Orchestration (Stability Strategy)
**Decision:** Decouple from Backend server; execute via GitHub Actions.
* **Alternatives Considered:** Running synchronously on Render (512MB RAM), upgrading to paid Render tier ($7/mo+), local manually-triggered cron.
* **How We Decided:** 
  * **Resource Constraint:** The Render Free Tier (512MB RAM) is insufficient for the `FastEmbed` and `spaCy` NLP engines required for production-scale scraping. This caused frequent Out-of-Memory (OOM) crashes during concurrent scraping and chat sessions.
  * **Stability First:** GitHub Actions provides a 7GB RAM environment for free. By moving the "Muscle" (Python Pipeline) to GitHub, we ensure the "Heart" (FastAPI Backend) remains active and responsive on Render.
  * **Simplified Security:** We removed the trigger endpoints from `main.py` entirely, resolving the OOM risk by decoupling completely and removing the need for internal security tokens.
* **Current Status:** **[ACTIVE]** Automated pipeline runs on GitHub Actions.

---

## 13. High-Density Civic Storage (Signal Discovery)
**Decision:** Junk Filtering + Batched Embedding (Reverted AI Summarization)
* **Rationale:** We initially explored AI summarization (lossy compression) and strict semantic filtering (`is_high_signal`) to optimize Neon free-tier storage. However, summarizing before embedding breaks RAG retrieval (queries match against LLM rewrites instead of source language), and strict spaCy filtering dropped valid documents silently.
* **The Solution:** 
    * **Filtering:** A fail-open `is_junk_content` filter that only drops empty or explicit placeholder text, retaining original content.
    * **Batching:** `FastEmbed` processes chunks in reliable batches (n=32) to prevent memory spikes on Github Actions.
    * **Raw Context:** Preserving verbatim text ensures precise keyword matching during semantic search.
* **Current Status:** **[ACTIVE]** Integrated into `BaseScraper` and all production scrapers.
