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
  { label: "State Senate", count: "59 members", desc: "Upper chamber, judicial confirmations, budget oversight", color: "bg-amber-500" },
  { label: "U.S. House", count: "26 NY members", desc: "Federal laws, appropriations, constituent services", color: "bg-purple-500" },
  { label: "U.S. Senate", count: "2 NY senators", desc: "Federal legislation, treaties, cabinet confirmations", color: "bg-violet-500" },
];

const features = [
  {
    icon: MessageSquare,
    title: "Policy Briefings & Chat with Speigel",
    desc: "Ask anything about NYC or NYS policy. The RAG engine retrieves relevant hearing transcripts, bills, and meeting records, then Llama 3.1 synthesizes a direct answer with citations.",
    href: "/",
    accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    tag: "Most used",
  },
  {
    icon: Users,
    title: "Representatives Directory",
    desc: "290+ elected officials across City Council, State Assembly, State Senate, US House, and US Senate — searchable by borough, district, party, committee, and caucus.",
    href: "/representatives",
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    tag: null,
  },
  {
    icon: Map,
    title: "Civic Hub & Explore Maps",
    desc: "Interactive maps showing NYC council districts, borough boundaries, NYS legislative districts, and congressional districts. Look up your representatives by address.",
    href: "/map",
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    tag: null,
  },
  {
    icon: BookOpen,
    title: "Civic Calendar & Resources",
    desc: "Direct links to all public meeting calendars, hearing schedules, and Council livestreams — from City Council to NYS Senate, in one place.",
    href: "/calendar",
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    tag: null,
  },
  {
    icon: Database,
    title: "Data Sources",
    desc: "Full transparency into every data source, API, and pipeline powering the platform. Primary government records only.",
    href: "/data-sources",
    accent: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    tag: null,
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
    text: "Every fact traces to an official government record — no aggregator bias, no AI hallucinations, no paraphrased summaries from third parties.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  },
  {
    icon: Target,
    title: "Hyper-Local Context",
    text: "RAG retrieval is augmented with your query and location input, so results surface the policies that affect you — not just citywide headlines.",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    icon: Zap,
    title: "Live & Automated",
    text: "Our GitHub Actions workflows run every morning. The representative directory and legislative corpus are refreshed daily from official APIs — no stale data.",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  },
  {
    icon: Users,
    title: "Clear Information",
    text: "Legislation is dense. The AI layer translates long records and complex language into clear, actionable takeaways without losing the underlying facts.",
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
                NY Civic Research Assistant
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div>
                  <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl mb-5 leading-tight">
                    <span className="text-white">A mirror for</span> <br /> <span className="text-blue-400">NY government.</span>
                  </h1>
                  <p className="text-base leading-relaxed text-slate-400 mb-6">
                    <em className="text-slate-300 not-italic font-medium">Spiegel</em> is German for <em className="text-slate-300 not-italic font-medium">mirror</em>.
                  </p>
                  <p className="text-base leading-relaxed text-slate-400 mb-6">
                    Our platform, <em className="text-slate-300 not-italic font-medium">Civic Spiegel</em>, holds a clear, undistorted, and nonpartisan reflection of NYC and NYS government back to the people it represents.
                  </p>
                  <div className="flex flex-wrap gap-3">
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
                </div>

                {/* problem + solution */}
                <div className="space-y-3 lg:pt-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-6">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">The problem</div>
                    <p className="text-sm leading-relaxed text-slate-400">
                      NYC and NYS lawmakers generate thousands of pages of legislation, transcripts, hearing minutes, and committee reports every month — spread across a dozen different portals, each with their own formats and search interfaces.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-500/25 bg-blue-500/8 p-6">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">The solution</div>
                    <p className="text-sm leading-relaxed text-slate-300">
                      We scrape official sources daily, embed the text into a vector database, and surface the most relevant records when you ask a question. The LLM answers directly from retrieved official documents, with citations — no hallucination.
                    </p>
                  </div>
                </div>
              </div>
            </MotionReveal>
          </div>
        </section>

        {/* TWO-COLUMN MAIN BODY */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-slate-50 dark:bg-(--surface-card)">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">

              {/* LEFT: Site Features + Reps Covered */}
              <div className="space-y-10">

                {/* Features */}
                <MotionReveal>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-foreground mb-1">Features</h2>
                  <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mb-5">Free to use, no account required.</p>
                  <div className="space-y-2">
                    {features.map((f) => (
                      <a
                        key={f.title}
                        href={f.href}
                        className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-slate-300 hover:shadow-sm dark:border-(--border) dark:bg-background dark:hover:border-(--accent)/40"
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${f.accent}`}>
                          <f.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-foreground">{f.title}</span>
                            {f.tag && (
                              <span className="rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                {f.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">{f.desc}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-1 text-slate-300 group-hover:text-slate-500 dark:group-hover:text-foreground transition-colors" />
                      </a>
                    ))}
                  </div>
                </MotionReveal>

                {/* brief about on what site covers */}
                <MotionReveal>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-foreground mb-1">Representatives We Cover (Legislative)</h2>
                  <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mb-5">
                    Every New Yorker is simultaneously represented at five levels of government.
                  </p>
                  <div className="space-y-2">
                    {govLevels.map(g => (
                      <div key={g.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 dark:border-(--border) dark:bg-background">
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

              {/* RIGHT: values + Built in the Open */}
              <div className="space-y-8">

                {/* values */}
                <MotionReveal>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-foreground mb-1">Purpose + Values</h2>
                  <p className="text-xs text-slate-500 dark:text-(--foreground-secondary) mb-5">Behind every technical decision.</p>
                  <div className="space-y-3">
                    {values.map((v) => (
                      <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-(--border) dark:bg-background">
                        <span className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl ${v.color}`}>
                          <v.icon className="h-4 w-4" />
                        </span>
                        <span className="ml-3 font-bold text-slate-900 dark:text-foreground text-sm mb-1.5">
                          {v.title}
                        </span>
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">{v.text}</p>
                      </div>
                    ))}
                  </div>
                </MotionReveal>

                {/* tech stack */}
                <MotionReveal>
                  <div className="rounded-2xl bg-slate-900 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <GitBranch className="h-4 w-4 text-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tech Stack</span>
                    </div>
                    <div className="space-y-2.5 mb-5">
                      {techStack.map(t => (
                        <div key={t.label} className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">{t.label}</span>
                          <span className="text-xs text-white text-right">{t.value}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href="/data-sources"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Full architecture breakdown <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </MotionReveal>

              </div>
            </div>
          </div>
        </section>

        {/* buttons to pages */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <MotionReveal>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-foreground mb-3">Start exploring</h2>
              <p className="text-slate-500 dark:text-(--foreground-secondary) text-sm mb-8">
                Ask about policies, find your representatives, or explore district boundaries — no account needed.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-foreground px-6 py-3 text-sm font-bold text-white dark:text-background transition hover:opacity-80"
                >
                  Get Policy Briefings <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="/representatives" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-(--border) dark:bg-background px-6 py-3 text-sm font-bold text-slate-900 dark:text-foreground transition hover:border-slate-600">
                  View Representatives <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/map" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-(--border) dark:bg-background px-6 py-3 text-sm font-bold text-slate-900 dark:text-foreground transition hover:border-slate-600">
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