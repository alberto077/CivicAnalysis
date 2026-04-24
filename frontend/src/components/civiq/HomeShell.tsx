"use client";
import { ChatPanel } from "@/components/civiq/ChatPanel";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/civiq/Header";
import { Hero } from "@/components/civiq/Hero";
import { PolicyBriefingPanel } from "@/components/civiq/PolicyBriefingPanel";
import { NeighborhoodInsights } from "@/components/civiq/NeighborhoodInsights";
import { MapPanel } from "@/components/civiq/MapPanel";
import { RecentUpdates } from "@/components/civiq/RecentUpdates";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { DashboardFilters } from "@/components/civiq/DashboardFilters";
import { useProfile } from "@/lib/useProfile";
import {
  checkHealth,
  sendChat,
  type PolicyResponse,
} from "@/lib/api";

const PoliticianCards = dynamic(
  () => import("@/components/civiq/PoliticianCards").then((m) => m.PoliticianCards),
  {
    ssr: false,
    loading: () => (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-6 text-sm text-[var(--muted)]">
          Loading representatives...
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

  // Show onboarding on first load if profile doesn't exist
  useEffect(() => {
    if (isLoaded && !profile && !showOnboarding) {
      if (typeof window !== "undefined" && !localStorage.getItem("civic_profile_skipped")) {
        setShowOnboarding(true);
      }
    }
  }, [isLoaded, profile, showOnboarding]);

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
    const q = baseQuery.trim();
    const parts = [q];

    // Auto-detect ZIP codes in search query
    const zipMatch = q.match(/\b\d{5}\b/);
    if (zipMatch) parts.push(`location: ZIP code ${zipMatch[0]}`);

    if (selectedArea !== "All") parts.push(`focus area: ${selectedArea}`);
    if (selectedLocation !== "All NYC") parts.push(`jurisdiction: ${selectedLocation}`);
    if (selectedTime !== "All Time") parts.push(`period: ${selectedTime}`);
    
    if (isPersonalized && profile) {
      if (profile.borough && selectedLocation === "All NYC") parts.push(`user borough: ${profile.borough}`);
      if (profile.issues?.length) parts.push(`user interests: ${profile.issues.join(", ")}`);
    }

    return parts.join(" | ");
  };

  const handleSearch = useCallback(async (searchQuery = query) => {
    const q = searchQuery.trim();
    if (!q) return;

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
  }, [query, selectedArea, selectedLocation, selectedTime, isPersonalized, profile]);

  // Auto-refetch if filters change AFTER an initial search
  useEffect(() => {
    if (lastBriefingQuery) {
      void handleSearch(lastBriefingQuery);
    }
  }, [lastBriefingQuery, handleSearch]);

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)]"
        aria-hidden
      />
      <div
        className="ambient-orb top-[28%] -right-24 h-80 w-80 bg-[rgba(230,57,70,0.12)]"
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
          onSearch={handleSearch}
        />

        {/* 1. Policy Briefing (Search Results) - Appears immediately after Hero */}
        <div id="results" className="scroll-mt-20">
          <PolicyBriefingPanel
            loading={loading}
            error={error}
            response={response}
            briefingQuery={lastBriefingQuery}
          />
        </div>

        {/* 2. Dashboard Section - Filters + Feed */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Live City Dashboard
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Explore recent policy updates, meeting transcripts, and official city actions.
          </p>
          
          <DashboardFilters 
            selectedArea={selectedArea} 
            setSelectedArea={setSelectedArea} 
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            isPersonalized={isPersonalized}
            setIsPersonalized={setIsPersonalized}
          />

          <div id="updates" className="-mt-16">
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
