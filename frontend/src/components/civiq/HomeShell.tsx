"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";
import { useProfile } from "@/lib/useProfile";
import { POLICY_AREAS } from "@/lib/policyMetadata";
import { getRecentPolicies } from "@/lib/api";
import { buildGeneralizedBriefingFromPolicies } from "@/lib/generalized-briefing";
import { normalizePolicyReply, parseRetrievalSourcesEnvelope, type PolicyResponse } from "@/lib/policy-reply";
import {
  ChevronDown, Info, Sparkles, Users, Settings,
  SlidersHorizontal, X, BarChart3, Newspaper,
} from "lucide-react";
import type { CivicProfile } from "@/lib/useProfile";



const Hero = dynamic(
  () => import("@/components/civiq/Hero").then((m) => m.Hero),
  {
    ssr: false,
    loading: () => (
      <section className="relative overflow-hidden pb-16 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-5 h-16 w-full max-w-2xl animate-pulse rounded-2xl bg-slate-200/85 dark:bg-[var(--surface-elevated)]/90" />
        </div>
      </section>
    ),
  },
);

const PolicyBriefingPanel = dynamic(
  () => import("@/components/civiq/PolicyBriefingPanel").then((m) => m.PolicyBriefingPanel),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/50 dark:bg-[var(--surface-card)]/50 border border-[var(--border)]" />
        ))}
      </div>
    ),
  },
);

const VoteTracker = dynamic(
  () => import("@/components/civiq/VoteTracker").then((m) => m.VoteTracker),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/50 dark:bg-[var(--surface-card)]/50 border border-[var(--border)]" />
        ))}
      </div>
    ),
  },
);

// SIDEBAR filter constants

const TIME_RANGES = ["Last 30 Days", "Last 6 Months", "All Time"] as const;
const LOCATIONS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

type ActiveTab = "briefings" | "votes";


function timeframeToDays(t: string): number | undefined {
  if (t === "Last 30 Days") return 30;
  if (t === "Last 6 Months") return 180;
  return undefined;
}

function buildFilterSummary(area: string, location: string, time: string): string {
  const parts: string[] = [];
  if (location !== "All NYC") parts.push(location);
  if (area !== "All") parts.push(area);
  parts.push(time);
  return parts.join(" · ");
}

function buildLlmQuery(
  query: string,
  area: string,
  location: string,
  isPersonalized: boolean,
  profile: CivicProfile | null,
): string {
  // if user typed a query, use it as-is but enrich with context
  if (query.trim()) {
    let q = query.trim();
    if (area !== "All") q += ` (focus on ${area})`;
    if (location !== "All NYC") q += ` in ${location}`;
    return q;
  }
  // filter-driven query (area/location change with no typed query)
  const areaPhrase = area === "All" ? "all NYC policy areas" : area;
  let q = `What are the most important recent developments in ${areaPhrase} for NYC residents? Summarize what happened, why it matters, who is affected, and what comes next.`;
  if (location !== "All NYC") q += ` Focus on ${location}.`;
  if (isPersonalized && profile) {
    const parts: string[] = [];
    if (profile.borough) parts.push(`living in ${profile.borough}`);
    const housing = (profile as any).housing;
    if (housing) parts.push(housing.toLowerCase());
    const demos = (profile as any).demographics as string[] | undefined;
    if (demos?.length) parts.push(demos.join(", ").toLowerCase());
    if (parts.length) q += ` Tailor for residents who are ${parts.join(", ")}.`;
  }
  return q;
}

function buildDemographics(
  location: string,
  isPersonalized: boolean,
  profile: CivicProfile | null,
): Record<string, string> {
  const d: Record<string, string> = {};
  if (location !== "All NYC") d.borough = location;
  if (!isPersonalized || !profile) return d;
  if (profile.borough?.trim()) d.borough = profile.borough.trim();
  if ((profile as any).housing?.trim()) d.housing = (profile as any).housing.trim();
  const issues = profile.issues?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (issues.length) d.issues = issues.join(",");
  const tags = ((profile as any).demographics as string[] | undefined)
    ?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (tags.length) d.demographics = tags.join(",");
  if (Object.keys(d).length) d.profile_active = isPersonalized ? "true" : "false";
  return d;
}


function SidebarSelect<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="font-work-sans w-full cursor-pointer appearance-none rounded-lg border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 px-2.5 py-1.5 pr-7 text-[11px] font-semibold text-[var(--foreground)] shadow-sm outline-none transition hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted)]" />
      </div>
    </div>
  );
}

function PerspectiveToggle({
  isPersonalized, setIsPersonalized, onEditProfile, profile,
}: {
  isPersonalized: boolean;
  setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
  profile: CivicProfile | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
          Perspective
        </span>
        <div className="group relative inline-flex">
          <button type="button" aria-label="How perspective works"
            className="rounded-full p-0.5 text-[var(--muted)] transition hover:text-[var(--foreground)]">
            <Info className="h-2.5 w-2.5" strokeWidth={2} />
          </button>
          <span role="tooltip"
            className="pointer-events-none invisible absolute left-1/2 bottom-full z-[80] mb-2 w-52 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-white/98 dark:bg-[var(--surface-card)]/98 px-3 py-2 text-[10px] leading-relaxed text-[var(--foreground)] shadow-lg opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100">
            <strong>For Me</strong> personalises briefings to your borough and interests.{" "}
            <strong>Everyone</strong> shows city-wide data equally.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 items-center rounded-lg border border-[var(--border)] bg-slate-100/80 dark:bg-[var(--surface-elevated)]/60 p-0.5 gap-0.5 h-[30px]">
          <button type="button" onClick={() => setIsPersonalized(true)}
            className={`flex flex-1 items-center justify-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all h-full ${isPersonalized ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
            <Sparkles className="h-2.5 w-2.5 shrink-0" />For Me
          </button>
          <button type="button" onClick={() => setIsPersonalized(false)}
            className={`flex flex-1 items-center justify-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all h-full ${!isPersonalized ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/10" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
            <Users className="h-2.5 w-2.5 shrink-0" />Everyone
          </button>
        </div>
        <button type="button" onClick={onEditProfile}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 text-[var(--muted)] hover:text-[var(--foreground)] transition-all hover:bg-slate-50 shadow-sm"
          aria-label="Edit Profile">
          <Settings className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function IssueAreaPicker({
  selectedArea, setSelectedArea, profileAreaIds,
}: {
  selectedArea: string;
  setSelectedArea: (v: string) => void;
  profileAreaIds: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">Issue Focus</span>
      <div className="flex flex-col gap-0.5">
        {POLICY_AREAS.map((area) => {
          const Icon = area.Icon;
          const isActive = selectedArea === area.id;
          const isInterest = profileAreaIds.has(area.id);
          return (
            <button key={area.id} type="button" onClick={() => setSelectedArea(area.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-all ${isActive ? "text-white shadow-sm"
                : isInterest ? "bg-amber-50/70 dark:bg-amber-950/15 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70"
                  : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-[var(--surface-elevated)]/50 hover:text-[var(--foreground)]"
                }`}
              style={isActive ? { background: area.color, boxShadow: `0 2px 8px -2px ${area.color}70` } : undefined}>
              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: isActive ? "white" : area.color }} aria-hidden />
              <span className="flex-1 truncate">{area.label}</span>
              {isInterest && !isActive && <Sparkles className="h-2.5 w-2.5 shrink-0 text-amber-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// LEFT SIDEBAR

function SidebarContent({
  selectedLocation, setSelectedLocation,
  selectedTime, setSelectedTime,
  isPersonalized, setIsPersonalized, onEditProfile,
  selectedArea, setSelectedArea,
  profile,
  onAreaSelect, showMobileHeader, onMobileClose,
}: {
  selectedLocation: string; setSelectedLocation: (v: string) => void;
  selectedTime: string; setSelectedTime: (v: string) => void;
  isPersonalized: boolean; setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
  selectedArea: string; setSelectedArea: (v: string) => void;
  profile: CivicProfile | null;
  onAreaSelect?: () => void; showMobileHeader?: boolean; onMobileClose?: () => void;
}) {
  const profileAreaIds = useMemo(() => {
    if (!isPersonalized || !profile) return new Set<string>();
    return new Set<string>(profile.issues ?? []);
  }, [isPersonalized, profile]);

  return (
    <div className="flex h-full flex-col">
      {showMobileHeader && (
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="font-work-sans text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Filters</span>
          <button type="button" onClick={onMobileClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        <SidebarSelect label="Location" value={selectedLocation as any} options={LOCATIONS} onChange={setSelectedLocation as any} />
        <SidebarSelect label="Timeframe" value={selectedTime as any} options={TIME_RANGES} onChange={setSelectedTime as any} />
        <div className="h-px bg-[var(--border)]/40" />
        <PerspectiveToggle
          isPersonalized={isPersonalized}
          setIsPersonalized={setIsPersonalized}
          onEditProfile={onEditProfile}
          profile={profile}
        />

        {/* Profile chip */}
        {isPersonalized && profile && (
          <div className="rounded-xl border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-elevated)]/40 px-3 py-2.5 space-y-1.5">
            <p className="font-work-sans text-[8px] font-black uppercase tracking-widest text-[var(--muted)]">Your profile</p>
            <div className="flex flex-wrap gap-1">
              {profile.borough && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                  {profile.borough}
                </span>
              )}
              {(profile.issues ?? []).slice(0, 3).map((issue) => {
                const meta = POLICY_AREAS.find((a) => a.id === issue);
                return (
                  <span key={issue}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: meta?.color ?? "var(--muted)",
                      background: meta ? `${meta.color}12` : "var(--surface-elevated)",
                      borderColor: meta ? `${meta.color}30` : "var(--border)",
                    }}>
                    {issue.split(" ").slice(0, 2).join(" ")}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="h-px bg-[var(--border)]/40" />
        <IssueAreaPicker
          selectedArea={selectedArea}
          setSelectedArea={(v) => { setSelectedArea(v); onAreaSelect?.(); }}
          profileAreaIds={profileAreaIds}
        />
        <div className="h-4" />
      </div>
    </div>
  );
}

function LeftSidebar(props: {
  selectedLocation: string; setSelectedLocation: (v: string) => void;
  selectedTime: string; setSelectedTime: (v: string) => void;
  isPersonalized: boolean; setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
  selectedArea: string; setSelectedArea: (v: string) => void;
  profile: CivicProfile | null;
  mobileOpen: boolean; onMobileClose: () => void;
}) {
  const { mobileOpen, onMobileClose, ...shared } = props;
  return (
    <>
      {/* Desktop sidebar — natural height, scrolls with page */}
      <aside className="hidden lg:block lg:w-56 xl:w-60 shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] rounded-2xl border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 backdrop-blur-md shadow-sm overflow-hidden">
        <SidebarContent {...shared} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 overflow-hidden bg-white dark:bg-[var(--surface-card)] border-r border-[var(--border)] shadow-2xl lg:hidden">
            <SidebarContent {...shared} showMobileHeader onMobileClose={onMobileClose} onAreaSelect={onMobileClose} />
          </aside>
        </>
      )}
    </>
  );
}

function TabBar({ active, setActive }: { active: ActiveTab; setActive: (t: ActiveTab) => void }) {
  const tabs: { id: ActiveTab; label: string; icon: typeof Newspaper }[] = [
    { id: "briefings", label: "Issue Briefings", icon: Newspaper },
    { id: "votes", label: "Vote Tracker", icon: BarChart3 },
  ];
  return (
    <div className="flex gap-1 p-1 rounded-xl border border-[var(--border)] bg-slate-100/80 dark:bg-[var(--surface-elevated)]/60 w-fit">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => setActive(id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${active === id
            ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/20"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}


export function HomeShell() {
  const [query, setQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All NYC");
  const [selectedTime, setSelectedTime] = useState("Last 30 Days");
  const [isPersonalized, setIsPersonalized] = useState(false); // default: Everyone
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("briefings");

  // profile
  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // briefing state
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [generalizedBriefing, setGeneralizedBriefing] = useState<PolicyResponse | null>(null);
  const [llmResponse, setLlmResponse] = useState<PolicyResponse | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [briefingQuery, setBriefingQuery] = useState("");

  // track last filter combo that generated the snapshot (avoids redundant fetches)
  const lastSnapshotKey = useRef("");

  // onboarding
  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;
    if (profile) {
      localStorage.removeItem("civic_profile_skipped");
    } else if (!localStorage.getItem("civic_profile_skipped")) {
      setShowOnboarding(true);
    }
  }, [isLoaded, profile]);

  // static snapshot, re-fetches when location / timeframe / area / perspective changes.
  const fetchSnapshot = useCallback(async (
    area: string,
    location: string,
    time: string,
    personalized: boolean,
    prof: CivicProfile | null,
  ) => {
    const borough =
      personalized && prof?.borough
        ? prof.borough
        : location !== "All NYC"
          ? location
          : undefined;
    const areaParam = area !== "All" ? area : undefined;
    const days = timeframeToDays(time);
    const key = `${borough ?? ""}|${areaParam ?? ""}|${days ?? ""}`;
    if (key === lastSnapshotKey.current) return;
    lastSnapshotKey.current = key;

    setSnapshotLoading(true);
    setSnapshotError(null);
    // clear LLM result when filters change
    setLlmResponse(null);
    setLlmError(null);
    setBriefingQuery("");

    try {
      const { policies } = await getRecentPolicies(borough, areaParam, days);
      const locationLabel =
        personalized && prof?.borough ? prof.borough : location;
      const snapshot = buildGeneralizedBriefingFromPolicies(policies, {
        selectedArea: area,
        locationLabel,
        timeLabel: time,
      });
      setGeneralizedBriefing(snapshot);
    } catch (e) {
      setSnapshotError(e instanceof Error ? e.message : "Could not load records");
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  // fetch snapshot on mount and when filters change
  useEffect(() => {
    if (!isLoaded) return;
    fetchSnapshot(selectedArea, selectedLocation, selectedTime, isPersonalized, profile);
  }, [selectedArea, selectedLocation, selectedTime, isPersonalized, profile, isLoaded, fetchSnapshot]);

  // LLM briefing, fires when user searches or changes issue
  const fireLlmBriefing = useCallback(async (
    userQuery: string,
    area: string,
    location: string,
    personalized: boolean,
    prof: CivicProfile | null,
  ) => {
    const q = buildLlmQuery(userQuery, area, location, personalized, prof);
    const demographics = buildDemographics(location, personalized, prof);

    setBriefingQuery(userQuery.trim() || buildFilterSummary(area, location, selectedTime));
    setLlmLoading(true);
    setLlmError(null);
    setLlmResponse(null);

    try {
      const res = await fetch("/api/civic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, demographics, response_style: "structured" }),
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
      setLlmResponse({
        ...normalized,
        retrieval_sources,
        sources_used: typeof su === "number" ? su : retrieval_sources.length,
      });
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : "Briefing failed");
    } finally {
      setLlmLoading(false);
    }
  }, [selectedTime]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    setActiveTab("briefings");
    // try to match query to an issue area
    const q = query.toLowerCase();
    const matched = POLICY_AREAS.find(a =>
      a.id !== "All" && (
        a.label.toLowerCase().includes(q) ||
        a.keywords.some(k => q.includes(k))
      )
    );
    if (matched) setSelectedArea(matched.id);
    fireLlmBriefing(query, matched?.id ?? selectedArea, selectedLocation, isPersonalized, profile);
  }, [query, selectedArea, selectedLocation, isPersonalized, profile, fireLlmBriefing]);

  // area selection from sidebar
  const handleAreaSelect = useCallback((area: string) => {
    setSelectedArea(area);
    if (llmResponse || llmLoading) {
      fireLlmBriefing(query, area, selectedLocation, isPersonalized, profile);
    }
  }, [llmResponse, llmLoading, query, selectedLocation, isPersonalized, profile, fireLlmBriefing]);

  // perspective toggle
  const handlePerspectiveChange = useCallback((val: boolean) => {
    setIsPersonalized(val);
    if (llmResponse || llmLoading) {
      fireLlmBriefing(query, selectedArea, selectedLocation, val, profile);
    }
  }, [llmResponse, llmLoading, query, selectedArea, selectedLocation, profile, fireLlmBriefing]);

  // filter summary for panel header
  const filterSummary = useMemo(
    () => buildFilterSummary(selectedArea, selectedLocation, selectedTime),
    [selectedArea, selectedLocation, selectedTime],
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
        />

        {/* mobile filter toggle */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:hidden mt-4">
          <button type="button" onClick={() => setMobileSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[11px] font-bold text-[var(--foreground)] shadow-sm hover:bg-slate-50 transition-all">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
            Filters
            {(selectedArea !== "All" || selectedLocation !== "All NYC") && (
              <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] text-white font-bold">
                {[selectedArea !== "All", selectedLocation !== "All NYC"].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* layout: sidebar | map+briefing stacked */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 pb-16">
          <div className="flex gap-6 items-start">

            {/* LEFT sidebar */}
            <LeftSidebar
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              isPersonalized={isPersonalized}
              setIsPersonalized={handlePerspectiveChange}
              onEditProfile={() => setShowEditProfile(true)}
              selectedArea={selectedArea}
              setSelectedArea={handleAreaSelect}
              profile={profile}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* RIGHT: main content */}
            <div className="flex-1 min-w-0 space-y-5">
              <TabBar active={activeTab} setActive={setActiveTab} />

              {activeTab === "briefings" ? (
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
              ) : (
                <VoteTracker
                  profile={profile}
                  isPersonalized={isPersonalized}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <SettingsModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <SiteFooter />
    </div>
  );
}