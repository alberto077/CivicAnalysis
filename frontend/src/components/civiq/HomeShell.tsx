"use client";

import { useCallback, useEffect, useState } from "react";
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
import { checkHealth, sendChat, type PolicyResponse } from "@/lib/api";

const PoliticianCards = dynamic(
  () =>
    import("@/components/civiq/PoliticianCards").then(
      (m) => m.PoliticianCards,
    ),
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

  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All NYC");
  const [selectedTime, setSelectedTime] = useState("Last 30 Days");
  const [isPersonalized, setIsPersonalized] = useState(true);

  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleSearch = useCallback(
    async (searchQuery = query) => {
      const q = searchQuery.trim();

      if (!q) return;

      setLoading(true);
      setError(null);

      try {
        await checkHealth();

        const extra =
          isPersonalized && profile ? { borough: profile.borough } : undefined;

        const data = await sendChat(q, extra);

        setResponse(data);
        setLastBriefingQuery(q);
      } catch (e) {
        console.error("Briefing request failed:", e);
        setError(e instanceof Error ? e.message : "Unable to load policy data");
      } finally {
        setLoading(false);
      }
    },
    [query, isPersonalized, profile],
  );

  useEffect(() => {
    if (lastBriefingQuery) {
      void handleSearch(lastBriefingQuery);
    }
  }, [profile, isPersonalized]);

  useEffect(() => {
    if (isLoaded && !profile && !showOnboarding) {
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem("civic_profile_skipped")
      ) {
        setShowOnboarding(true);
      }
    }
  }, [isLoaded, profile, showOnboarding]);

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="ambient-orb -left-20 -top-24 h-72 w-72 bg-[rgba(168,218,220,0.28)]"
        aria-hidden
      />

      <div
        className="ambient-orb -right-24 top-[28%] h-80 w-80 bg-[rgba(230,57,70,0.12)]"
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

        <div id="briefings">
          <PolicyBriefingPanel
            loading={loading}
            error={error}
            response={response}
            briefingQuery={lastBriefingQuery}
          />
        </div>

        <NeighborhoodInsights />

        <div id="map">
          <MapPanel />
        </div>

        <div id="politicians">
          <PoliticianCards userBorough={profile?.borough} />
        </div>

        <div id="updates">
          <RecentUpdates />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}