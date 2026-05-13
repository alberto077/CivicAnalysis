# Civic Spiegel: NY Civic Research Assistant

**Civic Spiegel** is a civic intelligence platform that makes New York City and New York State government data legible and searchable. *Spiegel* is German for *mirror* — the platform holds a clear, undistorted, non-partisan reflection of official government records back to the residents those records affect.

Using Retrieval-Augmented Generation (RAG), residents can ask plain-English questions and receive answers grounded in official legislative transcripts, bill text, and meeting minutes — with citations to the source documents.

---

## The Problem

NYC and NYS government produces thousands of pages of public records every month — hearing transcripts, bill text, committee minutes, budget documents — spread across more than a dozen separate portals, each with different formats and search interfaces. The information is technically public but practically inaccessible to most residents.

Instead of reading confusing government documents, users receive simple, personalized policy briefings.

Most residents don’t know:

❖ what policies exist

❖ who their local legislative representatives actually are

❖ what the impacts of each bill might be

❖ how those decisions affect their neighborhood and daily life

## The Solution

Civic Spiegel scrapes official sources daily, embeds the text into a vector database using AI, and surfaces the most relevant records when you ask a question. The LLM answers directly from retrieved official documents, with citations — not from training memory.

---

![Home - Briefings Page](/frontend/public/briefings.png)


![Example - Find Your Representatives (District 4)](/frontend/public/find_reps_example.png)

![Example - Explore Maps (Civic Hub Boundary Lines)](/frontend/public/explore_maps_example.png)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Policy Briefings** | Ask anything about NYC/NYS policy. RAG engine retrieves official transcripts, bills, and meeting records. Llama 3.1 8B synthesizes a structured answer with source citations. |
| **Ask Spiegel** | Floating chat widget available on every page. Multi-turn conversation with user profile context. Falls back to GPT-4o-mini when the document index has no matching content. |
| **Representative Directory** | 290+ elected officials across all five government levels — searchable by borough, district, party, committee, subcommittee, and caucus. Updated daily. |
| **Explore Maps** | NYC Council district choropleth with address lookup. NYS statewide ArcGIS embed. Civic Hub map with location pins and six toggleable boundary layers. |
| **Civic Calendar** | Nine official public meeting calendars, hearing schedules, and livestreams in one place. |
| **Accessibility** | Seven display settings (large text, high contrast, reduce motion, underline links, readable font, focus mode, color-blind friendly) plus browser text-to-speech. |

---

## 📐 Architecture & Tech Stack

![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?logo=python&logoColor=white)
![Postgres](https://img.shields.io/badge/Neon_Postgres-000000?logo=postgresql&logoColor=white)
![pgvector](https://img.shields.io/badge/pgvector-4169E1)
![Groq](https://img.shields.io/badge/Groq_Llama_3.1-F55036)
![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o--mini-412991?logo=openai&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-black?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white)


| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS | App Router, hosted on Vercel |
| **Backend** | FastAPI (Python 3.11) | Hosted on Render free tier |
| **Database** | Neon Serverless Postgres + pgvector | 6-table schema, 384-dim embeddings |
| **Embeddings** | BAAI/bge-small-en-v1.5 via FastEmbed | ONNX, CPU-only, 384-dim float32 |
| **Primary LLM** | Llama 3.1 8B via Groq Cloud | RAG-grounded structured briefings |
| **Fallback LLM** | GPT-4o-mini via OpenAI | When retrieval tier is 'none' |
| **Scraping** | Cheerio (TypeScript) + BeautifulSoup (Python) | HTML + API scrapers |
| **NLP** | spaCy en_core_web_sm | Policy area classification + NER |
| **Automation** | GitHub Actions (×2 daily workflows) | 06:00 UTC, zero manual intervention |
| **Geospatial** | react-simple-maps + Leaflet.js | Choropleth + pin maps |

**Total infrastructure cost: $0** — Vercel, Render, Neon, and GitHub Actions all on free tiers.

---

## 🛠️ System Architecture

Data we use is gathered through automated workflows:

```
┌─────────────── GITHUB ACTIONS (daily 06:00 UTC) ────────────────────┐
│                                                                      │
│  run_pipeline.yml (Python)        refresh-politicians.yml (Node)    │
│  ┌──────────────────────────┐     ┌──────────────────────────────┐  │
│  │ Legistar REST API        │     │ council.nyc.gov (HTML)       │  │
│  │ NYS Senate Open Leg. API │     │ nyassembly.gov (HTML)        │  │
│  │ NYC Open Data (Socrata)  │     │ legislation.nysenate.gov API │  │
│  │ NYT Regional RSS         │     │ house.gov (HTML)             │  │
│  │        ↓                 │     │ OpenStates REST + GraphQL    │  │
│  │ Clean → Classify         │     │          ↓                   │  │
│  │ Chunk  → Embed           │     │ Normalize → Merge            │  │
│  │        ↓                 │     │          ↓                   │  │
│  │ Neon Postgres            │     │ politicians.json             │  │
│  │ (DocumentChunk +         │     │ (committed to repo)          │  │
│  │  pgvector embeddings)    │     └──────────────────────────────┘  │
│  └──────────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────────┘
               │                               │
               ▼                               ▼
      FastAPI Backend (Render)        Next.js Frontend (Vercel)
      /api/chat   (RAG)               /api/civic/chat    (proxy)
      /api/politicians                /api/civic/floating-chat
      /api/health                     /api/civic/politicians
      /api/policies                   /api/llm/chat  (direct OpenAI)
      /districts
```

### Key Architecture Decisions

**Single Postgres for relational + vector data** — pgvector extension collapses the relational DB and vector store into one Neon instance. No Pinecone/Chroma needed. Politicians, districts, legislation, votes, documents, and 384-dim embeddings all live in one place with full SQL join support.

**Frontend proxy pattern** — The browser never calls the Python backend directly. It calls Next.js `/api/civic/*` routes which forward to FastAPI. Centralizes error handling, caching, and timeout management.

**Static JSON for politicians** — The representative directory is pre-built into `public/data/politicians.json` by GitHub Actions and committed to the repo. Served as a static asset with a 24-hour CDN cache. No scraping happens at request time.

**Dual LLM** — Groq (Llama 3.1 8B) is the primary LLM for RAG-grounded answers. OpenAI GPT-4o-mini is the fallback when the document retrieval tier is `'none'` or the RAG response is empty. This ensures the chat always has something useful to say.

**GitHub Actions as ML compute** — The Python pipeline uses FastEmbed + spaCy, which together need ~2–4GB RAM. Render's free tier has 512MB. GitHub Actions' Ubuntu runners have 7GB. We use Actions for all the heavy lifting and Render only for live query-time inference.

---

## 🏛️ Five Levels of Government Coverage

| Level | Body | Members (NY) | Term | What They Control |
|---|---|---|---|---|
| City Council | NYC City Council | 51 | 4 yrs (2-term limit) | City budget, local laws, zoning (ULURP), sanitation, parks |
| State Assembly | NYS Assembly | 150 | 2 years | State legislation (lower chamber), education, labor, state budget |
| State Senate | NYS Senate | 63 | 2 years | State legislation (upper chamber), judicial confirmations, budget oversight |
| U.S. House | US House | 26 (NY) | 2 years | Federal laws, appropriations, constituent services |
| U.S. Senate | US Senate | 2 (NY) | 6 years | Federal legislation, treaties, cabinet/judicial confirmations |

<br>

> **Key insight:** Many policies NYC residents think are City Hall decisions are actually **state law** — rent stabilization, bail reform, MTA funding. This is why covering all five levels matters.

---

## 🗂️ Data Sources

### Document Corpus (ingested by Python pipeline daily)

| Source | Type | Auth |
|---|---|---|
| NYC Council Legistar REST API | Bills, resolutions, matter text | `NYC_COUNCIL_API_KEY` |
| NYC Open Data — Council Meetings (m48u-yjt8) | Finalized meeting records | None |
| NYS Senate Open Legislation — Bills | Session bills with summaries | `NYS_SENATE_API_KEY` |
| NYS Senate Open Legislation — Transcripts | Floor + hearing full text | `NYS_SENATE_API_KEY` |
| NYT Regional RSS | Supplementary news context | None |


### Representative Directory (TypeScript scraper daily)

| Source | What It Provides |
|---|---|
| council.nyc.gov/districts/ + per-member pages | 51 Council members, committees, caucuses, contact info |
| nyassembly.gov/mem/ + /comm/ pages | 150 Assembly members, committee assignments |
| legislation.nysenate.gov/api/3/members/ | 63 Senate member profiles |
| house.gov/representatives | 26 NY House members |
| OpenStates REST + GraphQL | Party affiliation, committee enrichment for Assembly + Senate |
| Hardcoded | US Senators Schumer + Gillibrand |

<br>

### Geospatial Boundaries (static files in `/public`)

6 GeoJSON files: NYC Council districts, NYC boroughs, NYC NTAs (195 neighborhoods), Congressional districts, NYS Senate districts, NYS Assembly districts.

Address geocoding via NYC Planning Labs geocoder (free, no key required).

---

## RAG Pipeline — How Answers Are Generated

1. **User question arrives** with optional profile demographics (borough, ZIP, interests)
2. **Location augmentation** — borough and neighborhood terms from user's ZIP are appended to the query
3. **Embedding** — augmented query → 384-dim vector via HuggingFace API or local FastEmbed fallback
4. **pgvector cosine search** — `ORDER BY embedding <=> query_vector LIMIT top_k×8`
5. **Window expansion** — each result expands ±1 neighboring chunks for fuller context
6. **Three-tier fallback** — vector → lexical ILIKE → recency; `retrieval_tier` returned in response
7. **LLM generation** — Groq Llama 3.1 8B → structured JSON briefing or plain markdown
8. **OpenAI fallback** — if `retrieval_tier='none'`, GPT-4o-mini answers from general knowledge


---

## ⚙️ Environment Variables

| Variable | Used By | Required For |
|---|---|---|
| `DATABASE_URL` | Backend, pipeline | All DB operations |
| `NYS_SENATE_API_KEY` | TS scraper + Python pipeline | Senate members, bills, transcripts |
| `NYC_COUNCIL_API_KEY` | Python pipeline | Legistar bill text |
| `OPEN_STATES_API_KEY` | TS scraper | Party + committee enrichment |
| `GROQ_API_KEY` | Backend | RAG LLM responses |
| `OPENAI_API_KEY` | Frontend (Next.js) | Floating chat fallback + /chat page |
| `OPENAI_MODEL` | Frontend | Optional model override (default: `gpt-4o-mini`) |
| `HF_TOKEN` | Backend embed.py | HuggingFace API (optional, avoids rate limits) |
| `BACKEND_PROD_URL` | cron/keep_alive.py | Keep-alive pings to Render |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Neon Postgres account (with pgvector enabled)
- Groq API key
- OpenAI API key

### Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd civic-spiegel

# 2. Backend setup
cd backend
cp ../.env.example .env   # Fill in DATABASE_URL, GROQ_API_KEY, etc.
pip install -r requirements.txt
python init_db.py          # Initialize all 6 tables + pgvector

# 3. Populate historical data (required for chat to have context)
cd ../pipeline
python backfill_history.py # Backfills 2021, 2023, 2025 session years

# 4. Start the backend
cd ../backend
uvicorn main:app --reload  # Runs on localhost:8000

# 5. Frontend setup
cd ../frontend
cp .env.local.example .env.local  # Fill in OPENAI_API_KEY, NYS_SENATE_API_KEY, NYC_COUNCIL_API_KEY, etc.
npm install
npm run dev                # Runs on localhost:3000
```

### Automated Pipeline (GitHub Actions)

1. Add all required secrets to **GitHub Repository Secrets** (Settings → Secrets → Actions).
2. Push to `main`. The two workflows (`run_pipeline.yml`, `refresh-politicians.yml`) activate on schedule at 06:00 UTC daily.
3. Both can also be triggered manually via **workflow_dispatch** in the Actions tab.

### Refreshing Politicians Manually

```bash
cd frontend
npm run refresh-politicians
# Writes to public/data/politicians.json
# Commit and push to update the live site
```

---

## 🧬 Project Structure

```
civic-spiegel/
├── frontend/                    # Next.js 14 app (TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   └── api/
│   │   │       ├── civic/
│   │   │       │   ├── politicians/route.ts   # 4-layer fallback data route
│   │   │       │   ├── chat/route.ts          # RAG proxy to FastAPI
│   │   │       │   ├── floating-chat/route.ts # Dual-LLM orchestration
│   │   │       │   └── policies/route.ts      # Policy feed proxy
│   │   │       └── llm/
│   │   │           └── chat/route.ts          # Direct OpenAI for /chat page
│   │   ├── lib/
│   │   │   ├── politicians.ts       # Types, cache, filter logic
│   │   │   ├── api.ts               # All client-side API calls
│   │   │   ├── scrapers.ts          # Server-side scraper functions
│   │   │   ├── policy-reply.ts      # RAG response normalization
│   │   │   └── useProfile.ts        # localStorage profile hook
│   │   └── components/civiq/
│   │       ├── HomeShell.tsx        # Main page orchestrator
│   │       ├── FloatingChatBot.tsx  # Ask Spiegel widget
│   │       ├── PoliticianCards.tsx  # Representative directory
│   │       ├── CivicMap.tsx         # 4-tab map system
│   │       ├── PolicyBriefingPanel.tsx
│   │       ├── AccessibilityWidget.tsx
│   │       ├── OnboardingModal.tsx
│   │       ├── SettingsModal.tsx
│   │       └── ...
│   ├── public/
│   │   ├── data/politicians.json        # Pre-built rep cache (auto-committed)
│   │   ├── boundaries-districts.geojson
│   │   ├── boundaries-boroughs.geojson
│   │   ├── boundaries-neighborhoods.geojson
│   │   ├── boundaries-congressional.geojson
│   │   ├── boundaries-nys-senate.geojson
│   │   └── boundaries-nys-assembly.geojson
│   └── scripts/
│       └── refresh-politicians.ts   # CLI: scrape all reps → politicians.json
│
├── backend/                     # FastAPI (Python)
│   ├── main.py                  # All endpoints + RAG orchestration
│   ├── schema.py                # SQLModel tables (6 tables + pgvector)
│   ├── db.py                    # Neon engine with pool config
│   ├── embed.py                 # Query-time embedding (HF API → FastEmbed fallback)
│   └── llm_engine.py            # Groq + mock mode LLM wrapper
│
├── pipeline/                    # Python document ingestion
│   ├── run_pipeline.py          # Unified runner (4 scrapers in sequence)
│   ├── backfill_history.py      # One-time historical import (2021, 2023, 2025)
│   ├── base_scraper.py          # Abstract base: DB insert, dedup, junk filter
│   ├── embedding_engine.py      # Sentence chunking + FastEmbed vectors
│   ├── tag_classifier.py        # spaCy NER + keyword policy classification
│   └── scrapers/
│       ├── nyc_council_legistar.py
│       ├── nyc_council_meetings.py
│       ├── nyc_council_rss.py
│       ├── nys_senate_bills.py
│       └── nys_senate_transcripts.py
│
├── scripts/                     # One-time utility scripts
│   ├── seed_politicians.py      # Seed Politician table from NYC Open Data
│   ├── sync_council_members.py  # Sync council members + cache districts.geojson
│   └── geo_crosswalk.py         # Shapely: ZIP + NTA → council district mapping
│
├── cron/
│   └── keep_alive.py            # Pings /api/health to prevent Render sleep
│
├── docs/
│   ├── DATABASE_ARCHITECTURE.md # This file (schema, design decisions)
│   └── DOMAINS_AND_NUANCES.md   # NYC/NYS political context for data/ML team
│
└── .github/workflows/
    ├── run_pipeline.yml          # Daily 06:00 UTC: Python pipeline → Neon
    └── refresh-politicians.yml   # Daily 06:00 UTC: TS scraper → politicians.json
```


---

## 🤝 Contributing

Understanding the NYC/NYS political context is required reading for any data/ML actions.