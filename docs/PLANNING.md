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
| Pipeline | Python scripts + cron-job.org | Local -> DB -> Cloud
| Web Scraping | Beautiful Soup / Requests (Python) | Local
| Embeddings | FastEmbed (`BAAI/bge-small-en-v1.5`) via local CPU | Local pipeline
| Precision RAG | Voyage AI Reranker (Stretch/Phase 2) | API
| LLM | Groq API (`llama-3.1-8b-instant`) | API
| ML tags | Keyword rules or spaCy | Local
| Auth | None (`localStorage` + URL params only) | Browser
| Cron | cron-job.org (free) | Cloud

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
- [x] `SampleRSSScraper` — hardcoded mock data demonstrating schema output format
- [x] `NYCCouncilRSSScraper` — live scraper hitting NYT Regional RSS (placeholder until Legistar available)
- [x] `EmbeddingEngine` class — boilerplate chunker + stub `generate_embeddings()` (returns `[0.0]*384`)
- [x] `pipeline/output/` — JSON export pipeline confirmed working end-to-end
- [ ] Activate real FastEmbed model (`BAAI/bge-small-en-v1.5`) — uncomment 3 lines in `embedding_engine.py`
- [ ] Replace NYT RSS placeholder with real NYC Civic data sources (Legistar, Open Data)
- [ ] Add `metadata_tags` classification (policy area, affected demographics) to `process()` output
- [ ] Build `init_db.py` to migrate from JSON output to Neon Postgres *(needs Neon DB)*

### 3. Backend & Storage
- [x] 5-table normalized schema (`Politician`, `LegislationEvent`, `VoteRecord`, `PolicyDocument`, `DocumentChunk`)
- [x] FastAPI server (`main.py`) with CORS middleware
- [x] `LLMEngine` with Groq SDK + **mock bypass switch** (no key needed to test)
- [x] `POST /api/chat` endpoint — reads `pipeline/output/*.json`, sends top 5 chunks to LLM as RAG context
- [x] `GET /api/health` endpoint confirmed working
- [ ] Groq API key — set `GROQ_API_KEY` in `.env` *(needs account setup)*
- [ ] Neon Postgres account + `DATABASE_URL` — create instance + run `init_db.py` *(needs account setup)*
- [ ] Replace JSON mock retrieval with `pgvector` cosine similarity search *(needs Neon DB)*
- [ ] Add `POST /api/documents` endpoint to seed DB from pipeline JSON *(needs Neon DB)*

### 4. Frontend (Next.js)
- [x] Initial Next.js scaffolding with TypeScript + Tailwind
- [ ] User Onboarding Modal (save to `localStorage`)
- [ ] Advanced Filters Dashboard
- [ ] Civic Assistant Chat Interface (calls `POST /api/chat`)
- [ ] Politician / Omnibus Breakdown Cards
- [ ] Settings page (clear `localStorage`)


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
- Policy alignment scores (eg. Housing: 72% progressive, Healthcare: 2% conservative, etc.)
- "What they said vs. what they voted" — council minute quotes vs. roll call record
- Recent votes list (last 10 from `VoteRecord`)
- Contact link + upcoming scheduled meetings

- [ ] Option / Consideration: Basic Politician Cards & Omnibus Breakdowns
    - Voting is nuanced (eg. omnibus bills often contain both good and bad provisions, etc). Package-level analysis (which policies are in a bill, how they split, who benefits, etc.)
    - *Stretch* - only after core RAG pipeline is working


### 6. Data Sources
| Category | Examples |
| --- | --- |
| Legislation & minutes | City council minutes, ordinances, bills, agendas, PDF/HTML municipal records |
| Budgets & finance | Published municipal budgets, budget hearings, line-item PDFs or CSVs |
| Public datasets | Open Data portals, Census data, housing, crime, transportation, school stats |
| Local news | RSS feeds, local newspaper sites, community blogs, press releases |
| Government comms | Mayor's office releases, agency announcements, press conferences, transcripts |
| User activity | Anonymous chat logs and click-throughs (only if explicitly consented) |


#### Limited to NYC / NY:
| Category | NYC / NY Data Source |
| --- | --- |
| NYC Open Data portal | https://opendata.cityofnewyork.us/ |
| NYC Council meetings (1999–2024) | https://data.cityofnewyork.us/City-Government/City-Council-Meetings-1999-to-2024-/m48u-yjt8/about_data |
| NYC Legislation (Legistar) | https://legistar.council.nyc.gov/Legislation.aspx |
| NYC Expense Budget (by agency) | https://data.cityofnewyork.us/City-Government/Expense-Budget/mwzb-yiwb/about_data |
| NYC City Council calendar / hearings | https://legistar.council.nyc.gov/Calendar.aspx |
| NYC Council Budget Dashboards | https://council.nyc.gov/budget/dashboards/ |
| NYC Open Data catalog | https://www.nyc.gov/site/designcommission/resources/designing-ny/open-data.page |
| Local News | Use RSS feeds from local outlets (eg. NYT NYC section, Gothamist, local CUNY journalism projects, etc.) |


### 7. Data Pipeline: RAG & ML/LLM
**Current flow (working):**
```
RSS scrape (NYT placeholder) → chunk text → save to pipeline/output/*.json → FastAPI reads JSON → LLM mock response
```

**Target flow (once Neon DB is set up):**
```
scrape real sources → chunk → classify (metadata_tags) → FastEmbed embeddings → Neon Postgres (pgvector) → semantic retrieval → Groq LLM → response
```

**Key files:**
- `pipeline/base_scraper.py` - abstract interface all scrapers must implement
- `pipeline/embedding_engine.py` - chunker + FastEmbed stub (real model commented out)
- `pipeline/scrapers/nyc_council_rss.py` - NYT Regional RSS scraper (placeholder)
- `pipeline/scrapers/sample_rss_scraper.py` - hardcoded mock data, shows expected output format
- `backend/schema.py` - 5-table SQLModel schema (Postgres-ready)
- `backend/main.py` - FastAPI server, reads mock JSON, exposes `/api/chat`
- `backend/llm_engine.py` - Groq wrapper with mock bypass


### 8. User Flow
- USER → homepage → (Onboarding modal to localStorage) → [Dashboard | LLM chat | Politicians | Settings]
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
  cron/         # cron-job.org ; quick/daily/minor updates to db
  docs/         # all project documentation
```


---

## Roles
- Project Manager: 
- Frontend: 
- Backend:
- Data / ML: 


## Timeline / Deadlines

> **[ML/BE] Blocker:** Neon DB and Groq API key not yet set up. BE + ML tasks depend on this. BE team should create Neon account and save `DATABASE_URL` + `GROQ_API_KEY` to `.env` ASAP.

| Date | Task Description | Role | Status |
|---|---|---|---|
| **Mar 27** | Project Specifications + MVP + Plan formulation | ALL | ✅ |
| **Apr 03** | Research: Domain, Scope, Data Sources, APIs, etc. | PM | ✅ |
| | Finalize MVP + Documentation (`ARCHITECTURE_DECISIONS`, `TEAM_ONBOARDING`, `DOMAINS_AND_NUANCES`) | PM | ✅ |
| | Backend schema: 5-table DB schema (`backend/schema.py`) | PM, BE, ML | ✅ |
| | FastAPI server setup (`backend/main.py`) with CORS | BE | ✅ |
| | Github Setup `frontend/` (Next.js + TS + Tailwind) | FE | 🛠️ In Progress |
| **Apr 10** | Frontend structural layouts (Navigation, Modals, Forms) | FE | ⏳ Pending |
| | ChatWindow component (LLM RAG Chat UI, calls `/api/chat`) | FE | ⏳ Pending |
| | Dashboard UI skeleton + Settings modal | FE | ⏳ Pending |
| | Groq LLM bridge + mock bypass (`backend/llm_engine.py`) | BE | ✅ |
| | Data Pipeline Setup: Offline Mock DB (JSON Export) | ML | ✅ |
| | Build initial scraper & FastEmbed engine framework | ML | ✅ |
| | `POST /api/chat` RAG endpoint (reads mock JSON) | BE | ✅ |
| | `BaseScraper` abstract class + JSON export pipeline | ML | ✅ |
| | `NYCCouncilRSSScraper` (NYT RSS placeholder, live scrape) | ML | ✅ |
| | `SampleRSSScraper` mock data showing correct output format | ML | ✅ |
| | `EmbeddingEngine` boilerplate (chunker + stub embeddings) | ML | ✅ |
| | Activate real FastEmbed model in `embedding_engine.py` | ML | 🛠️ In Progress |
| | Replace NYT RSS with real NYC data sources (Legistar / Open Data) | ML | 🛠️ In Progress |
| | Set up Groq account + add `GROQ_API_KEY` to `.env` | BE | ⏳ Pending |
| **Apr 17** | **[BE + ML BLOCKER]** Set up Neon Postgres + `DATABASE_URL` in `.env` | BE | ⏳ Pending |
| | **[BE BLOCKER]** Run `init_db.py` to create tables in Neon | BE | ⏳ Pending |
| | **[ML BLOCKER]** Build `save_to_postgres()` in `BaseScraper` (replaces `save_to_json`) | ML | ⏳ Pending |
| | **[ML BLOCKER]** Run full pipeline: scrape → embed → push to Neon | ML | ⏳ Pending |
| | **[BE BLOCKER]** Implement `pgvector` cosine similarity search in `/api/chat` | BE | ⏳ Pending |
| | **[ML BLOCKER]** Add `metadata_tags` classification to `process()` (policy area, demographics) | ML | ⏳ Pending |
| | OnboardingModal → save to `localStorage` | FE | ⏳ Pending |
| | Personalization toggle + Advanced Filters on Dashboard | FE | ⏳ Pending |
| | Connect Politician Cards & Omnibus breakdown components to DB APIs | FE | ⏳ Pending |
| **Apr 24** | *Buffer week — continue previous tasks* | ALL | ⏳ Pending |
| | Multi-language support, accessibility tweaks | FE | ⏳ Pending |
| | Error handling, strict rate limiting | BE | ⏳ Pending |
| | Create `cron` triggers for regular scraping pipeline execution | ML | ⏳ Pending |
| **May 01** | *Stretch Features* | ALL | ⏳ Pending |
| | Connect Reranker feature (Voyage AI - stretch goal) | ML/BE | ⏳ Pending |
| **May 08** | Working MVP end-to-end integration | ALL | ⏳ Pending |
| | QA, Testing, UI Polish | ALL | ⏳ Pending |
| | All hosting live (Vercel / Render / Neon) | ALL | ⏳ Pending |
| **May 15** | Final Projects and Demos Due | ALL | ⏳ Pending |
