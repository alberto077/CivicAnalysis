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
import { POLICY_AREAS } from "@/lib/policyMetadata";
import {
  ChevronDown,
  Info,
  Sparkles,
  Users,
  Settings,
  Map as MapIcon,
  Layers,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { CivicProfile } from "@/lib/useProfile";


const LegislativeActivityMap = dynamic(
  () =>
    import("@/components/civiq/LegislativeActivityMap").then(
      (m) => m.LegislativeActivityMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full animate-pulse rounded-[1.5rem] bg-slate-200/50 dark:bg-[var(--surface-elevated)]/50" />
    ),
  },
);

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
  () =>
    import("@/components/civiq/PolicyBriefingPanel").then(
      (m) => m.PolicyBriefingPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-xl dark:border-[var(--border)] dark:bg-[var(--surface-card)]">
        <div className="m-6 min-h-[260px] animate-pulse rounded-2xl bg-slate-100/90 dark:bg-[var(--surface-elevated)]/80" />
      </div>
    ),
  },
);

// SIDEBAR filter constants

const TIME_RANGES = ["Last 30 Days", "Last 6 Months", "All Time"] as const;
const LOCATIONS = [
  "All NYC",
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
] as const;

// compact sidebar filter components

function SidebarSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="font-work-sans w-full cursor-pointer appearance-none rounded-lg border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 px-2.5 py-1.5 pr-7 text-[11px] font-semibold text-[var(--foreground)] shadow-sm outline-none transition hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted)]" />
      </div>
    </div>
  );
}

function PerspectiveToggle({
  isPersonalized,
  setIsPersonalized,
  onEditProfile,
  profile,
}: {
  isPersonalized: boolean;
  setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
  profile: CivicProfile | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
          Perspective
        </span>
        <div className="group relative inline-flex">
          <button
            type="button"
            aria-label="How perspective works"
            className="rounded-full p-0.5 text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <Info className="h-2.5 w-2.5" strokeWidth={2} />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none invisible absolute left-1/2 bottom-full z-[80] mb-2 w-52 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-white/98 dark:bg-[var(--surface-card)]/98 px-3 py-2 text-[10px] leading-relaxed text-[var(--foreground)] shadow-lg opacity-0 transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100"
          >
            <strong>Personalized</strong> filters by your saved profile.{" "}
            <strong>Generalized</strong> shows city-wide data.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 items-center rounded-lg border border-[var(--border)] bg-slate-100/80 dark:bg-[var(--surface-elevated)]/60 p-0.5 gap-0.5 h-[30px]">
          <button
            type="button"
            onClick={() => setIsPersonalized(true)}
            className={`flex flex-1 items-center justify-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all h-full ${isPersonalized
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
          >
            <Sparkles className="h-2.5 w-2.5 shrink-0" />
            For Me
          </button>
          <button
            type="button"
            onClick={() => setIsPersonalized(false)}
            className={`flex flex-1 items-center justify-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all h-full ${!isPersonalized
              ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/10"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
          >
            <Users className="h-2.5 w-2.5 shrink-0" />
            City-wide
          </button>
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 text-[var(--muted)] hover:text-[var(--foreground)] transition-all hover:bg-slate-50 shadow-sm"
          aria-label="Edit Profile"
        >
          <Settings className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function MapModeToggle({
  mapMode,
  setMapMode,
}: {
  mapMode: "vector" | "satellite";
  setMapMode: (v: "vector" | "satellite") => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
        Map Mode
      </span>
      <div className="flex items-center rounded-lg border border-[var(--border)] bg-slate-100/80 dark:bg-[var(--surface-elevated)]/60 p-0.5 gap-0.5 h-[30px]">
        <button
          type="button"
          onClick={() => setMapMode("vector")}
          className={`flex flex-1 items-center justify-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all h-full ${mapMode === "vector"
            ? "bg-[var(--accent)] text-white shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
        >
          <MapIcon className="h-2.5 w-2.5 shrink-0" />
          Vector
        </button>
        <button
          type="button"
          onClick={() => setMapMode("satellite")}
          className={`flex flex-1 items-center justify-center gap-1 px-2 rounded-md text-[10px] font-bold transition-all h-full ${mapMode === "satellite"
            ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/10"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
        >
          <Layers className="h-2.5 w-2.5 shrink-0" />
          Satellite
        </button>
      </div>
    </div>
  );
}

// sidebar issue area picker

function IssueAreaPicker({
  selectedArea,
  setSelectedArea,
  profileAreaIds,
}: {
  selectedArea: string;
  setSelectedArea: (v: string) => void;
  profileAreaIds: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-work-sans text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
        Issue Focus
      </span>
      <div className="flex flex-col gap-0.5">
        {POLICY_AREAS.map((area) => {
          const Icon = area.Icon;
          const isActive = selectedArea === area.id;
          const isInterest = profileAreaIds.has(area.id);
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => setSelectedArea(area.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left w-full ${isActive
                ? "text-white shadow-sm"
                : isInterest
                  ? "bg-amber-50/70 dark:bg-amber-950/15 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70"
                  : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-[var(--surface-elevated)]/50 hover:text-[var(--foreground)]"
                }`}
              style={
                isActive
                  ? {
                    background: area.color,
                    boxShadow: `0 2px 8px -2px ${area.color}70`,
                  }
                  : undefined
              }
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: isActive ? "white" : area.color }}
                aria-hidden
              />
              <span className="flex-1 truncate">{area.label}</span>
              {isInterest && !isActive && (
                <Sparkles className="h-2.5 w-2.5 text-amber-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}



// LEFT SIDEBAR
function LeftSidebar({
  selectedLocation,
  setSelectedLocation,
  selectedTime,
  setSelectedTime,
  isPersonalized,
  setIsPersonalized,
  onEditProfile,
  selectedArea,
  setSelectedArea,
  mapMode,
  setMapMode,
  profile,
  mobileOpen,
  onMobileClose,
}: {
  selectedLocation: string;
  setSelectedLocation: (v: string) => void;
  selectedTime: string;
  setSelectedTime: (v: string) => void;
  isPersonalized: boolean;
  setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
  selectedArea: string;
  setSelectedArea: (v: string) => void;
  mapMode: "vector" | "satellite";
  setMapMode: (v: "vector" | "satellite") => void;
  profile: CivicProfile | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const profileAreaIds = useMemo(() => {
    if (!isPersonalized || !profile) return new Set<string>();
    return new Set<string>(profile.issues ?? []);
  }, [isPersonalized, profile]);

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* mobile header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] lg:hidden">
        <span className="font-work-sans text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
          Filters
        </span>
        <button
          type="button"
          onClick={onMobileClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <MapModeToggle mapMode={mapMode} setMapMode={setMapMode} />

        <div className="h-px bg-[var(--border)]/40" />

        <SidebarSelect
          label="Location"
          value={selectedLocation as any}
          options={LOCATIONS}
          onChange={setSelectedLocation as any}
        />

        <SidebarSelect
          label="Timeframe"
          value={selectedTime as any}
          options={TIME_RANGES}
          onChange={setSelectedTime as any}
        />

        <div className="h-px bg-[var(--border)]/40" />

        <PerspectiveToggle
          isPersonalized={isPersonalized}
          setIsPersonalized={setIsPersonalized}
          onEditProfile={onEditProfile}
          profile={profile}
        />

        <div className="h-px bg-[var(--border)]/40" />

        <IssueAreaPicker
          selectedArea={selectedArea}
          setSelectedArea={(v) => {
            setSelectedArea(v);
            onMobileClose();
          }}
          profileAreaIds={profileAreaIds}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 xl:w-60 shrink-0 rounded-2xl border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 backdrop-blur-md shadow-sm overflow-hidden self-start sticky top-4">
        {sidebarContent}
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col w-72 bg-white dark:bg-[var(--surface-card)] border-r border-[var(--border)] shadow-2xl lg:hidden overflow-hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}




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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (selectedTime === "Current Session") setSelectedTime("Last 30 Days");
  }, [selectedTime]);

  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileSkipped, setProfileSkipped] = useState(false);

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined") return;
    if (profile) {
      localStorage.removeItem("civic_profile_skipped");
      setProfileSkipped(false);
    } else {
      setProfileSkipped(Boolean(localStorage.getItem("civic_profile_skipped")));
    }
  }, [isLoaded, profile]);

  const {
    policies: snapshotPolicies,
    snapshotLoading,
    snapshotError,
  } = useRecentPoliciesSnapshot(
    selectedArea,
    selectedLocation,
    selectedTime,
    isPersonalized,
    profile,
    isLoaded,
  );

  const filterSummary = useMemo(
    () =>
      [
        selectedLocation,
        selectedArea === "All" ? "All policy areas" : selectedArea,
        selectedTime,
      ].join(" · "),
    [selectedArea, selectedLocation, selectedTime],
  );

  const generalizedBriefing = useMemo((): PolicyResponse | null => {
    if (response || snapshotLoading || snapshotError || !snapshotPolicies.length)
      return null;
    return buildGeneralizedBriefingFromPolicies(snapshotPolicies, {
      selectedArea,
      locationLabel: selectedLocation,
      timeLabel: selectedTime,
    });
  }, [
    response,
    snapshotPolicies,
    snapshotLoading,
    snapshotError,
    selectedArea,
    selectedLocation,
    selectedTime,
  ]);

  useEffect(() => {
    if (isLoaded && !profile && !showOnboarding) {
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem("civic_profile_skipped")
      )
        setShowOnboarding(true);
    }
  }, [isLoaded, profile, showOnboarding]);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) return;

      const effectiveBorough =
        selectedLocation !== "All NYC"
          ? selectedLocation
          : isPersonalized && profile?.borough
            ? profile.borough
            : undefined;

      const parts = [q];
      const zMatch = q.match(/\b\d{5}\b/);
      if (zMatch) parts.push(`location: ZIP code ${zMatch[0]}`);
      if (selectedArea !== "All") parts.push(`focus area: ${selectedArea}`);
      if (selectedLocation !== "All NYC")
        parts.push(`jurisdiction: ${selectedLocation}`);
      if (selectedTime !== "All Time") parts.push(`period: ${selectedTime}`);
      if (isPersonalized && profile) {
        if (profile.borough && selectedLocation === "All NYC")
          parts.push(`user borough: ${profile.borough}`);
        if (profile.issues?.length)
          parts.push(`user interests: ${profile.issues.join(", ")}`);
      }

      setLoading(true);
      setError(null);

      try {
        await checkHealth();
        const data = await sendChat(parts.join(" | "), {
          borough: effectiveBorough,
          zip: zMatch ? zMatch[0] : undefined,
          issue_area: selectedArea !== "All" ? selectedArea : undefined,
          timeframe:
            selectedTime !== "All Time" ? selectedTime : undefined,
          location_scope:
            selectedLocation !== "All NYC" ? selectedLocation : undefined,
          profile_active: isPersonalized ? "true" : "false",
        });
        setResponse(data);
        setLastQuery(q);
        // on mobile, scroll to briefing panel
        setTimeout(() => {
          document
            .getElementById("briefing")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to load policy data",
        );
      } finally {
        setLoading(false);
      }
    },
    [
      selectedArea,
      selectedLocation,
      selectedTime,
      isPersonalized,
      profile,
    ],
  );

  // Re-run last briefing on filter changes
  const lastQueryRef = useRef(lastQuery);
  useEffect(() => {
    lastQueryRef.current = lastQuery;
  }, [lastQuery]);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        selectedArea,
        selectedLocation,
        selectedTime,
        isPersonalized,
        borough: profile?.borough,
        issues: profile?.issues,
      }),
    [selectedArea, selectedLocation, selectedTime, isPersonalized, profile],
  );
  const prevFilterKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterKey.current === null) {
      prevFilterKey.current = filterKey;
      return;
    }
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    const q = lastQueryRef.current.trim();
    if (!q) return;
    void handleSearch(q);
  }, [filterKey, handleSearch]);

  const hasBriefing = Boolean(
    lastQuery.trim() || response || loading || error,
  );

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)] dark:bg-[rgba(90,110,140,0.15)]"
        aria-hidden
      />
      <div
        className="ambient-orb bottom-10 left-[20%] h-64 w-64 bg-[rgba(26,54,93,0.10)] dark:bg-[rgba(60,75,98,0.12)]"
        aria-hidden
      />

      <OnboardingModal
        isOpen={showOnboarding}
        initialProfile={profile}
        onSave={(data) => {
          if (typeof window !== "undefined")
            localStorage.removeItem("civic_profile_skipped");
          setProfileSkipped(false);
          saveProfile(data);
          setShowOnboarding(false);
        }}
        onSkip={() => {
          localStorage.setItem("civic_profile_skipped", "true");
          setProfileSkipped(true);
          setShowOnboarding(false);
        }}
      />

      <Header />

      <main className="relative z-10 mt-10 flex-1">
        {/* hero search */}
        <Hero
          query={query}
          onQueryChange={setQuery}
          loading={loading}
          onSearch={() => handleSearch(query)}
        />

        {/* mobile filter toggle */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:hidden mt-4">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[11px] font-bold text-[var(--foreground)] shadow-sm hover:bg-slate-50 transition-all"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
            Filters
            {selectedArea !== "All" && (
              <span className="ml-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] text-white font-bold">
                1
              </span>
            )}
          </button>
        </div>

        {/* 3-column layout */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6 pb-16">
          <div className="flex gap-5 items-start">

            <LeftSidebar
              selectedLocation={selectedLocation}
              setSelectedLocation={setSelectedLocation}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              isPersonalized={isPersonalized}
              setIsPersonalized={setIsPersonalized}
              onEditProfile={() => setShowEditProfile(true)}
              selectedArea={selectedArea}
              setSelectedArea={setSelectedArea}
              mapMode={mapMode}
              setMapMode={setMapMode}
              profile={profile}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Heatmap */}
            <div className="flex-1 min-w-0 lg:max-w-[520px] xl:max-w-[580px]">
              <div className="sticky top-4">
                <LegislativeActivityMap
                  isPersonalized={isPersonalized}
                  profile={profile}
                  policies={snapshotPolicies}
                  selectedArea={selectedArea}
                  setSelectedArea={setSelectedArea}
                  selectedLocation={selectedLocation}
                  onSearch={handleSearch}
                  hasBriefing={hasBriefing}
                  mapMode={mapMode}
                  setMapMode={setMapMode}
                />
              </div>
            </div>

            {/* Policy Briefing / Intel Readout */}
            <div
              id="briefing"
              className="hidden lg:block flex-1 min-w-0 scroll-mt-4"
            >
              <PolicyBriefingPanel
                loading={loading}
                error={error}
                response={response}
                briefingQuery={lastQuery}
                snapshotLoading={snapshotLoading}
                snapshotError={snapshotError}
                generalizedBriefing={generalizedBriefing}
                filterSummary={filterSummary}
              />
            </div>
          </div>

          {/* mobile briefing (below map) */}
          <div id="briefing-mobile" className="lg:hidden mt-6 scroll-mt-4">
            <PolicyBriefingPanel
              loading={loading}
              error={error}
              response={response}
              briefingQuery={lastQuery}
              snapshotLoading={snapshotLoading}
              snapshotError={snapshotError}
              generalizedBriefing={generalizedBriefing}
              filterSummary={filterSummary}
            />
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
      <SiteFooter />
    </div>
  );
}