import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import { Database, FileText, Globe, Link2, Cpu, Zap, Layers, ShieldCheck } from "lucide-react";

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
      name: "NYS Board of Elections Public Reporting",
      type: "State Elected Officials",
      desc: "Official directory and public reporting for State Senate, Assembly, and other elected officials in New York State.",
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
    },
    {
      name: "NYC Open Data Portal",
      type: "Structured Datasets",
      desc: "Open government datasets used to seed baseline district attributes and committee metadata.",
      url: "https://opendata.cityofnewyork.us/"
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
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-slate-50">
      <Header />
      <main className="relative z-10 flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <MotionReveal>
            <h1 className="font-display text-4xl font-bold text-slate-900 mb-4">Data Transparency</h1>
            <p className="text-lg text-slate-600 mb-12">Civic Spiegel is built on publicly available, primary data sources. We do not use third-party analysis; we go straight to the official record.</p>
          </MotionReveal>

          <section className="mb-20">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <Globe className="h-6 w-6 text-indigo-500" />
              Primary Data Sources
            </h2>
            <div className="grid gap-6">
              {primarySources.map((s, i) => (
                <MotionReveal key={i} className="glass-card flex flex-col md:flex-row items-start md:items-center justify-between p-8 rounded-[2.5rem] border border-white/60 bg-white/70 shadow-sm transition hover:shadow-md">
                  <div className="flex gap-6 items-center">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <Database className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xl">{s.name}</h3>
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">{s.type}</span>
                      <p className="mt-2 text-slate-600 text-sm max-w-md">{s.desc}</p>
                    </div>
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 md:mt-0 flex items-center gap-2 text-sm font-bold text-slate-900 bg-white border border-slate-200 px-6 py-3 rounded-2xl hover:bg-slate-50 transition"
                  >
                    <Link2 className="h-4 w-4" />
                    Source
                  </a>
                </MotionReveal>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-emerald-500" />
              Technical Infrastructure
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {infrastructure.map((item, i) => (
                <MotionReveal key={i} className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{item.name}</h3>
                  <div className="text-[10px] font-bold uppercase tracking-tighter text-emerald-600 mb-3">{item.type}</div>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">{item.desc}</p>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition flex items-center gap-1">
                    Documentation <Link2 className="h-3 w-3" />
                  </a>
                </MotionReveal>
              ))}
            </div>
          </section>

          <div className="mt-20 p-12 rounded-[3rem] bg-[linear-gradient(135deg,var(--accent)_0%,#2f5f96_100%)] text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Pipeline Intelligence</h2>
            <p className="text-white/80 max-w-2xl mx-auto text-sm leading-relaxed">
              Our data pipeline runs automated syncs twice daily via GitHub Actions. It extracts text from legislative transcripts, classifies policy areas using our custom ML tagger, and generates high-fidelity embeddings for our RAG-enabled search engine.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
