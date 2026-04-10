"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Header } from "@/components/civiq/Header";
import { Hero } from "@/components/civiq/Hero";
import { PolicyBriefingPanel } from "@/components/civiq/PolicyBriefingPanel";
import { NeighborhoodInsights } from "@/components/civiq/NeighborhoodInsights";
import { MapPanel } from "@/components/civiq/MapPanel";
import { RecentUpdates } from "@/components/civiq/RecentUpdates";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { checkHealth, sendChat, type ChatResponse } from "@/lib/api";

const OnboardingModal = dynamic(
  () =>
    import("@/components/civiq/OnboardingModal").then(
      (mod) => mod.OnboardingModal
    ),
  { ssr: false }
);


export function HomeShell() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [lastBriefingQuery, setLastBriefingQuery] = useState("");

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      await checkHealth();
      const data = await sendChat(q);
      setResponse(data);
      setLastBriefingQuery(q);
    } catch (e) {
      console.error("Briefing request failed:", e);
      const message =
        e instanceof Error ? e.message : "Unable to load policy data";
      setError(
        process.env.NODE_ENV === "development"
          ? message
          : "Policy data unavailable. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <OnboardingModal />
      <Header />
      <main className="relative z-10 flex-1">
        <Hero
          query={query}
          onQueryChange={setQuery}
          loading={loading}
          onSearch={handleSearch}
        />
        <PolicyBriefingPanel
          loading={loading}
          error={error}
          response={response}
          briefingQuery={lastBriefingQuery}
        />
        <NeighborhoodInsights />
        <MapPanel />
        <RecentUpdates />
      </main>
      <SiteFooter />
    </div>
  );
}
