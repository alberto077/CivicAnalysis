import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import {
  Database, Globe, Link2, Cpu, Zap, Layers, ShieldCheck,
  ExternalLink, Info, GitBranch, Map, FileText, BarChart2,
  ArrowRight, Code2, RefreshCw, Search
} from "lucide-react";


// DATA SOURCES ====================================================================
const cityCouncilSources = [
  {
    name: "NYC Council Districts & Members",
    type: "Representative Directory",
    desc: "Live HTML scrape of all 51 council members, their districts, neighborhoods, party affiliations, committee memberships, and office contact info. Refreshed daily via GitHub Actions.",
    url: "https://council.nyc.gov/districts/",
  },
  {
    name: "NYC Council Legistar API",
    type: "Official Legislative Records",
    desc: "Official REST API for NYC Intro bills, Resolutions, committee meeting records, and voting history. Authenticated requests via NYC_COUNCIL_API_KEY.",
    url: "https://webapi.legistar.com/v1/nyc/",
  },
  {
    name: "NYC Council Legistar Portal",
    type: "Meeting Calendar & Transcripts",
    desc: "Public calendar of all Council and committee sessions with agendas, minutes, and full hearing transcripts. PDFs are extracted, chunked, and indexed into the vector database.",
    url: "https://legistar.council.nyc.gov/",
  },
  {
    name: "NYC Open Data — Council Meetings",
    type: "Structured Meeting Records",
    desc: "Socrata endpoint (m48u-yjt8) serving structured metadata for all finalized NYC Council meetings 1999-present. No API key required; used to build the meeting corpus.",
    url: "https://data.cityofnewyork.us/resource/m48u-yjt8.json",
  },
  {
    name: "NYC Open Data — Council Members",
    type: "Member Roster",
    desc: "Socrata endpoint (uvw5-9znb) for current member roster including term dates and office IDs. Used as a secondary seed source for the database.",
    url: "https://data.cityofnewyork.us/resource/uvw5-9znb.json",
  },
];

const stateSources = [
  {
    name: "NYS Assembly Member Directory",
    type: "State Legislative Data",
    desc: "Live scrape of all 150 Assembly members from nyassembly.gov. Party affiliation enriched via OpenStates REST API; committee assignments scraped from each member's /comm/ page.",
    url: "https://nyassembly.gov/mem/",
  },
  {
    name: "NYS Senate Open Legislation API",
    type: "State Legislative API",
    desc: "Official API for NY State Senate members, bills, resolutions, and floor transcripts. Used to populate senator profiles, session-year bills, and hearing transcripts going back to 2021.",
    url: "https://legislation.nysenate.gov/",
  },
  {
    name: "NYS Senate Portal",
    type: "Senator Profiles & Events",
    desc: "Official portal for senator bios, committee assignments, event listings, and town hall schedules. Photo URLs and bio slugs are resolved from this source.",
    url: "https://www.nysenate.gov/",
  },
  {
    name: "OpenStates API (REST + GraphQL)",
    type: "Party & Committee Enrichment",
    desc: "Third-party aggregator used to enrich NY legislators with party affiliation (via district-keyed REST) and committee memberships (via GraphQL). Results are merged with live scrape data.",
    url: "https://openstates.org/api/",
  },
  {
    name: "NYS Board of Elections — Interactive Map",
    type: "Geospatial Boundary Data",
    desc: "ArcGIS-hosted map of Congressional, State Senate, and Assembly districts across New York State. Embedded in the NYS Explorer tab.",
    url: "https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e",
  },
  {
    name: "NYS Open GIS Portal",
    type: "Boundary Shapefiles",
    desc: "Official NYS Department of State GIS datasets. Source for NYS Senate, Assembly, and Congressional district boundary GeoJSON files served locally.",
    url: "https://opdgig.dos.ny.gov/",
  },
];

const federalSources = [
  {
    name: "U.S. House of Representatives",
    type: "Federal Directory",
    desc: "Official member directory. NY representatives are scraped from the state table including district, party, and committee assignments.",
    url: "https://www.house.gov/representatives",
  },
  {
    name: "GovTrack — NY Congressional Delegation",
    type: "Federal Legislative Tracking",
    desc: "Independent tracker for New York's 26 House members and 2 Senators, including voting records and sponsorship data.",
    url: "https://www.govtrack.us/congress/members/NY",
  },
  {
    name: "Senator Schumer — Official Site",
    type: "U.S. Senate",
    desc: "Official profile for Chuck Schumer including committee memberships, caucus roles, and constituency contact info.",
    url: "https://www.schumer.senate.gov/",
  },
  {
    name: "Senator Gillibrand — Official Site",
    type: "U.S. Senate",
    desc: "Official profile for Kirsten Gillibrand including subcommittee assignments across Armed Services, Appropriations, and Intelligence.",
    url: "https://www.gillibrand.senate.gov/",
  },
];

const geospatialSources = [
  {
    name: "NYC Council District Boundaries",
    type: "GeoJSON — City",
    desc: "51-district council boundary file served at /boundaries-districts.geojson. Powers the NYC Explorer choropleth map and the geocode-to-district lookup.",
    url: "https://data.cityofnewyork.us/",
  },
  {
    name: "NYC Borough Boundaries",
    type: "GeoJSON — City",
    desc: "5-borough boundary file (MIT-licensed via codeforgermany/click_that_hood, original data: NYC Open Data DCP). Used as an optional map overlay layer.",
    url: "https://data.cityofnewyork.us/",
  },
  {
    name: "NYC Neighborhood Tabulation Areas",
    type: "GeoJSON — City",
    desc: "195 NYC Planning NTAs (2020) served at /boundaries-neighborhoods.geojson. Used to derive neighborhood-to-district crosswalks for the RAG location context.",
    url: "https://data.cityofnewyork.us/resource/9nt8-h7nd",
  },
  {
    name: "NYC MODZCTA ZIP Crosswalk",
    type: "GeoJSON — City",
    desc: "Modified ZCTA shapefile used to compute ZIP-code-to-council-district crosswalks via polygon intersection (Shapely). Stored per district in the database.",
    url: "https://data.cityofnewyork.us/api/geospatial/pri4-ifjk",
  },
  {
    name: "NYS Congressional District Boundaries",
    type: "GeoJSON — Federal",
    desc: "All 26 NY Congressional district boundaries served at /boundaries-congressional.geojson. Sourced from NYS ITS GIS.",
    url: "https://opdgig.dos.ny.gov/",
  },
  {
    name: "NYS Senate & Assembly Boundaries",
    type: "GeoJSON — State",
    desc: "63 Senate and 150 Assembly district boundaries served locally. Used as optional overlay layers in the Civic Hub map.",
    url: "https://opdgig.dos.ny.gov/",
  },
  {
    name: "NYC Planning Labs Geocoder",
    type: "Address Resolution",
    desc: "Free, no-key-required geocoding API for NYC addresses. Used in the NYC Explorer to convert street addresses into lat/lng for district lookup.",
    url: "https://geosearch.planninglabs.nyc/",
  },
];

const userResources = [
  {
    name: "mygovnyc.org",
    type: "Civic Tool",
    desc: "Enter any NYC address to see every elected rep at the city, state, and federal levels.",
    url: "https://www.mygovnyc.org",
  },
  {
    name: "NYC Boundary Explorer (BetaNYC)",
    type: "Civic Tool",
    desc: "View overlapping civic boundaries — council districts, community boards, school districts, and precincts — on one map.",
    url: "https://boundaries.beta.nyc/?map=cc",
  },
  {
    name: "NYC Council Portal",
    type: "Official",
    desc: "Browse bills, votes, hearings, and member profiles. The primary public interface for NYC legislation.",
    url: "https://council.nyc.gov/",
  },
  {
    name: "Legistar Calendar",
    type: "Official",
    desc: "Full Council and committee schedule with agendas, minutes, and vote records.",
    url: "https://legistar.council.nyc.gov/Calendar.aspx",
  },
  {
    name: "NYC Community Boards",
    type: "Official",
    desc: "Directory of all 59 community boards and their meeting schedules.",
    url: "https://www.nyc.gov/site/cau/community-boards/community-boards.page",
  },
  {
    name: "NYS Senate Find My Senator",
    type: "Official",
    desc: "Official address-based lookup for your State Senator.",
    url: "https://www.nysenate.gov/find-my-senator",
  },
  {
    name: "Find Your U.S. Representative",
    type: "Official",
    desc: "Locate your federal House representative by address or ZIP.",
    url: "https://www.house.gov/representatives/find-your-representative",
  },
  {
    name: "BallotReady NY",
    type: "Civic Tool",
    desc: "Nonpartisan voter guide covering every race on your ballot in New York.",
    url: "https://www.ballotready.org/us/new-york",
  },
];



// TECH STACK + INFRASTRUCTURE/ARCHITECTURE =========================================
const infrastructure = [
  {
    name: "Groq Cloud — Llama 3.1 8B",
    type: "Inference Engine",
    desc: "Powers RAG responses and structured briefings. Sub-second inference via Groq's LPU hardware. Handles both structured JSON (briefing mode) and plain markdown (chat mode).",
    icon: Zap,
    url: "https://groq.com/",
  },
  {
    name: "Neon Serverless Postgres + pgvector",
    type: "Vector Database",
    desc: "Serverless Postgres with the pgvector extension enabled. Stores 384-dimension float32 embeddings in DocumentChunk rows alongside plain text, enabling cosine-similarity search without a separate vector store.",
    icon: Layers,
    url: "https://neon.tech/",
  },
  {
    name: "FastEmbed — BAAI/bge-small-en-v1.5",
    type: "Embedding Engine",
    desc: "ONNX-based embedding model generating 384-dim vectors at ingest time (pipeline) and query time (backend). Falls back to Hugging Face Inference API when local model is unavailable.",
    icon: Cpu,
    url: "https://qdrant.github.io/fastembed/",
  },
  {
    name: "spaCy NLP Pipeline",
    type: "Classification Layer",
    desc: "en_core_web_sm model used in tag_classifier.py to extract named entities (politicians, agencies, locations) and classify documents into policy areas and affected demographics.",
    icon: ShieldCheck,
    url: "https://spacy.io/",
  },
  {
    name: "Next.js 14 + Tailwind CSS",
    type: "Frontend Framework",
    desc: "App Router with server components, edge-compatible API routes, and a 24-hour CDN cache on the /api/civic/politicians route. Static GeoJSON boundary files served from /public.",
    icon: Code2,
    url: "https://nextjs.org/",
  },
  {
    name: "FastAPI + Python",
    type: "Backend Framework",
    desc: "Async REST API hosted on Render (free tier). Handles RAG orchestration, pgvector similarity search, and the /api/politicians endpoint. SlowAPI rate-limiting at 10 req/min per IP.",
    icon: GitBranch,
    url: "https://fastapi.tiangolo.com/",
  },
  {
    name: "GitHub Actions",
    type: "Automation & CI",
    desc: "Two scheduled workflows run daily at 06:00 UTC: run_pipeline.yml ingests new legislative documents into Neon; refresh-politicians.yml scrapes fresh member data and commits politicians.json to the repo.",
    icon: RefreshCw,
    url: "https://github.com/features/actions",
  },
  {
    name: "Cheerio + BeautifulSoup",
    type: "HTML Scraping",
    desc: "Cheerio (Node/TypeScript) handles council.nyc.gov and nyassembly.gov scraping. BeautifulSoup (Python) is used for RSS and supplementary HTML sources in the pipeline.",
    icon: Search,
    url: "https://cheerio.js.org/",
  },
];


// DATA PIPELINE =====================================================================
const pipelineSteps = [
  {
    n: "1",
    title: "Scrape & Fetch",
    body: "GitHub Actions triggers daily. Python scrapers hit Legistar, NYS Senate Open Legislation, and NYC Open Data endpoints. TypeScript scrapers fetch member HTML from council, assembly, and senate sites.",
    color: "bg-blue-500/20 text-blue-300",
  },
  {
    n: "2",
    title: "Extract & Clean",
    body: "Raw HTML is stripped. PDF transcripts are parsed for plain text. Junk content (empty strings, procedural placeholders) is filtered out in base_scraper.py before any storage occurs.",
    color: "bg-violet-500/20 text-violet-300",
  },
  {
    n: "3",
    title: "Classify",
    body: "tag_classifier.py uses keyword matching and spaCy NER to tag each document with policy areas (Housing, Transit, Budget…), affected demographics, jurisdiction level, and policy stage.",
    color: "bg-amber-500/20 text-amber-300",
  },
  {
    n: "4",
    title: "Chunk & Embed",
    body: "Documents are split into ~500-word sentence-aware chunks with 50-word overlap. Each chunk is passed through BAAI/bge-small-en-v1.5 to produce a 384-dim float32 vector.",
    color: "bg-emerald-500/20 text-emerald-300",
  },
  {
    n: "5",
    title: "Store",
    body: "Chunks and their embeddings are inserted into Neon Postgres. Deduplication checks source_url before insert. The politicians.json cache is committed back to the repo.",
    color: "bg-rose-500/20 text-rose-300",
  },
  {
    n: "6",
    title: "Retrieve",
    body: "At query time, the user's message (augmented with borough/ZIP context) is embedded and compared via pgvector cosine distance. Falls back to lexical search, then recency, if vector recall is empty.",
    color: "bg-cyan-500/20 text-cyan-300",
  },
  {
    n: "7",
    title: "Generate",
    body: "Top chunks are passed to Groq (Llama 3.1 8B) with the user's demographic context. The LLM returns either a structured JSON briefing or plain markdown depending on the interface.",
    color: "bg-pink-500/20 text-pink-300",
  },
];




// ===============================================================================

function SourceCard({
  source,
  accentHover,
  badgeColor,
}: {
  source: { name: string; type: string; desc: string; url: string };
  accentHover: string;
  badgeColor: string;
}) {
  return (
    <div
      className={`group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all ${accentHover} dark:border-(--border) dark:bg-(--surface-card)`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ${badgeColor}`}>
            {source.type}
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-foreground mb-1.5">{source.name}</h3>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">{source.desc}</p>
        </div>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-slate-50 p-2 text-slate-400 transition-all group-hover:bg-white group-hover:shadow-sm dark:bg-(--surface-elevated) dark:text-(--foreground-secondary)"
          aria-label={`Visit ${source.name}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className={`rounded-xl p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-foreground">{title}</h2>
    </div>
  );
}



// ==================================================================================
export default function DataSourcesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-background">
      <Header />
      <main className="flex-1 pb-24">

        {/* HERO */}
        <div className="bg-slate-900 pt-32 pb-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_60%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
            <MotionReveal>
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-400">
                  <Database className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Civic Spiegel</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-5">
                Data Sources &amp; Architecture
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-400">
                Every fact in Civic Spiegel traces back to a primary government source. No third-party analysis,
                no aggregator bias — raw official records, indexed and made searchable.
              </p>

              {/* quick stats */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
                {[
                  { n: "290+", label: "Representatives tracked" },
                  { n: "6", label: "Government levels" },
                  { n: "384", label: "Vector dimensions" },
                  { n: "Daily", label: "Refresh cadence" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                    <div className="text-2xl font-bold text-white">{stat.n}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-3">

            {/* LEFT COLUMN */}
            <div className="space-y-16 lg:col-span-2">

              {/* RAG Pipeline */}
              <MotionReveal>
                <SectionHeader icon={GitBranch} title="How the Pipeline Works" color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />
                <div className="rounded-4xl bg-slate-900 p-8 space-y-1">
                  {pipelineSteps.map((step, i) => (
                    <div key={step.n} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.color}`}>
                          {step.n}
                        </div>
                        {i < pipelineSteps.length - 1 && (
                          <div className="w-px flex-1 bg-white/5 my-1" />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className="text-sm font-bold text-white mb-1">{step.title}</p>
                        <p className="text-xs leading-relaxed text-slate-400">{step.body}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-500">
                    <RefreshCw className="h-3 w-3" />
                    Steps 1-5 run automatically every day at 06:00 UTC via GitHub Actions
                  </div>
                </div>
              </MotionReveal>

              {/* City Council */}
              <MotionReveal>
                <SectionHeader icon={Globe} title="NYC City Council" color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />
                <div className="space-y-4">
                  {cityCouncilSources.map(s => (
                    <SourceCard
                      key={s.name}
                      source={s}
                      accentHover="hover:border-blue-200 hover:shadow-sm dark:hover:border-[var(--accent)]/40"
                      badgeColor="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                    />
                  ))}
                </div>
              </MotionReveal>

              {/* State */}
              <MotionReveal>
                <SectionHeader icon={FileText} title="New York State Legislature" color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
                <div className="space-y-4">
                  {stateSources.map(s => (
                    <SourceCard
                      key={s.name}
                      source={s}
                      accentHover="hover:border-amber-200 hover:shadow-sm dark:hover:border-amber-400/30"
                      badgeColor="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    />
                  ))}
                </div>
              </MotionReveal>

              {/* Federal */}
              <MotionReveal>
                <SectionHeader icon={Info} title="Federal Representation" color="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" />
                <div className="space-y-4">
                  {federalSources.map(s => (
                    <SourceCard
                      key={s.name}
                      source={s}
                      accentHover="hover:border-purple-200 hover:shadow-sm dark:hover:border-purple-400/30"
                      badgeColor="bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
                    />
                  ))}
                </div>
              </MotionReveal>

              {/* Geospatial */}
              <MotionReveal>
                <SectionHeader icon={Map} title="Geospatial & Boundary Data" color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
                <div className="space-y-4">
                  {geospatialSources.map(s => (
                    <SourceCard
                      key={s.name}
                      source={s}
                      accentHover="hover:border-emerald-200 hover:shadow-sm dark:hover:border-emerald-400/30"
                      badgeColor="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    />
                  ))}
                </div>
              </MotionReveal>

              {/* Infrastructure */}
              <MotionReveal>
                <SectionHeader icon={Cpu} title="Technical Infrastructure" color="bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400" />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {infrastructure.map(item => (
                    <div
                      key={item.name}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-(--border) dark:bg-(--surface-card)"
                    >
                      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-(--surface-elevated) dark:text-(--foreground-secondary)">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{item.type}</div>
                      <h3 className="font-bold text-slate-900 dark:text-foreground mb-2">{item.name}</h3>
                      <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary) mb-4">{item.desc}</p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 transition hover:text-slate-800 dark:hover:text-foreground"
                      >
                        Documentation <Link2 className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </MotionReveal>

              {/* other resources */}
              <MotionReveal>
                <SectionHeader icon={BarChart2} title="Civic Resources for Residents" color="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" />
                <p className="text-sm text-slate-500 dark:text-(--foreground-secondary) mb-5">
                  These aren&apos;t data sources we ingest — they&apos;re tools we recommend to users who want to go deeper.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userResources.map(r => (
                    <a
                      key={r.name}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-slate-300 hover:shadow-sm dark:border-(--border) dark:bg-(--surface-card)"
                    >
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{r.type}</div>
                        <p className="text-sm font-bold text-slate-800 dark:text-foreground">{r.name}</p>
                        <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mt-0.5 leading-relaxed">{r.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-600 mt-1 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  ))}
                </div>
              </MotionReveal>

            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">

              {/* data model */}
              <MotionReveal>
                <div className="rounded-4xl bg-slate-900 p-7 text-white">
                  <Database className="mb-5 h-6 w-6 text-blue-400" />
                  <h3 className="font-bold text-lg mb-1">Database Model</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    A single Neon Postgres instance handles relational data and vector search via pgvector — no separate vector store needed.
                  </p>
                  <div className="space-y-3">
                    {[
                      { table: "Politician", desc: "Name, party, role, district, borough, bio URL" },
                      { table: "District", desc: "ZIP codes, NTAs, and jurisdiction per district number" },
                      { table: "LegislationEvent", desc: "Bills, resolutions, status, date, URL" },
                      { table: "VoteRecord", desc: "Links politician ↔ event with vote_cast value" },
                      { table: "PolicyDocument", desc: "Scraped source with metadata_tags JSON" },
                      { table: "DocumentChunk", desc: "Text chunk + 384-dim pgvector embedding" },
                    ].map(row => (
                      <div key={row.table} className="rounded-xl bg-white/5 border border-white/8 px-4 py-3">
                        <code className="text-[11px] font-bold text-blue-300">{row.table}</code>
                        <p className="text-[11px] text-slate-400 mt-0.5">{row.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionReveal>

              {/* data retrieval */}
              <MotionReveal>
                <div className="rounded-4xl border border-slate-200 bg-white p-7 dark:border-(--border) dark:bg-(--surface-card)">
                  <Search className="mb-4 h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-foreground mb-1">Retrieval Strategy</h3>
                  <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mb-5 leading-relaxed">
                    Three-tier fallback ensures answers even when vector recall is sparse.
                  </p>
                  <div className="space-y-3">
                    {[
                      { tier: "Vector", desc: "pgvector cosine similarity on embedded query (augmented with borough/ZIP context)", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" },
                      { tier: "Lexical", desc: "ILIKE full-text keyword match across chunk text when vector recall is empty", color: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" },
                      { tier: "Recency", desc: "Most recently ingested chunks returned if both vector and lexical fail", color: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" },
                    ].map(t => (
                      <div key={t.tier} className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-(--border) p-3">
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${t.color}`}>{t.tier}</span>
                        <p className="text-[11px] text-slate-500 dark:text-(--foreground-secondary) leading-relaxed">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionReveal>

              {/* GitHub Actions */}
              <MotionReveal>
                <div className="rounded-4xl border border-slate-200 bg-white p-7 dark:border-(--border) dark:bg-(--surface-card)">
                  <RefreshCw className="mb-4 h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 dark:text-foreground mb-1">Automated Refresh</h3>
                  <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mb-5 leading-relaxed">
                    Two GitHub Actions workflows keep data current without manual intervention.
                  </p>
                  <div className="space-y-3">
                    {[
                      { name: "run_pipeline.yml", schedule: "Daily 06:00 UTC", detail: "Scrapes Legistar, NYS Senate bills, meeting records; embeds and upserts into Neon." },
                      { name: "refresh-politicians.yml", schedule: "Daily 06:00 UTC", detail: "Scrapes all 290+ member pages, builds politicians.json, commits back to the repo." },
                    ].map(wf => (
                      <div key={wf.name} className="rounded-xl border border-slate-100 dark:border-(--border) p-3">
                        <code className="text-[11px] font-bold text-slate-700 dark:text-foreground">{wf.name}</code>
                        <div className="text-[10px] text-slate-400 mt-0.5 mb-1">{wf.schedule}</div>
                        <p className="text-[11px] text-slate-500 dark:text-(--foreground-secondary) leading-relaxed">{wf.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionReveal>

              {/* note on transparency */}
              <MotionReveal>
                <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 dark:bg-blue-500/8 dark:border-blue-500/15">
                  <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    <span className="font-bold">No ads, no sponsored content.</span> All data is sourced from official government APIs and public HTML pages. Civic Spiegel does not sell or share user data. The representative directory is non-partisan and pulls directly from official government sites.
                  </p>
                </div>
              </MotionReveal>

            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}