# Civic Spiegel
- ~Nomos Spiegel~

## Descriptor
- Civic Research Assistant
- Research for Civic Good
- Find the Facts That Matter

## Version 0: Civic Research Assistant
- local policy data and personalized civic engagement
- users ask questions about local legislation, budgets, and news, then receive summarized, contextual answers tailored to their location and concerns
- uses RAG over a vector database of scraped city council minutes, public datasets, and news articles
- build a tool that helps residents quickly understand how policies affect them, discover relevant actions (eg. meetings, petitions), and stay informed (get personalized briefings)


## Tech Stack
| Area | Tech | Deployment |
|--------|--------|--------|
| Frontend | Next.js + TypeScript + Tailwind | Vercel
| API | Python + FastAPI | Render
| Database | Neon PostgreSQL (Free Tier) | Cloud
| Vector DB | `pgvector` (PostgreSQL extension) | Cloud
| Pipeline | Python scripts + GitHub Actions (7GB RAM) | Cloud
| Web Scraping | Beautiful Soup / Requests (Python) | GitHub Actions
| Embeddings | FastEmbed (`BAAI/bge-small-en-v1.5`) via ONNX | GitHub Actions
| Precision RAG | Voyage AI Reranker (Stretch/Phase 2) | API
| LLM | Groq API (`llama-3.1-8b-instant`) | API
| ML tags | Hybrid Keyword/spaCy (NYS + NYC) | GitHub Actions
| Auth | None (`localStorage` + URL params only) | Browser
| Cron | GitHub Actions (Pipeline) + cron-job.org (Keep-Alive) | Cloud

- Optional Considerations: 
    - Caching / Queues: Redis
    - ML Classification: HuggingFace zero-shot? (slow?), keyword tagging (error-prone, weaker quality) / spaCy , Llama 3‑small, Mistral‑7B‑instruct free-tier only preferred 
    - Orchestration: Airflow (open source), lightweight scripts, cron (free: https://cron-job.org/en/) preferred 


## Benchmarks & Progress

### 1. Project Foundation
- [x] Initial Project Specification & MVP Definition
- [x] Tech Stack Selection & Architecture Design
- [x] Repository Structure Implementation
- [x] Documentation Setup (`PLANNING.md`, `ARCHITECTURE_DECISIONS.md`, `TEAM_ONBOARDING.md`, `DOMAINS_AND_NUANCES.md`, `DATABASE_ARCHITECTURE.md`)

### 2. Data Pipeline & ML
- [x] `BaseScraper` abstract class with `scrape()`, `process()`, `save_to_json()`, `run()` interface
- [x] Implement "Fail Fast" data integrity (No Mocks)
- [x] Implement High-Density Storage (Batched chunk processing + Raw text retention for better RAG precision)
- [x] Create and execute Historical Backfill Script (2021-2026)
- [x] `EmbeddingEngine` class — improved sentence-aware chunking + overlap
- [x] `TagClassifier` class — hybrid keyword + spaCy NER metadata classification
- [x] `pipeline/output/mock_db.json` — unified mock database produced by run_pipeline.py
- [x] Activate real FastEmbed model (`BAAI/bge-small-en-v1.5`)
- [x] Replace NYT RSS placeholder with real NYC Civic data sources (Legistar API + Socrata)
- [x] Add `metadata_tags` classification (policy area, affected demographics) to `process()` output
- [x] Integrate full NYC + NYS Transcript Engine
- [x] Build `init_db.py` to migrate from JSON output to Neon Postgres (Neon DB)

### 3. Backend & Storage
- [x] 5-table normalized schema (`Politician`, `LegislationEvent`, `VoteRecord`, `PolicyDocument`, `DocumentChunk`)
- [x] FastAPI server (`main.py`) with CORS middleware
- [x] `LLMEngine` with Groq SDK + **mock bypass switch** (no key needed to test)
- [x] `POST /api/chat` endpoint — RAG interface connected to Neon Postgres + Groq
- [x] `GET /api/health` endpoint confirmed working
- [x] Groq API key — set `GROQ_API_KEY` in `.env`
- [x] Neon Postgres account + `DATABASE_URL` — create instance + run `init_db.py`
- [x] Replace JSON mock retrieval with `pgvector` cosine similarity search (Neon DB)
- [x] ~~Add `POST /api/pipeline/run` endpoint~~ (Removed for RAM safety; use GitHub Actions)

### 4. Frontend (Next.js)
- [x] Initial Next.js scaffolding with TypeScript + Tailwind
- [x] User Onboarding Modal (save to `localStorage`)
- [x] Advanced Filters Dashboard (UI Layout)
- [x] Connect Dashboard to Live Data Fetching (Live filters)
- [x] Civic Assistant Chat Interface (Dedicated standalone page at `/chat`)
- [x] Politician Cards (Live API integration with borough filters)
- [x] Settings page (accessible via header modal)
- [x] Multi-page Navigation Migration (Next.js App Router: `/`, `/chat`)


## Big-Picture Scope
- Location: NYC / NYS focused
- Local (NYC council / districts)
- State (NY legislature)
- ~Federal (US Congress, chambers, roll calls)~
    - local (NYC) only
    - Location, Demographics, Policy area, Policy stage, Politicians

- **Transparency / Accountability (The Omnibus Nuance):**
    - Due to the nature of "Omnibus" package bills in NY, naive roll-call tracking falsely labels politicians as hypocrites.
    - We bypass naive tracking by focusing the Data pipeline on *Committee Hearing Transcripts*, *Statements*, and *News*, allowing the LLM to explain *why* a vote happened using Semantic context.
    - **Omnibus Breakdown (Stretch Goal):** UI feature to analyze specific embedded policies mapped to parties, shifting focus from "Politicians" to "Packages". Cross-referenced with user `localStorage` demographics.


## Main features / MVP:
- No Auth – user data in localStorage, no login/accounts
- Personalization changes how the LLM responds to the user based on demographics (Renters vs Homeowners, etc).
    - For each policy item, the ML model or rule‑based system tags, eg. "affects renters", "affects low‑income", etc. 
    - Then, apply those tags to your user's profile (e.g., "you're a renter, income 30–50K").
    - The UI shows "priority" for things that match their profile.

- *The pipeline currently creates a "Mock DB" locally in JSON during development, allowing the Frontend and Backend to immediately test end-to-end functionality without waiting on Neon infrastructure.*


### 1. Onboarding / User Data: 
- via a non‑blocking modal on first visit, then accessed in Settings or other
    - Q1: What borough do you live in? 
        - Manhattan
        - Queens
        - Brooklyn
        - Bronx
        - Staten Island
        - Other / Prefer not to say
    - Q2: What's your approximate annual household income? 
        - Under $25K
        - $26-50K
        - $51-75K
        - $76K-100K
        - Over $100K
        - Other / Prefer not to say
    - Q3: What's your housing status?
        - Renter (Tenant)
        - Homeowner
        - Shared Housing
        - Homeless / Unhoused
        - Other / Prefer not to say
    - Q4: Age range? 
        - Under 18
        - 18–25
        - 26–35
        - 36–50
        - 51–65
        - 65+
        - Other / Prefer not to say
    - Q5: What issues matter most to you? (multi-select options) 
        - Health
        - Armed Forces and National Security
        - Government Operations and Politics
        - International Affairs
        - Taxation
        - Crime and Law Enforcement
        - Agriculture and Food
        - Public Lands and Natural Resources
        - Transportation and Public Works
        - Finance and Financial Sector
        - Immigration
        - Education
        - Congress
        - Science, Technology, Communications
        - Environmental Protection
        - Commerce
        - Energy
        - Labor and Employment
        - Housing and Community Development
        - Foreign Trade and International Finance
        - Native Americans
        - Emergency Management
        - Civil Rights and Liberties, Minority Issues
        - Economics and Public Finance
        - Law
        - Social Welfare
        - Sports and Recreation
        - Families
        - Arts, Culture, Religion
        - Water Resources Development
        - Animals
    - Q6: Any of these apply to you? (multi-select options)
        - Student
        - Immigrant / DACA
        - Veteran
        - Disability
        - Small business owner
        - Child of US immigrants
        - Recent NYC resident
        - Single parent / Caregiver
        - LGBTQ+
        - BIPOC

- [ ] We might need more questions spanning: education level, gender, race/ethnicity, employment, household size, etc.

+ NOTE (explicit to users): All data stays in the browser. Nothing is sent to our servers without explicit consent.


### 2. Dashboard w/ very comprehensive filters:

| Filter Dimensions | Description |
| --- | --- |
| jurisdiction level | local (NYC), state (NY), ~~federal (US)~~ |
| location | City > Borough > Council District > Zip/Neighborhood |
| demographics | Income range, Housing status, Age, Immigration status, Disability, etc. (localStorage) |
| policy area / issues | Housing, Education, Policing, Transit, Environment, Health, Labor, Immigration, Taxation, etc. |
| policy stage | Budget item, Zoning change, Legislation, Hearing, Meeting, Petition, Roll call, etc. |
| time ranges | Last 30 days, Last 6 months, Current session, Entire term, etc. |
| politicians & parties | All NYC Council members, NY State Assembly / Senate |
| stances / impact | Affects renters, Affects homeowners, Affects low‑income, Raises taxes, Cuts services, etc. |


### 3. LLM Chat (Civic Assistant)
- Purpose: answers questions about policies, "How does this affect me?" - personalized policy explanations based on user demographics
- RAG flow: fetch top chunks from `pgvector` (or local JSON mock), optionally rerank with Voyage AI, summarize via Groq `llama-3.1-8b-instant`.
- Prompt engineered to be concise, use cited/fetched information via RAG pipeline (prevent hallucination as much as possible)
    - **Two-part response pattern:**
        - R1: factual summary of the policy, based on user prompt and RAG pipeline (what it is, what it does, what constituents can do about it, etc.)
        - R2: "Here's how this might affect you" - personalized to `localStorage` demographics. Omitted if no profile exists.


### 4. Settings – (localStorage only) – page or modal
- no auth
- editable at any time; no backend persistence, multi-select for Q5 and Q6 (all optional)
- clear all local data button


### 5. Politician Cards
- Name, photo(?), district, party, role/years serving
- **Derived Policy Stances**: Inferred by LLM from bill sponsorship, voting patterns, and committee involvement (as stances are not provided via structured API).
- "What they said vs. what they voted" — council minute quotes vs. roll call record.
- Recent activity list (last 10 events from `LegislationEvent` / `VoteRecord`).
- Contact link + upcoming scheduled meetings.
- **Workflow**: Map Geography (ZIP/Districts) → Identify Officials → Pull Activity Signals.


### 6. Data Sources
| Category | Examples |
| --- | --- |
| Legislation & minutes | City council minutes, ordinances, bills, agendas, NYC Council Legislative API (Legistar) |
| NY State Data | NY State Senate Open Legislation API (near-real-time bills/activity) |
| Geography & Boundaries | NYC Open Data (Boroughs/ZIPs), Redistricting Data Hub (District Maps) |
| Budgets & finance | Published municipal budgets, budget hearings, line-item PDFs or CSVs |
| Public datasets | Open Data portals, Census data, housing, crime, transportation, school stats |
| Local news | RSS feeds, local newspaper sites, community blogs |
| Government comms | Mayor's office releases, press conferences, transcripts |

#### Key API Sources for NYC / NY:
| Source | Utility | Link |
| --- | --- | ---|
| NYC Open Data | Borough, Neighborhood, ZIP, and Community District boundaries | https://opendata.cityofnewyork.us/ |
| NYC Council (Legistar) | Council members, bills, meetings, votes, legislative records | https://legistar.council.nyc.gov/ |
| NY State Senate API | State Senate and Assembly bills, sponsors, committees, calendars | https://www.nysenate.gov/ |
| Redistricting Data Hub | District boundary files (Congressional and State Legislative) | https://redistrictingdatahub.org/ |
| NYC DCP / Geocoding | Mapping ZIP codes to relevant council/legislative districts | https://www.nyc.gov/site/planning/data-maps/open-data.page |
| Local News | RSS feeds from curated outlets | [NO LONGER IN USE] |


### 7. Data Pipeline: RAG & ML/LLM
**Current flow (ACTIVE):**
```
Scrape real sources (Legistar/NYS Senate) → chunk → classify (metadata_tags) → FastEmbed (384-dim) → Neon Postgres (pgvector) → semantic retrieval → Groq LLM → response
```

**Key files:**
- `pipeline/base_scraper.py` - abstract interface all scrapers implement
- `pipeline/embedding_engine.py` - chunker + FastEmbed embeddings
- `pipeline/scrapers/nyc_council_legistar.py` - Official Legistar API scraper
- `pipeline/scrapers/nys_senate_bills.py` - Official NYS Senate API scraper
- `backend/schema.py` - 5-table SQLModel schema (Postgres-ready)
- `backend/main.py` - FastAPI server with `/api/chat` and `/api/politicians`
- `backend/llm_engine.py` - Groq wrapper with RAG context support


### 8. User Flow
- USER → homepage (Dashboard main draw) → (Onboarding modal to localStorage)
- **Multi-page Architecture**: [/dashboard | /map | /politicians | /chat | /about | /data-sources]
    - Optional modal: "Help us show what matters to you."
    - Answer Qs / Skip 
    - App serializes filters to URL + localStorage
    - Advanced Filters Dashboard 
    - LLM Chat (Civic Assistant)
    - Politician Cards / Profiles
    - Settings


--- 

## Example Project Structure 
```
CivicAnalysis/
  frontend/     # Next.js app, components, lib
  backend/      # FastAPI server, schema, LLM engine
  pipeline/     # scrapers, embedding engine, output/
  cron/         # keep-alive heartbeat
  docs/         # all project documentation
```


---

## Roles
- Project Manager: Juana
- Frontend: Thasmia, Kevon
- Backend: Alberto
- Data / ML: Juana


## Timeline / Deadlines

| Date | Task Description | Role | Status |
|---|---|---|---|
| **Mar 27** | Project Specifications + MVP + Plan formulation | ALL | ✅ |
| **Apr 03** | Research: Domain, Scope, Data Sources, APIs, etc. | PM | ✅ |
| | Finalize MVP + Documentation (`ARCHITECTURE_DECISIONS`, `TEAM_ONBOARDING`, `DOMAINS_AND_NUANCES`) | PM | ✅ |
| | Backend schema: 5-table DB schema (`backend/schema.py`) | PM, BE, ML | ✅ |
| | FastAPI server setup (`backend/main.py`) with CORS | BE | ✅ |
| | Github Setup `frontend/` (Next.js + TS + Tailwind) | FE | ✅ |
| **Apr 10** | Frontend structural layouts (Navigation, Modals, Forms) | FE | ✅ |
| | ChatWindow component (LLM RAG Chat UI, calls `/api/chat`) | FE | ✅ |
| | Dashboard UI skeleton + Settings modal | FE | ✅ |
| | Groq LLM bridge + mock bypass (`backend/llm_engine.py`) | BE | ✅ |
| | Data Pipeline Setup: Offline Mock DB (JSON Export) | ML | ✅ |
| | Build initial scraper & FastEmbed engine framework | ML | ✅ |
| | `POST /api/chat` RAG endpoint (reads Neon Postgres) | BE | ✅ |
| | `BaseScraper` abstract class + Database persistence | ML | ✅ |
| | `NYCCouncilLegistarScraper` (Official API, live scrape) | ML | ✅ |
| | `NYSSenateScraper` (Official API, live scrape) | ML | ✅ |
| | `EmbeddingEngine` (chunker + real FastEmbed models) | ML | ✅ |
| | Activate real FastEmbed model in `embedding_engine.py` | ML | ✅ |
| | Replace NYT RSS with real NYC data sources (Legistar / Open Data) | ML | ✅ |
| | Set up Groq account + add `GROQ_API_KEY` to `.env` | BE | ✅ |
| **Apr 17** | **[BE + ML BLOCKER]** Neon Postgres + `pgvector` Integration | BE | ✅ |
| | Full pipeline: scrape → embed → push to Neon | ML | ✅ |
| | Create `GitHub Actions` orchestration for daily scraping pipeline | DevOps | ✅ |
| | OnboardingModal + Dashboard Filters (UI) | FE | ✅ |
| | Personalization toggle + Advanced Filters on Dashboard | FE | ✅ |
| **Apr 23** | **CLASS DEMO** | ALL | ⏳ Pending |
| | Connect Dashboard to Live Data (Filters: Borough, Issue, Time) | FE | ⏳ Pending |
| | Multi-page Migration: Separate routes for Map, Politicians, Chat, etc. | FE | ✅ |
| | Politician Cards: Live data + activity signals | FE | ✅ |
| | About Page: Project | FE | ✅ |
| | Map Geography Model: Borough, Neighborhood, ZIP-to-District mapping | BE/ML | ✅ |
| **May 01** | **Interactive Map & Chatbot Polish** | ALL | ⏳ Pending |
| | Interactive Map: Neighborhoods, Districts, Zip codes | FE | ⏳ Pending |
| | LLM Chatbot - RAG + user context | FE | ⏳ Pending |
| | [STRETCH] Error handling & Rate limiting for public demo | BE | ⏳ Pending |
| | [STRETCH] Voyage AI Reranker integration | ML | ⏳ Pending |
| | [STRETCH] Extensive WCAG AAA Accessibility Overhaul / Multi-language support | FE | ⏳ Pending |
| **May 08** | **Working MVP end-to-end integration** | ALL | ⏳ Pending |
| | QA, Testing, UI Polish | ALL | ⏳ Pending |
| | All hosting live (Vercel / Render / Neon) | ALL | ✅ |
| **May 15** | **Final Projects and Demos Due** | ALL | ⏳ Pending |
