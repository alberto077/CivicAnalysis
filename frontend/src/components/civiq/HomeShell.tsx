"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/civiq/Header";
import { RecentUpdates } from "@/components/civiq/RecentUpdates";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";
import { useProfile } from "@/lib/useProfile";
import {
  checkHealth,
  sendChat,
  type PolicyResponse,
} from "@/lib/api";

const DashboardFilters = dynamic(
  () =>
    import("@/components/civiq/DashboardFilters").then((mod) => mod.DashboardFilters),
  {
    ssr: false,
    loading: () => (
      <div className="w-full mb-2 sm:mb-4" aria-hidden>
        <div className="glass-card surface-float soft-inset h-[220px] animate-pulse rounded-3xl border border-[var(--border)] bg-white/40" />
      </div>
    ),
  },
);

const Hero = dynamic(
  () => import("@/components/civiq/Hero").then((mod) => mod.Hero),
  {
    ssr: false,
    loading: () => (
      <section className="relative overflow-hidden pb-24 pt-10 sm:pb-32 sm:pt-16" aria-hidden>
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
          <div>
            <div className="mt-5 h-16 w-full max-w-2xl animate-pulse rounded-2xl bg-slate-200/85 sm:h-20 md:h-24" />
            <div className="mt-6 h-6 w-3/4 animate-pulse rounded-lg bg-slate-200/80 sm:h-7" />
            <div className="mt-10 h-20 w-full max-w-2xl animate-pulse rounded-3xl border border-[var(--border)] bg-white/65 sm:h-24" />
          </div>
        </div>
      </section>
    ),
  },
);

/** Client-only: avoids RSC/cache drift vs live bundle (hydration mismatches on empty/loading markup). */
const PolicyBriefingPanel = dynamic(
  () =>
    import("@/components/civiq/PolicyBriefingPanel").then((mod) => mod.PolicyBriefingPanel),
  {
    ssr: false,
    loading: () => (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden>
        <div className="mt-10 h-11 w-64 max-w-[80%] animate-pulse rounded-xl bg-slate-200/90" />
        <div className="mt-10 overflow-hidden rounded-[3rem] border border-slate-200/90 bg-white p-8 shadow-xl sm:p-12">
          <div className="min-h-[280px] animate-pulse rounded-2xl bg-slate-100/90" />
        </div>
      </section>
    ),
  },
);



export function HomeShell() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PolicyResponse | null>(null);
  const [lastBriefingQuery, setLastBriefingQuery] = useState("");
  
  // Dashboard Filters State
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All NYC");
  const [selectedTime, setSelectedTime] = useState("Last 30 Days");
  const [isPersonalized, setIsPersonalized] = useState(true);

  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // Show onboarding on first load if profile doesn't exist
  useEffect(() => {
    if (isLoaded && !profile && !showOnboarding) {
      if (typeof window !== "undefined" && !localStorage.getItem("civic_profile_skipped")) {
        setShowOnboarding(true);
      }
    }
  }, [isLoaded, profile, showOnboarding]);

  const handleSearch = useCallback(async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    const buildEffectiveFilters = () => {
      const effectiveBorough =
        selectedLocation !== "All NYC"
          ? selectedLocation
          : isPersonalized && profile?.borough
            ? profile.borough
            : undefined;

      return {
        borough: effectiveBorough,
        issue_area: selectedArea !== "All" ? selectedArea : undefined,
        timeframe: selectedTime !== "All Time" ? selectedTime : undefined,
        location_scope: selectedLocation !== "All NYC" ? selectedLocation : undefined,
        profile_active: isPersonalized ? "true" : "false",
      };
    };

    const buildAugmentedQuery = (baseQuery: string) => {
      const parts = [baseQuery.trim()];
      const zMatch = baseQuery.match(/\b\d{5}\b/);
      if (zMatch) parts.push(`location: ZIP code ${zMatch[0]}`);

      if (selectedArea !== "All") parts.push(`focus area: ${selectedArea}`);
      if (selectedLocation !== "All NYC") parts.push(`jurisdiction: ${selectedLocation}`);
      if (selectedTime !== "All Time") parts.push(`period: ${selectedTime}`);
      
      if (isPersonalized && profile) {
        if (profile.borough && selectedLocation === "All NYC") parts.push(`user borough: ${profile.borough}`);
        if (profile.issues?.length) parts.push(`user interests: ${profile.issues.join(", ")}`);
      }

      return parts.join(" | ");
    };

    setLoading(true);
    setError(null);

    try {
      await checkHealth();

      const filters = buildEffectiveFilters();
      const augmentedQuery = buildAugmentedQuery(q);
      
      // Extract ZIP for direct filter if present
      const zipMatch = q.match(/\b\d{5}\b/);

      const data = await sendChat(augmentedQuery, {
        borough: filters.borough,
        zip: zipMatch ? zipMatch[0] : undefined,
        issue_area: filters.issue_area,
        timeframe: filters.timeframe,
        location_scope: filters.location_scope,
        profile_active: filters.profile_active,
      });

      console.log("CHAT RESPONSE", data);
      setResponse(data);
      setLastBriefingQuery(q);
      
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      console.error("Briefing request failed:", e);
      setError(e instanceof Error ? e.message : "Unable to load policy data");
    } finally {
      setLoading(false);
    }
  }, [selectedArea, selectedLocation, selectedTime, isPersonalized, profile]);

  const lastBriefingQueryRef = useRef(lastBriefingQuery);
  lastBriefingQueryRef.current = lastBriefingQuery;

  // Re-run the last successful briefing when dashboard filters / profile change — not when the hero search box text changes
  useEffect(() => {
    const q = lastBriefingQueryRef.current.trim();
    if (!q) return;
    void handleSearch(q);
  }, [selectedArea, selectedLocation, selectedTime, isPersonalized, profile, handleSearch]);

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)]"
        aria-hidden
      />
      <div
        className="ambient-orb bottom-10 left-[20%] h-64 w-64 bg-[rgba(26,54,93,0.10)]"
        aria-hidden
      />
      <OnboardingModal 
        isOpen={showOnboarding} 
        initialProfile={profile}
        onSave={(data) => {
          saveProfile(data);
          setShowOnboarding(false);
        }}
        onSkip={() => {
          localStorage.setItem("civic_profile_skipped", "true");
          setShowOnboarding(false);
        }}
      />

      <Header />
      <main className="relative z-10 flex-1">
        <Hero
          query={query}
          onQueryChange={setQuery}
          loading={loading}
          onSearch={() => handleSearch(query)}
        />

        <div className="mx-auto mt-2 max-w-7xl px-4 sm:mt-4 sm:px-6 lg:px-8">
          <DashboardFilters
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            isPersonalized={isPersonalized}
            setIsPersonalized={setIsPersonalized}
            onEditProfile={() => setShowEditProfile(true)}
          />
        </div>

        <SettingsModal
          isOpen={showEditProfile}
          onClose={() => setShowEditProfile(false)}
        />

        {/* 1. Policy Briefing (Search Results) */}
        <div id="results" className="scroll-mt-20 mt-6 sm:mt-8">
          <PolicyBriefingPanel
            loading={loading}
            error={error}
            response={response}
            briefingQuery={lastBriefingQuery}
          />
        </div>

        {/* 2. Dashboard feed */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
          <div id="updates">
            <RecentUpdates 
              selectedArea={selectedArea} 
              selectedLocation={selectedLocation} 
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
