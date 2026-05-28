"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";
import { useProfile } from "@/lib/useProfile";
import { getRecentPolicies, type PolicyBriefing } from "@/lib/api";
import { buildGeneralizedBriefingFromPolicies } from "@/lib/generalized-briefing";
import { normalizePolicyReply, parseRetrievalSourcesEnvelope, type PolicyResponse } from "@/lib/policy-reply";
import { BarChart3, Newspaper } from "lucide-react";
import { EMPTY_CONTEXT, type HeroContext } from "@/components/civiq/Hero";


const Hero = dynamic(
  () => import("@/components/civiq/Hero").then((m) => m.Hero),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-slate-100/50" /> },
);

const PolicyBriefingPanel = dynamic(
  () => import("@/components/civiq/PolicyBriefingPanel").then((m) => m.PolicyBriefingPanel),
  { ssr: false },
);

const DigestCards = dynamic(
  () => import("@/components/civiq/DigestCards").then((m) => m.DigestCards),
  { ssr: false },
);

const RecentUpdates = dynamic(
  () => import("@/components/civiq/RecentUpdates").then((m) => m.RecentUpdates),
  { ssr: false },
);


// session cache
function cacheKey(query: string, ctx: HeroContext, personalized: boolean): string {
  return JSON.stringify({ query, ctx, personalized });
}

function getCached(key: string): PolicyResponse | null {
  try {
    const raw = sessionStorage.getItem(`briefing:${key}`);
    return raw ? (JSON.parse(raw) as PolicyResponse) : null;
  } catch { return null; }
}

function setCached(key: string, data: PolicyResponse): void {
  try { sessionStorage.setItem(`briefing:${key}`, JSON.stringify(data)); } catch { }
}


type ActiveTab = "briefings" | "legislation";

function timeframeToDays(t: string): number | undefined {
  if (t === "Last 30 days") return 30;
  if (t === "Last 6 months") return 180;
  if (t === "Last year") return 365;
  return undefined;
}

function buildLlmQuery(query: string, ctx: HeroContext, personalized: boolean): string {
  let q = query.trim();
  if (!q) {
    const area = ctx.issue ? ctx.issue : "recent NYC policy";
    q = `What are the most important recent developments in ${area} for NYC residents? Summarize what happened, why it matters, who is affected, and what comes next.`;
  }
  const parts: string[] = [];
  if (ctx.location) parts.push(`in ${ctx.location}`);
  if (ctx.housing) parts.push(`who ${ctx.housing.toLowerCase()}`);
  if (ctx.whoami.length) parts.push(`who ${ctx.whoami.join(", ").toLowerCase()}`);
  if (parts.length) q += ` Focus on residents ${parts.join(", ")}.`;
  return q;
}

function buildDemographics(ctx: HeroContext): Record<string, string> {
  const d: Record<string, string> = {};
  if (ctx.location) d.borough = ctx.location;
  if (ctx.housing) d.housing = ctx.housing;
  if (ctx.whoami.length) d.demographics = ctx.whoami.join(",");
  if (ctx.issue) d.issues = ctx.issue;
  if (ctx.timeframe) d.timeframe = ctx.timeframe;
  if (Object.keys(d).length) d.profile_active = "true";
  return d;
}

function buildFilterSummary(ctx: HeroContext, personalized: boolean): string {
  const parts: string[] = [];
  if (ctx.location) parts.push(ctx.location);
  if (ctx.issue) parts.push(ctx.issue.split(" ").slice(0, 2).join(" "));
  if (ctx.timeframe) parts.push(ctx.timeframe);
  if (personalized) parts.push("For Me");
  return parts.join(" · ") || "All NYC";
}



function TabBar({ active, setActive }: { active: ActiveTab; setActive: (t: ActiveTab) => void }) {
  const tabs: { id: ActiveTab; label: string; icon: any }[] = [
    { id: "briefings", label: "Issue Briefings", icon: Newspaper },
    { id: "legislation", label: "Recent Legislation", icon: BarChart3 },
  ];
  return (
    <div className="flex gap-1 p-1 rounded-xl border border-[var(--border)] bg-slate-100/80 dark:bg-[var(--surface-elevated)]/60 w-fit">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => setActive(id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${active === id
            ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/20"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}>
          <Icon className="h-3.5 w-3.5" />{label}
        </button>
      ))}
    </div>
  );
}


export function HomeShell() {
  const [query, setQuery] = useState("");
  const [context, setContext] = useState<HeroContext>(EMPTY_CONTEXT);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("briefings");

  // profile
  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // snapshot (instant, no LLM)
  const [digestPolicies, setDigestPolicies] = useState<PolicyBriefing[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [generalizedBriefing, setGeneralizedBriefing] = useState<PolicyResponse | null>(null);

  // LLM briefing
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmResponse, setLlmResponse] = useState<PolicyResponse | null>(null);
  const [briefingQuery, setBriefingQuery] = useState("");

  // onboarding
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;
    if (profile) localStorage.removeItem("civic_profile_skipped");
    else if (!localStorage.getItem("civic_profile_skipped")) setShowOnboarding(true);
  }, [isLoaded, profile]);

  // static snapshot
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setSnapshotLoading(true);
    setSnapshotError(null);

    const borough = context.location || (isPersonalized && profile?.borough) || undefined;
    const area = context.issue || undefined;
    const days = timeframeToDays(context.timeframe);

    getRecentPolicies(borough, area, days).then(({ policies }) => {
      if (cancelled) return;
      setDigestPolicies(policies);
      setGeneralizedBriefing(buildGeneralizedBriefingFromPolicies(policies, {
        selectedArea: context.issue || "All",
        locationLabel: borough ?? "All NYC",
        timeLabel: context.timeframe || "All Time",
      }));
    }).catch(e => {
      if (cancelled) return;
      setSnapshotError(e instanceof Error ? e.message : "Could not load records");
    }).finally(() => { if (!cancelled) setSnapshotLoading(false); });

    return () => { cancelled = true; };
  }, [isLoaded, context.location, context.issue, context.timeframe, isPersonalized, profile]);

  // LLM briefing
  const fireLlm = useCallback(async (q: string, ctx: HeroContext, personalized: boolean) => {
    const key = cacheKey(q, ctx, personalized);
    const cached = getCached(key);
    if (cached) {
      setLlmResponse(cached);
      setBriefingQuery(q || buildFilterSummary(ctx, personalized));
      return;
    }

    const llmQuery = buildLlmQuery(q, ctx, personalized);
    const demographics = buildDemographics(ctx);
    setBriefingQuery(q || buildFilterSummary(ctx, personalized));
    setLlmLoading(true);
    setLlmError(null);
    setLlmResponse(null);

    try {
      const res = await fetch("/api/civic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: llmQuery, demographics, response_style: "structured" }),
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
      }
      const envelope = await res.json() as Record<string, unknown>;
      const payload = "reply" in envelope ? envelope.reply : envelope;
      const normalized = normalizePolicyReply(payload);
      const retrieval_sources = parseRetrievalSourcesEnvelope(envelope, 12);
      const su = envelope.sources_used;
      const result: PolicyResponse = {
        ...normalized,
        retrieval_sources,
        sources_used: typeof su === "number" ? su : retrieval_sources.length,
      };
      setCached(key, result);
      setLlmResponse(result);
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : "Briefing failed");
    } finally {
      setLlmLoading(false);
    }
  }, []);

  // search handler
  const handleSearch = useCallback(() => {
    if (!query.trim() && !context.issue && !context.location) return;
    setActiveTab("briefings");
    fireLlm(query, context, isPersonalized);
  }, [query, context, isPersonalized, fireLlm]);

  // digest card click
  const handleCardClick = useCallback((policy: PolicyBriefing) => {
    const q = `What does "${policy.title}" mean for NYC residents? Who is affected and what should they know?`;
    setQuery(q);
    setActiveTab("briefings");
    fireLlm(q, context, isPersonalized);
  }, [context, isPersonalized, fireLlm]);

  const filterSummary = useMemo(
    () => buildFilterSummary(context, isPersonalized),
    [context, isPersonalized],
  );

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)] dark:bg-[rgba(90,110,140,0.15)]" aria-hidden />
      <div className="ambient-orb bottom-10 left-[20%] h-64 w-64 bg-[rgba(26,54,93,0.10)] dark:bg-[rgba(60,75,98,0.12)]" aria-hidden />

      <OnboardingModal
        isOpen={showOnboarding}
        initialProfile={profile}
        onSave={(data) => {
          if (typeof window !== "undefined") localStorage.removeItem("civic_profile_skipped");
          saveProfile(data);
          setShowOnboarding(false);
          // Auto-enable "For Me" after onboarding
          setIsPersonalized(true);
        }}
        onSkip={() => {
          localStorage.setItem("civic_profile_skipped", "true");
          setShowOnboarding(false);
        }}
      />

      <Header />

      <main className="relative z-10 mt-10 flex-1">
        <Hero
          query={query}
          onQueryChange={setQuery}
          loading={llmLoading}
          onSearch={handleSearch}
          context={context}
          onContextChange={setContext}
          isPersonalized={isPersonalized}
          onPersonalizedChange={setIsPersonalized}
          profile={profile}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 pb-16 space-y-6">
          <TabBar active={activeTab} setActive={setActiveTab} />

          {activeTab === "briefings" ? (
            <div className="space-y-6">
              {/* digest cards */}
              <DigestCards
                policies={digestPolicies}
                loading={snapshotLoading}
                onCardClick={handleCardClick}
              />

              {/* briefing - snapshot or LLM result */}
              <PolicyBriefingPanel
                loading={llmLoading}
                error={llmError}
                response={llmResponse}
                briefingQuery={briefingQuery}
                snapshotLoading={snapshotLoading}
                snapshotError={snapshotError}
                generalizedBriefing={generalizedBriefing}
                filterSummary={filterSummary}
              />
            </div>
          ) : (
            <RecentUpdates
              context={context}
              isPersonalized={isPersonalized}
              profile={profile}
            />
          )}
        </div>
      </main>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <SiteFooter />
    </div>
  );
}