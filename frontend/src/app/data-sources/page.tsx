import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import { DataSourcesStatsPanel } from "@/components/civiq/DataSourcesStatsPanel";
import {
  Database, Globe, Cpu, Zap, Layers, ShieldCheck, Bot, User, Accessibility,
  ExternalLink, Info, GitBranch, Map, FileText, BarChart2,
  ArrowRight, Code2, RefreshCw, Search
} from "lucide-react";



// DATA SOURCES ====================================================================
const cityCouncilSources = [
  { name: "NYC Council Districts & Members",    type: "Representative Directory",        url: "https://council.nyc.gov/districts/",    desc: "Live HTML scrape of all 51 council members, their districts, neighborhoods, party affiliations, committee memberships, and office contact info. Refreshed daily via GitHub Actions.", },
  { name: "NYC Council Legistar API",           type: "Official Legislative Records",    url: "https://webapi.legistar.com/v1/nyc/",   desc: "Official REST API for NYC Intro bills, Resolutions, committee meeting records, and voting history. Authenticated requests via NYC_COUNCIL_API_KEY.", },
  { name: "NYC Council Legistar Portal",        type: "Meeting Calendar & Transcripts",  url: "https://legistar.council.nyc.gov/",     desc: "Public calendar of all Council and committee sessions with agendas, minutes, and full hearing transcripts. PDFs are extracted, chunked, and indexed into the vector database.", },
  { name: "NYC Open Data — Council Meetings",   type: "Structured Meeting Records",      url: "https://data.cityofnewyork.us/resource/m48u-yjt8.json", desc: "Socrata endpoint (m48u-yjt8) serving structured metadata for all finalized NYC Council meetings 1999-present. No API key required; used to build the meeting corpus.", },
  { name: "NYC Open Data — Council Members",    type: "Member Roster",                   url: "https://data.cityofnewyork.us/resource/uvw5-9znb.json", desc: "Socrata endpoint (uvw5-9znb) for current member roster including term dates and office IDs. Used as a secondary seed source for the database.", },
];

const stateSources = [
  { name: "NYS Assembly Member Directory",				type: "State Legislative Data",				url: "https://nyassembly.gov/mem/",																	desc: "Live scrape of all 150 Assembly members from nyassembly.gov. Party affiliation enriched via OpenStates REST API; committee assignments scraped from each member's /comm/ page." },
  { name: "NYS Senate Open Legislation API",			type: "State Legislative API",				url: "https://legislation.nysenate.gov/",															desc: "Official API for NY State Senate members, bills, resolutions, and floor transcripts. Used to populate senator profiles, session-year bills, and hearing transcripts going back to 2021." },
  { name: "NYS Senate Portal",							type: "Senator Profiles & Events",			url: "https://www.nysenate.gov/",																	desc: "Official portal for senator bios, committee assignments, event listings, and town hall schedules. Photo URLs and bio slugs are resolved from this source." },
  { name: "OpenStates API (REST + GraphQL)",			type: "Party & Committee Enrichment",		url: "https://openstates.org/api/",																	desc: "Third-party aggregator used to enrich NY legislators with party affiliation (via district-keyed REST) and committee memberships (via GraphQL). Results are merged with live scrape data." },
  { name: "NYS Board of Elections — Interactive Map",	type: "Geospatial Boundary Data",			url: "https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e",	desc: "ArcGIS-hosted map of Congressional, State Senate, and Assembly districts across New York State. Embedded in the NYS Explorer tab." },
  { name: "NYS Open GIS Portal",						type: "Boundary Shapefiles",				url: "https://opdgig.dos.ny.gov/",																	desc: "Official NYS Department of State GIS datasets. Source for NYS Senate, Assembly, and Congressional district boundary GeoJSON files served locally." },
];

const federalSources = [
  { name: "U.S. House of Representatives",				type: "Federal Directory",					url: "https://www.house.gov/representatives",														desc: "Official member directory. NY representatives are scraped from the state table including district, party, and committee assignments." },
  { name: "GovTrack — NY Congressional Delegation",	type: "Federal Legislative Tracking",		url: "https://www.govtrack.us/congress/members/NY",													desc: "Independent tracker for New York's 26 House members and 2 Senators, including voting records and sponsorship data." },
  { name: "Senator Schumer — Official Site",			type: "U.S. Senate",						url: "https://www.schumer.senate.gov/",																desc: "Official profile for Chuck Schumer including committee memberships, caucus roles, and constituency contact info." },
  { name: "Senator Gillibrand — Official Site",		type: "U.S. Senate",						url: "https://www.gillibrand.senate.gov/",															desc: "Official profile for Kirsten Gillibrand including subcommittee assignments across Armed Services, Appropriations, and Intelligence." },
];

const geospatialSources = [
  { name: "NYC Council District Boundaries",			type: "GeoJSON — City",					url: "https://data.cityofnewyork.us/",																desc: "51-district council boundary file served at /boundaries-districts.geojson. Powers the NYC Explorer choropleth map and the geocode-to-district lookup." },
  { name: "NYC Borough Boundaries",					type: "GeoJSON — City",					url: "https://data.cityofnewyork.us/",																desc: "5-borough boundary file (MIT-licensed via codeforgermany/click_that_hood, original data: NYC Open Data DCP). Used as an optional map overlay layer." },
  { name: "NYC Neighborhood Tabulation Areas",			type: "GeoJSON — City",					url: "https://data.cityofnewyork.us/resource/9nt8-h7nd",												desc: "195 NYC Planning NTAs (2020) served at /boundaries-neighborhoods.geojson. Used to derive neighborhood-to-district crosswalks for the RAG location context." },
  { name: "NYC MODZCTA ZIP Crosswalk",					type: "GeoJSON — City",					url: "https://data.cityofnewyork.us/api/geospatial/pri4-ifjk",										desc: "Modified ZCTA shapefile used to compute ZIP-code-to-council-district crosswalks via polygon intersection (Shapely). Stored per district in the database." },
  { name: "NYS Congressional District Boundaries",		type: "GeoJSON — Federal",				url: "https://opdgig.dos.ny.gov/",																	desc: "All 26 NY Congressional district boundaries served at /boundaries-congressional.geojson. Sourced from NYS ITS GIS." },
  { name: "NYS Senate & Assembly Boundaries",			type: "GeoJSON — State",					url: "https://opdgig.dos.ny.gov/",																	desc: "63 Senate and 150 Assembly district boundaries served locally. Used as optional overlay layers in the Civic Hub map." },
  { name: "NYC Planning Labs Geocoder",				type: "Address Resolution",				url: "https://geosearch.planninglabs.nyc/",															desc: "Free, no-key-required geocoding API for NYC addresses. Used in the NYC Explorer to convert street addresses into lat/lng for district lookup." },
];

const userResources = [
  { name: "mygovnyc.org",								type: "Civic Tool",						url: "https://www.mygovnyc.org",																		desc: "Enter any NYC address to see every elected rep at the city, state, and federal levels." },
  { name: "NYC Boundary Explorer (BetaNYC)",			type: "Civic Tool",						url: "https://boundaries.beta.nyc/?map=cc",															desc: "View overlapping civic boundaries — council districts, community boards, school districts, and precincts — on one map." },
  { name: "NYC Council Portal",						type: "Official",							url: "https://council.nyc.gov/",																		desc: "Browse bills, votes, hearings, and member profiles. The primary public interface for NYC legislation." },
  { name: "Legistar Calendar",							type: "Official",							url: "https://legistar.council.nyc.gov/Calendar.aspx",												desc: "Full Council and committee schedule with agendas, minutes, and vote records." },
  { name: "NYC Community Boards",						type: "Official",							url: "https://www.nyc.gov/site/cau/community-boards/community-boards.page",							desc: "Directory of all 59 community boards and their meeting schedules." },
  { name: "NYS Senate Find My Senator",				type: "Official",							url: "https://www.nysenate.gov/find-my-senator",														desc: "Official address-based lookup for your State Senator." },
  { name: "Find Your U.S. Representative",				type: "Official",							url: "https://www.house.gov/representatives/find-your-representative",								desc: "Locate your federal House representative by address or ZIP." },
  { name: "BallotReady NY",							type: "Civic Tool",						url: "https://www.ballotready.org/us/new-york",														desc: "Nonpartisan voter guide covering every race on your ballot in New York." },
];


// TECH STACK + INFRASTRUCTURE/ARCHITECTURE =========================================
const infrastructure = [
  { icon: Code2,        name: "Next.js 14 + Tailwind CSS",           type: "Frontend Framework",  desc: "App Router with server components, edge-compatible API routes, and a 24-hour CDN cache on the politicians route. Static GeoJSON boundary files are served from /public, with dynamic imports for glassmorphism/animation." },
  { icon: User,         name: "localStorage (browser-native)",       type: "Client Persistence",  desc: "Three separate localStorage keys for user demographics, accessibility settings (7 toggle states), and theme (light/dark)." },
  { icon: GitBranch,    name: "FastAPI + Python",                   type: "Backend Framework",    desc: "Async REST API hosted on Render (free tier). Handles RAG orchestration, pgvector similarity search, and LLM generation. SlowAPI rate-limiting at 10 req/min per IP. CORS restricted to production and localhost:3000." },
  { icon: Accessibility,name: "Web Speech API (browser-native)",      type: "Accessibility",      desc: "SpeechSynthesisUtterance used by AccessibilityWidget for text-to-speech. Reads selected text or full page main content. No external dependency — uses browser's built-in voices." },
  { icon: Search,       name: "Cheerio + BeautifulSoup",             type: "HTML Scraping",       desc: "Cheerio (Node/TypeScript) handles council.nyc.gov, nyassembly.gov, and  house.gov scraping. BeautifulSoup (Python) handles RSS and supplementary HTML sources in the pipeline." },
  { icon: Map,          name: "react-simple-maps + Leaflet.js",      type: "Mapping",             desc: "react-simple-maps renders the NYC Council district choropleth (GeoJSON projection). Leaflet.js (dynamically imported) renders the Civic Hub map with pins and toggleable boundary layers." },
  { icon: Zap,          name: "Groq Cloud — Llama 3.1 8B",           type: "Inference Engine",    desc: "RAG-grounded responses and structured briefings. Sub-second inference via Groq's LPU hardware. Handles structured JSON (Policy Synthesis sections) and plain markdown (Ask Spiegel chat)." },
  { icon: Bot,          name: "OpenAI GPT-4o-mini",                  type: "Fallback LLM",        desc: "Used when Groq/RAG returns insufficient context (retrieval_tier='none'). Two paths: /api/llm/chat (direct, for /chat page) and /api/civic/floating-chat orchestration (fallback when RAG fails)." },
  { icon: Layers,       name: "Neon Serverless Postgres + pgvector", type: "Vector Database",     desc: "Serverless Postgres with pgvector extension. Stores 384-dimension float32 embeddings in DocumentChunk rows alongside plain text, enabling cosine-similarity search without a separate vector store." },
  { icon: Cpu,          name: "FastEmbed — BAAI/bge-small-en-v1.5",  type: "Embedding Engine",    desc: "ONNX-based embedding model generating 384-dim vectors at ingest time (pipeline) and query time (backend). Falls back to HuggingFace Inference API when local model is unavailable." },
  { icon: ShieldCheck,  name: "spaCy NLP Pipeline",                 type: "Classification Layer", desc: "en_core_web_sm model used in tag_classifier.py to extract named entities (politicians, agencies, locations). Also used for keyword classification of documents into policy areas and affected demographics." },
  { icon: RefreshCw,    name: "GitHub Actions (×2 workflows)",       type: "Automation & CI",     desc: "Two scheduled workflows run daily at 06:00 UTC: run_pipeline.yml ingests new legislative documents into Neon; refresh-politicians.yml scrapes fresh member data and commits politicians.json to the repo." },
];


// DATA PIPELINE =====================================================================
const pipelineSteps = [
  {  n: "1",	title: "Scrape & Fetch",	color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",		  body: "GitHub Actions triggers daily. Python scrapers hit Legistar, NYS Senate Open Legislation, and NYC Open Data endpoints. TypeScript scrapers fetch member HTML from council, assembly, and senate sites.",},
  {  n: "2",	title: "Extract & Clean",	color: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",	body: "Raw HTML is stripped. PDF transcripts are parsed for plain text. Junk content (empty strings, procedural placeholders) is filtered out in base_scraper.py before any storage occurs.",},
  {  n: "3",	title: "Classify",		  	color: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300",	  body: "tag_classifier.py uses keyword matching and spaCy NER to tag each document with policy areas (Housing, Transit, Budget…), affected demographics, jurisdiction level, and policy stage.",},
  {  n: "4",	title: "Chunk & Embed", 	color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",	body: "Documents are split into ~500-word sentence-aware chunks with 50-word overlap. Each chunk is passed through BAAI/bge-small-en-v1.5 to produce a 384-dim float32 vector.",},
  {  n: "5",	title: "Store",			    	color: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",		  body: "Chunks and their embeddings are inserted into Neon Postgres. Deduplication checks source_url before insert. The politicians.json cache is committed back to the repo.",},
  {  n: "6",	title: "Retrieve",	  		color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300",		  body: "At query time, the user's message (augmented with borough/ZIP context) is embedded and compared via pgvector cosine distance. Falls back to lexical search, then recency, if vector recall is empty.",},
  {  n: "7",	title: "Generate",	  		color: "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300",		  body: "Top chunks are passed to Groq (Llama 3.1 8B) with the user's demographic context. The LLM returns either a structured JSON briefing or plain markdown depending on the interface.",},
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 transition-all group-hover:bg-white group-hover:text-slate-700 group-hover:shadow-sm dark:bg-slate-500/10 dark:text-slate-400 dark:group-hover:bg-(--surface-card) dark:group-hover:text-foreground"
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
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
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
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 pt-32 pb-28 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.14),transparent_58%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.08),transparent_60%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Database className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500">
                  Civic Spiegel
                </span>
              </div>
              <h1 className="mb-5 text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
                <span>Data Sources &amp; Architecture</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Every fact in <em className="font-medium not-italic text-slate-800 dark:text-slate-300">Civic Spiegel</em>{" "}
                traces back to a primary government source. No third-party analysis, no aggregator bias — raw official
                records, indexed and made searchable.
              </p>

              <DataSourcesStatsPanel />
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
                <div className="space-y-1 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-slate-900 dark:shadow-none">
                  {pipelineSteps.map((step, i) => (
                    <div key={step.n} className="group flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.color}`}>
                          {step.n}
                        </div>
                        {i < pipelineSteps.length - 1 && (
                          <div className="my-1 w-px flex-1 bg-slate-200 dark:bg-white/5" />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className="mb-1 text-sm font-bold text-slate-900 dark:text-white">{step.title}</p>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-500">
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
                      <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span>{item.type}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-foreground mb-2">{item.name}</h3>
                      <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary) mb-4">{item.desc}</p>
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
                <div className="rounded-4xl border border-slate-200 bg-white p-7 text-slate-900 shadow-sm dark:border-transparent dark:bg-slate-900 dark:text-white dark:shadow-none">
                  <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
                      <Database className="h-4 w-4" />
                    </span>
                    <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Database Model</h3>
                  </div>
                  <p className="mb-6 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    A single Neon Postgres instance handles relational data and vector search via pgvector — no separate
                    vector store needed.
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
                      <div
                        key={row.table}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/8 dark:bg-white/5"
                      >
                        <code className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{row.table}</code>
                        <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">{row.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionReveal>

              {/* data retrieval */}
              <MotionReveal>
                <div className="rounded-4xl border border-slate-200 bg-white p-7 dark:border-(--border) dark:bg-(--surface-card)">
                  <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-widest text-slate-400">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Search className="h-4 w-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-foreground mb-1">Retrieval Strategy</h3>
                  </div>
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
                  <div className="mb-1 flex items-center gap-2 font-bold uppercase tracking-widest text-slate-400">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <RefreshCw className="h-4 w-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-foreground mb-1">Automated Refresh</h3>
                  </div>
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