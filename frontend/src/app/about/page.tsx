import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import {
  Shield, Target, Users, Zap, ArrowRight, Database,
  GitBranch, Map, MessageSquare, BookOpen, ExternalLink,
} from "lucide-react";
import Link from "next/link";


// ==================================================================================
const govLevels = [
  { label: "City Council", count: "51 members", desc: "Local laws, city budget, zoning, sanitation, parks", color: "bg-blue-500" },
  { label: "State Assembly", count: "150 members", desc: "State legislation, education, labor, state budget", color: "bg-emerald-500" },
  { label: "State Senate", count: "63 members", desc: "Upper chamber, judicial confirmations, budget oversight", color: "bg-amber-500" },
  { label: "U.S. House", count: "26 NY members", desc: "Federal laws, appropriations, constituent services", color: "bg-purple-500" },
  { label: "U.S. Senate", count: "2 NY senators", desc: "Federal legislation, treaties, cabinet confirmations", color: "bg-violet-500" },
];

const features = [
  {
    icon: MessageSquare,
    title: "AI Policy Briefings & Chat",
    desc: "Ask anything about NYC or NYS policy. The RAG engine retrieves relevant hearing transcripts, bills, and meeting records, then Llama 3.1 synthesizes a direct answer with citations.",
    href: "/",
  },
  {
    icon: Users,
    title: "Representatives Directory",
    desc: "290+ elected officials across City Council, State Assembly, State Senate, US House, and US Senate — searchable by borough, district, party, committee, and caucus.",
    href: "/representatives",
  },
  {
    icon: Map,
    title: "Civic Hub & Explore Maps",
    desc: "Interactive maps showing NYC council districts, borough boundaries, NYS legislative districts, and congressional districts. Look up your representatives by address.",
    href: "/map",
  },
  {
    icon: BookOpen,
    title: "Civic Calendar",
    desc: "Direct links to all public meeting calendars, hearing schedules, and Council livestreams — from City Council to NYS Senate, in one place.",
    href: "/calendar",
  },
  {
    icon: Database,
    title: "Data Sources",
    desc: "Full transparency into every data source, API, and technical decision powering the platform. Primary government records only.",
    href: "/data-sources",
  },
];

const techStack = [
  { label: "Frontend", value: "Next.js 14 + Tailwind CSS" },
  { label: "Backend", value: "FastAPI (Python)" },
  { label: "Database", value: "Neon Postgres + pgvector" },
  { label: "Embeddings", value: "BAAI/bge-small-en-v1.5 (384-dim)" },
  { label: "LLM", value: "Llama 3.1 8B via Groq Cloud" },
  { label: "Scraping", value: "Cheerio (TS) + BeautifulSoup (Py)" },
  { label: "Automation", value: "GitHub Actions (daily)" },
  { label: "Hosting", value: "Vercel (frontend) + Render (backend)" },
];

const values = [
  {
    icon: Shield,
    title: "Primary Sources Only",
    text: "Every fact traces to an official government record — Legistar transcripts, NYS Open Legislation, House.gov. No aggregator bias, no paraphrased summaries from third parties.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    icon: Target,
    title: "Hyper-Local Context",
    text: "RAG retrieval is augmented with your ZIP code, borough, and neighborhood so query results surface the policies that actually affect your block — not just citywide headlines.",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    icon: Zap,
    title: "Live & Automated",
    text: "Two GitHub Actions workflows run every morning. The representative directory and legislative corpus are refreshed daily from official APIs — no stale data sitting in a spreadsheet.",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    icon: Users,
    title: "Plain Language",
    text: "Legislation is dense. The AI layer exists specifically to translate complex bill language and committee transcripts into clear, actionable takeaways without losing the facts.",
    color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  },
];



// ==================================================================================
export default function AboutPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-background">
      <Header />
      <main className="relative z-10 flex-1">

        {/* HERO */}
        <section className="relative bg-slate-900 px-4 pt-32 pb-24 overflow-hidden sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.07),transparent_55%)]" />
          <div className="mx-auto max-w-5xl relative">
            <MotionReveal>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                New York Civic Intelligence Platform
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl mb-6 leading-tight">
                Government data,<br />
                <span className="text-blue-400">made legible.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-400">
                Civic Spiegel connects New York residents to the legislative records, representatives, and
                civic events that shape their lives — sourced directly from government APIs, indexed by AI,
                and made searchable without a law degree.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400"
                >
                  Get Policy Briefings <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="/data-sources"
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  View Data Sources
                </a>
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* problem + solution */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-slate-50 dark:bg-(--surface-card)">
          <div className="mx-auto max-w-5xl">
            <MotionReveal>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-4xl border border-slate-200 bg-white p-8 dark:border-(--border) dark:bg-background">
                  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">The Problem</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-foreground mb-3">Too much data, no clear signal</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">
                    NYC and NYS generate thousands of pages of legislative transcripts, hearing minutes, and committee reports every month. Staying informed about what your local government is actually doing requires navigating a dozen different portals, each with their own formats, search interfaces, and update schedules.
                  </p>
                </div>
                <div className="rounded-4xl border border-blue-100 bg-blue-50/50 p-8 dark:border-blue-500/20 dark:bg-blue-500/5">
                  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">The Solution</div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-foreground mb-3">One search, all levels of government</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">
                    We scrape primary sources daily, chunk and embed the text into a vector database, and surface the most relevant records when you ask a question. The LLM doesn&apos;t hallucinate facts — it answers directly from retrieved official documents, with citations.
                  </p>
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* values */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <MotionReveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-2">What we stand for</h2>
              <p className="text-slate-500 dark:text-(--foreground-secondary) mb-10 text-sm">Four principles guide every technical decision.</p>
            </MotionReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((v) => (
                <MotionReveal key={v.title}>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 h-full dark:border-(--border) dark:bg-(--surface-card)">
                    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${v.color}`}>
                      <v.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-foreground mb-2">{v.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">{v.text}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* brief about on what site covers */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-slate-50 dark:bg-(--surface-card)">
          <div className="mx-auto max-w-5xl">
            <MotionReveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-2">What we cover</h2>
              <p className="text-sm text-slate-500 dark:text-(--foreground-secondary) mb-8">
                Every New York resident is simultaneously represented at five levels of government.
              </p>
              <div className="space-y-3">
                {govLevels.map(g => (
                  <div key={g.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-(--border) dark:bg-background">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${g.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-bold text-slate-900 dark:text-foreground text-sm">{g.label}</span>
                        <span className="text-[11px] font-bold text-slate-400">{g.count}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mt-0.5">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* site features */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <MotionReveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-2">Platform features</h2>
              <p className="text-sm text-slate-500 dark:text-(--foreground-secondary) mb-10">Everything on Civic Spiegel is free and requires no account.</p>
            </MotionReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <MotionReveal key={f.title}>
                  <a
                    href={f.href}
                    className="group flex flex-col h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-md dark:border-(--border) dark:bg-(--surface-card) dark:hover:border-(--accent)/40"
                  >
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-(--surface-elevated) dark:text-(--foreground-secondary)">
                      <f.icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-(--foreground-secondary) flex-1">{f.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-foreground transition-colors">
                      Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </a>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        {/* tech stack */}
        <section className="bg-slate-900 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <MotionReveal>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Built in the open</h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    The full stack from scraper to frontend. No black-box APIs sitting between you and the data — the pipeline is transparent and documented on the Data Sources page.
                  </p>
                  <a
                    href="/data-sources"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Full architecture breakdown <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="rounded-4xl bg-white/5 border border-white/8 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <GitBranch className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stack</span>
                  </div>
                  <div className="space-y-3">
                    {techStack.map(t => (
                      <div key={t.label} className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 shrink-0">{t.label}</span>
                        <span className="text-sm text-white text-right">{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* buttons to pages */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 bg-slate-50 dark:bg-(--surface-card)">
          <div className="mx-auto max-w-2xl text-center">
            <MotionReveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-3">Start exploring</h2>
              <p className="text-slate-500 dark:text-(--foreground-secondary) text-sm mb-8">
                Ask about housing policy, find your representatives, or explore district boundaries — no account needed.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-foreground px-6 py-3 text-sm font-bold text-white dark:text-background transition hover:opacity-90"
                >
                  Get Policy Briefings <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="/representatives" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-(--border) dark:bg-background px-6 py-3 text-sm font-bold text-slate-900 dark:text-foreground transition hover:border-slate-300">
                  View Representatives <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/map" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-(--border) dark:bg-background px-6 py-3 text-sm font-bold text-slate-900 dark:text-foreground transition hover:border-slate-300">
                  Explore Maps <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </MotionReveal>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}