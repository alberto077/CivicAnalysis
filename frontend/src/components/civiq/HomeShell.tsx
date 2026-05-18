"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";
import { useProfile } from "@/lib/useProfile";
import { checkHealth, sendChat, type PolicyResponse } from "@/lib/api";
import { buildGeneralizedBriefingFromPolicies } from "@/lib/generalized-briefing";
import { useRecentPoliciesSnapshot } from "@/lib/useRecentPoliciesSnapshot";

const DashboardFilters = dynamic(
  () => import("@/components/civiq/DashboardFilters").then((m) => m.DashboardFilters),
  { ssr: false, loading: () => <div className="w-full h-[88px] animate-pulse rounded-3xl border border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/80" /> },
);

const LegislativeActivityMap = dynamic(
  () => import("@/components/civiq/LegislativeActivityMap").then((m) => m.LegislativeActivityMap),
  {
    ssr: false, loading: () => (
      <div className="space-y-3">
        <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-200/60 dark:bg-[var(--surface-elevated)]/60" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200/40 dark:bg-[var(--surface-elevated)]/40" />
        <div className="h-[420px] w-full animate-pulse rounded-[1.5rem] bg-slate-200/50 dark:bg-[var(--surface-elevated)]/50" />
      </div>
    )
  },
);

const Hero = dynamic(
  () => import("@/components/civiq/Hero").then((m) => m.Hero),
  {
    ssr: false, loading: () => (
      <section className="relative overflow-hidden pb-24 pt-24 sm:pb-32 sm:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-5 h-20 w-full max-w-2xl animate-pulse rounded-2xl bg-slate-200/85 dark:bg-[var(--surface-elevated)]/90" />
          <div className="mt-10 h-20 w-full max-w-2xl animate-pulse rounded-3xl bg-white/65 dark:bg-[var(--surface-card)]/70" />
        </div>
      </section>
    )
  },
);

const PolicyBriefingPanel = dynamic(
  () => import("@/components/civiq/PolicyBriefingPanel").then((m) => m.PolicyBriefingPanel),
  {
    ssr: false, loading: () => (
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-xl dark:border-[var(--border)] dark:bg-[var(--surface-card)]">
        <div className="min-h-[260px] animate-pulse rounded-2xl bg-slate-100/90 dark:bg-[var(--surface-elevated)]/80 m-6" />
      </div>
    )
  },
);

export function HomeShell() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PolicyResponse | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All NYC");
  const [selectedTime, setSelectedTime] = useState("Last 30 Days");
  const [isPersonalized, setIsPersonalized] = useState(true);
  const [mapMode, setMapMode] = useState<"vector" | "satellite">("vector");

  useEffect(() => {
    if (selectedTime === "Current Session") setSelectedTime("Last 30 Days");
  }, [selectedTime]);

  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileSkipped, setProfileSkipped] = useState(false);

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;
    if (profile) { localStorage.removeItem("civic_profile_skipped"); setProfileSkipped(false); }
    else { setProfileSkipped(Boolean(localStorage.getItem("civic_profile_skipped"))); }
  }, [isLoaded, profile]);


  const { policies: snapshotPolicies, snapshotLoading, snapshotError } =
    useRecentPoliciesSnapshot(selectedArea, selectedLocation, selectedTime, isPersonalized, profile, isLoaded);

  const filterSummary = useMemo(
    () => [selectedLocation, selectedArea === "All" ? "All policy areas" : selectedArea, selectedTime].join(" · "),
    [selectedArea, selectedLocation, selectedTime],
  );

  const generalizedBriefing = useMemo((): PolicyResponse | null => {
    if (response || snapshotLoading || snapshotError || !snapshotPolicies.length) return null;
    return buildGeneralizedBriefingFromPolicies(snapshotPolicies, {
      selectedArea, locationLabel: selectedLocation, timeLabel: selectedTime,
    });
  }, [response, snapshotPolicies, snapshotLoading, snapshotError, selectedArea, selectedLocation, selectedTime]);

  useEffect(() => {
    if (isLoaded && !profile && !showOnboarding) {
      if (typeof window !== "undefined" && !localStorage.getItem("civic_profile_skipped")) setShowOnboarding(true);
    }
  }, [isLoaded, profile, showOnboarding]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    const effectiveBorough = selectedLocation !== "All NYC" ? selectedLocation
      : isPersonalized && profile?.borough ? profile.borough : undefined;

    const parts = [q];
    const zMatch = q.match(/\b\d{5}\b/);
    if (zMatch) parts.push(`location: ZIP code ${zMatch[0]}`);
    if (selectedArea !== "All") parts.push(`focus area: ${selectedArea}`);
    if (selectedLocation !== "All NYC") parts.push(`jurisdiction: ${selectedLocation}`);
    if (selectedTime !== "All Time") parts.push(`period: ${selectedTime}`);
    if (isPersonalized && profile) {
      if (profile.borough && selectedLocation === "All NYC") parts.push(`user borough: ${profile.borough}`);
      if (profile.issues?.length) parts.push(`user interests: ${profile.issues.join(", ")}`);
    }

    setLoading(true);
    setError(null);

    try {
      await checkHealth();
      const data = await sendChat(parts.join(" | "), {
        borough: effectiveBorough,
        zip: zMatch ? zMatch[0] : undefined,
        issue_area: selectedArea !== "All" ? selectedArea : undefined,
        timeframe: selectedTime !== "All Time" ? selectedTime : undefined,
        location_scope: selectedLocation !== "All NYC" ? selectedLocation : undefined,
        profile_active: isPersonalized ? "true" : "false",
      });
      console.log("CHAT RESPONSE", data);
      setResponse(data);
      setLastQuery(q);
      setTimeout(() => {
        document.getElementById("briefing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      console.error("Briefing request failed:", e);
      setError(e instanceof Error ? e.message : "Unable to load policy data");
    } finally {
      setLoading(false);
    }
  }, [selectedArea, selectedLocation, selectedTime, isPersonalized, profile]);

  // Re-run last briefing on filter changes — ref+fingerprint prevents infinite loop
  const lastQueryRef = useRef(lastQuery);
  useEffect(() => { lastQueryRef.current = lastQuery; }, [lastQuery]);

  const filterKey = useMemo(
    () => JSON.stringify({ selectedArea, selectedLocation, selectedTime, isPersonalized, borough: profile?.borough, issues: profile?.issues }),
    [selectedArea, selectedLocation, selectedTime, isPersonalized, profile],
  );
  const prevFilterKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterKey.current === null) { prevFilterKey.current = filterKey; return; }
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    const q = lastQueryRef.current.trim();
    if (!q) return;
    void handleSearch(q);
  }, [filterKey, handleSearch]);

  const hasBriefing = Boolean(lastQuery.trim() || response || loading || error);

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)] dark:bg-[rgba(90,110,140,0.15)]" aria-hidden />
      <div className="ambient-orb bottom-10 left-[20%] h-64 w-64 bg-[rgba(26,54,93,0.10)] dark:bg-[rgba(60,75,98,0.12)]" aria-hidden />

      <OnboardingModal isOpen={showOnboarding} initialProfile={profile}
        onSave={(data) => {
          if (typeof window !== "undefined") localStorage.removeItem("civic_profile_skipped");
          setProfileSkipped(false); saveProfile(data); setShowOnboarding(false);
        }}
        onSkip={() => {
          localStorage.setItem("civic_profile_skipped", "true");
          setProfileSkipped(true); setShowOnboarding(false);
        }} />

      <Header />

      <main className="relative z-10 mt-10 flex-1">

        {/* hero search */}
        <Hero query={query} onQueryChange={setQuery} loading={loading} onSearch={() => handleSearch(query)} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-8 pb-16">

          {/* <h2 className="font-work-sans text-xl sm:text-2xl font-bold tracking-tight text-[rgba(20,31,45,0.92)] dark:text-[var(--foreground)] truncate">
            What's Happening in Your Community
          </h2> */}

          {/* context filters: Location · Timeframe · Perspective (Singular Command Panel) */}
          <DashboardFilters
            selectedLocation={selectedLocation} setSelectedLocation={setSelectedLocation}
            selectedTime={selectedTime} setSelectedTime={setSelectedTime}
            isPersonalized={isPersonalized} setIsPersonalized={setIsPersonalized}
            onEditProfile={() => setShowEditProfile(true)}
            selectedArea={selectedArea} setSelectedArea={setSelectedArea}
            mapMode={mapMode} setMapMode={setMapMode}
            profile={profile}
          />

          {/* Heatmap & Policy Briefing */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">

            {/* Heatmap */}
            <div className="lg:col-span-5 space-y-3">
              <LegislativeActivityMap
                isPersonalized={isPersonalized}
                profile={profile} policies={snapshotPolicies}
                selectedArea={selectedArea} setSelectedArea={setSelectedArea}
                selectedLocation={selectedLocation} onSearch={handleSearch}
                hasBriefing={hasBriefing}
                mapMode={mapMode} setMapMode={setMapMode}
              />
            </div>

            {/* Policy Briefing / Intel Readout */}
            <div id="briefing" className="lg:col-span-7 scroll-mt-4">
              <PolicyBriefingPanel
                loading={loading} error={error}
                response={response} briefingQuery={lastQuery}
                snapshotLoading={snapshotLoading} snapshotError={snapshotError}
                generalizedBriefing={generalizedBriefing} filterSummary={filterSummary}
              />
            </div>

          </div>

        </div>
      </main>

      <SettingsModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
      <SiteFooter />
    </div>
  );
}