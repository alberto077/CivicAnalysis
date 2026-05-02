import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import { Database, FileText, Globe, Link2, Cpu, Zap, Layers, ShieldCheck, ExternalLink, Info } from "lucide-react";

export default function DataSourcesPage() {
  const primarySources = [
    {
      name: "NYC Council Legistar PDF Pipeline",
      type: "Legislative Transcript Ingestion",
      desc: "Our backend pipeline extracts, cleans, and indexes thousands of PDF records from public hearings and committee transcripts for AI-powered retrieval.",
      url: "https://legistar.council.nyc.gov/"
    },
    {
      name: "NYC Council Representatives",
      type: "Local District Directory",
      desc: "Official directory of the 51 Council Members, their districts, and party affiliations used to power our searchable directory.",
      url: "https://council.nyc.gov/districts/"
    },
    {
      name: "NYS Assembly Member Directory",
      type: "State Legislative Data",
      desc: "Comprehensive list of all 150 members of the New York State Assembly, including committee assignments and district office information.",
      url: "https://nyassembly.gov/mem/"
    },
    {
      name: "NYS Senate Portal",
      type: "State Legislative Data",
      desc: "Official portal for the New York State Senate, providing access to senator profiles, committee listings, and legislative calendars.",
      url: "https://www.nysenate.gov/"
    },
    {
      name: "NYS Board of Elections Reporting",
      type: "State Elected Officials",
      desc: "Official public reporting for all state-level elected officials, providing transparency into electoral cycles and membership.",
      url: "https://publicreporting.elections.ny.gov/ElectedOfficials/ElectedOfficials"
    },
    {
      name: "NYS Board of Elections Interactive Map",
      type: "Geospatial Boundary Data",
      desc: "High-fidelity ArcGIS map layer displaying Congressional, State Senate, and Assembly districts.",
      url: "https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e"
    },
    {
      name: "NYC Council Legistar API",
      type: "Official Legislative Records",
      desc: "Official API for Intro bills, Resolutions, and Committee voting records.",
      url: "https://council.nyc.gov/data/legislative-api/"
    },
    {
      name: "NYS Senate Open Legislation",
      type: "State Legislative API",
      desc: "Official API for New York State Senate bills and resolutions, enabling real-time tracking of state-level policy changes.",
      url: "https://legislation.nysenate.gov/"
    }
  ];

  const federalSources = [
    {
      name: "GovTrack NY Congressional Delegation",
      type: "Federal Legislative Tracking",
      desc: "Independent tracking of New York's 26 House members and 2 Senators, including voting records and sponsorship data.",
      url: "https://www.govtrack.us/congress/members/NY"
    },
    {
      name: "NY State Congressional Delegation (NY.gov)",
      type: "Official Federal Directory",
      desc: "Official state-maintained directory of New York's representation in the United States Congress.",
      url: "https://www.ny.gov/new-york-state-congressional-delegation"
    },
    {
      name: "U.S. House of Representatives",
      type: "Federal Directory",
      desc: "Official member directory for the United States House of Representatives.",
      url: "https://www.house.gov/representatives"
    }
  ];

  const infrastructure = [
    {
      name: "Groq Cloud API",
      type: "Inference Engine",
      desc: "Powers our RAG summaries using Llama 3.1 8B, delivering sub-second response times for complex civic queries.",
      icon: Zap,
      url: "https://groq.com/"
    },
    {
      name: "Neon Postgres",
      type: "Vector Database",
      desc: "Serverless Postgres with pgvector, storing thousands of high-dimensional embeddings for semantic search.",
      icon: Layers,
      url: "https://neon.tech/"
    },
    {
      name: "FastEmbed (BGE-Small)",
      type: "Embedding Engine",
      desc: "Utilizes BAAI/bge-small-en-v1.5 to generate semantic vectors at ingest time, optimized for civic text.",
      icon: Cpu,
      url: "https://qdrant.github.io/fastembed/"
    },
    {
      name: "spaCy & NLP Pipeline",
      type: "Classification Layer",
      desc: "Custom ML models in tag_classifier.py that categorize legislation into policy areas like Housing, Transit, and Education.",
      icon: ShieldCheck,
      url: "https://spacy.io/"
    }
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1 pb-20">
        <div className="bg-slate-900 pt-32 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MotionReveal>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                  <Database className="h-6 w-6" />
                </div>
                <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                  Data Transparency
                </h1>
              </div>
              <p className="max-w-2xl text-lg text-slate-400 leading-relaxed">
                Civic Spiegel is built on publicly available, primary data sources. We do not use third-party analysis; we go straight to the official record to power our RAG search engine.
              </p>
            </MotionReveal>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-16">
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Legislative & Representative Portals</h2>
                </div>
                <div className="grid gap-6">
                  {primarySources.map((source) => (
                    <div key={source.name} className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                              {source.type}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">{source.name}</h3>
                          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">{source.desc}</p>
                        </div>
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Info className="h-5 w-5 text-purple-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Federal Directories</h2>
                </div>
                <div className="grid gap-6">
                  {federalSources.map((source) => (
                    <div key={source.name} className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-purple-200 hover:shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                              {source.type}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">{source.name}</h3>
                          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">{source.desc}</p>
                        </div>
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-all"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Cpu className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-2xl font-bold text-slate-900">Technical Infrastructure</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {infrastructure.map((item) => (
                    <div key={item.name} className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition hover:shadow-md">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg mb-1">{item.name}</h3>
                      <div className="text-[10px] font-bold uppercase tracking-tighter text-emerald-600 mb-3">{item.type}</div>
                      <p className="text-slate-500 text-sm leading-relaxed mb-6">{item.desc}</p>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition flex items-center gap-1">
                        Documentation <Link2 className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-xl">
                <Zap className="h-8 w-8 text-blue-400 mb-6" />
                <h2 className="text-xl font-bold mb-4">Pipeline Intelligence</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">1</div>
                    <div>
                      <p className="font-bold text-sm mb-1">Automated Scraping</p>
                      <p className="text-xs text-slate-400 leading-relaxed">Daily routines fetch the latest PDF transcripts and meeting minutes from Legistar.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">2</div>
                    <div>
                      <p className="font-bold text-sm mb-1">OCR & Text Extraction</p>
                      <p className="text-xs text-slate-400 leading-relaxed">Scanned documents are converted to machine-readable text and structured formats.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">3</div>
                    <div>
                      <p className="font-bold text-sm mb-1">Vector Indexing</p>
                      <p className="text-xs text-slate-400 leading-relaxed">Content is chunked and indexed into our vector database for semantic search.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">4</div>
                    <div>
                      <p className="font-bold text-sm mb-1">AI-Augmented Retrieval</p>
                      <p className="text-xs text-slate-400 leading-relaxed">Our RAG pipeline combines real legislative text with AI to answer complex queries.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-8">
                <Globe className="h-6 w-6 text-emerald-600 mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">Geospatial Boundaries</h3>
                <p className="text-sm text-slate-500 mb-6">We use official shapefiles and lookup services to ensure your district representation is accurate.</p>
                <div className="space-y-4">
                  <a href="https://nysboe.maps.arcgis.com/apps/instant/lookup/index.html?appid=0a08fa8c5ea2400d86ab65daa5aa4f0e" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
                       <span className="text-xs font-bold text-slate-700">NYS Board of Elections Map</span>
                       <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-emerald-600" />
                  </a>
                  <a href="https://www.ballotready.org/us/new-york" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
                       <span className="text-xs font-bold text-slate-700">BallotReady NY</span>
                       <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-emerald-600" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
