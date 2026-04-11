"use client";

import { useState, useEffect } from "react";
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
import { PoliticianCards } from "@/components/civiq/PoliticianCards";
import {
  checkHealth,
  sendChat,
  type ChatResponse,
} from "@/lib/api";

export function HomeShell() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [lastBriefingQuery, setLastBriefingQuery] = useState("");
  
  // Dashboard Filters State
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All NYC");
  const [selectedTime, setSelectedTime] = useState("Last 30 Days");
  const [isPersonalized, setIsPersonalized] = useState(true);

  const { profile, isLoaded, saveProfile } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-refetch if profile or personalized flag changes AFTER an initial search
  useEffect(() => {
    if (lastBriefingQuery) {
      handleSearch(lastBriefingQuery);
    }
  }, [profile, isPersonalized]);

  // Show onboarding on first load if profile doesn't exist
  useEffect(() => {
    if (isLoaded && !profile && !showOnboarding) {
      if (typeof window !== "undefined" && !localStorage.getItem("civic_profile_skipped")) {
        setShowOnboarding(true);
      }
    }
  }, [isLoaded, profile, showOnboarding]);

  const handleSearch = async (searchQuery = query) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      await checkHealth();
      const extra = (isPersonalized && profile) ? { borough: profile.borough } : undefined;
      const data = await sendChat(q, extra);
      setResponse(data);
      setLastBriefingQuery(q);
    } catch (e) {
      console.error("Briefing request failed:", e);
      setError(e instanceof Error ? e.message : "Unable to load policy data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
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
