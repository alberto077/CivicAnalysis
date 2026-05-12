"use client";

import { useState, useEffect, useMemo } from "react";
import { getRecentPolicies, type PolicyBriefing } from "@/lib/api";
import type { CivicProfile } from "@/lib/useProfile";
import { filterPoliciesByTimeframe } from "@/lib/generalized-briefing";
import { uniquePolicyAreasFromIssues, type PolicyApiArea } from "@/lib/profileIssueToPolicyArea";

const NYC_BOROUGHS = new Set(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]);

/** Borough + mapped policy area intersection rows only (see `buildFetchPlans`). */
export const PROFILE_ACTIVITY_MIN_RANK = 100;
export const PROFILE_ACTIVITY_MAX_ITEMS = 6;

export type ProfileActivityItem = PolicyBriefing & {
  /** Short hint for UI, e.g. "Brooklyn · Housing" */
  matchSummary: string;
  /** Higher = stronger match for sort */
  rankScore: number;
};

function resolveProfileBorough(profile: CivicProfile | null): string | undefined {
  if (!profile?.borough) return undefined;
  if (NYC_BOROUGHS.has(profile.borough)) return profile.borough;
  return undefined;
}

function policyKey(p: PolicyBriefing): string {
  return `${p.id}|${p.source_url}|${p.title}`;
}

type FetchPlan = { borough?: string; area?: string; rankScore: number; matchSummary: string };

function buildFetchPlans(profile: CivicProfile | null, isPersonalized: boolean): FetchPlan[] {
  if (!isPersonalized || !profile) {
    return [{ rankScore: 0, matchSummary: "All NYC" }];
  }

  const borough = resolveProfileBorough(profile);
  const areas = uniquePolicyAreasFromIssues(profile.issues ?? []);
  const plans: FetchPlan[] = [];
  const seen = new Set<string>();

  const add = (p: FetchPlan) => {
    const k = `${p.borough ?? ""}|${p.area ?? ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    plans.push(p);
  };

  if (borough && areas.length) {
    for (const area of areas) {
      add({
        borough,
        area,
        rankScore: 100,
        matchSummary: `${borough} · ${area}`,
      });
    }
  }

  if (borough) {
    add({
      borough,
      rankScore: 60,
      matchSummary: borough,
    });
  }

  if (areas.length) {
    for (const area of areas) {
      if (!borough) {
        add({
          area,
          rankScore: 40,
          matchSummary: `${area} (citywide)`,
        });
      }
    }
  }

  if (plans.length === 0) {
    add({ rankScore: 0, matchSummary: "All NYC" });
  }

  return plans;
}

function parseTimeMs(p: PolicyBriefing): number {
  if (!p.published_date) return 0;
  const t = Date.parse(p.published_date);
  return Number.isNaN(t) ? 0 : t;
}

export type ProfileActivityMode = "personalized" | "citywide" | "personalize_off";

export function useProfileActivityFeed(args: {
  isProfileLoaded: boolean;
  profile: CivicProfile | null;
  isPersonalized: boolean;
  selectedTime: string;
}) {
  const { isProfileLoaded, profile, isPersonalized, selectedTime } = args;

  const [items, setItems] = useState<ProfileActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode: ProfileActivityMode = useMemo(() => {
    if (!isPersonalized) return "personalize_off";
    if (!profile) return "citywide";
    return "personalized";
  }, [isPersonalized, profile]);

  const highRankPlans = useMemo(() => {
    if (!isPersonalized || !profile) return [];
    return buildFetchPlans(profile, isPersonalized).filter((p) => p.rankScore >= PROFILE_ACTIVITY_MIN_RANK);
  }, [profile, isPersonalized]);

  const mappedAreas = useMemo((): PolicyApiArea[] => {
    if (!profile?.issues?.length) return [];
    return uniquePolicyAreasFromIssues(profile.issues);
  }, [profile]);

  const profileBorough = useMemo(() => resolveProfileBorough(profile), [profile]);

  useEffect(() => {
    if (!isProfileLoaded) return;

    if (!isPersonalized || !profile) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (highRankPlans.length === 0) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const best = new Map<string, { policy: PolicyBriefing; rankScore: number; matchSummary: string }>();

        await Promise.all(
          highRankPlans.map(async (plan) => {
            const data = await getRecentPolicies(plan.borough, plan.area);
            if (cancelled) return;
            const filtered = filterPoliciesByTimeframe(data.policies, selectedTime);
            for (const p of filtered) {
              const key = policyKey(p);
              const next = {
                policy: p,
                rankScore: plan.rankScore,
                matchSummary: plan.matchSummary,
              };
              const prev = best.get(key);
              if (!prev || next.rankScore > prev.rankScore) best.set(key, next);
            }
          }),
        );

        if (cancelled) return;

        const merged: ProfileActivityItem[] = [...best.values()].map((v) => ({
          ...v.policy,
          matchSummary: v.matchSummary,
          rankScore: v.rankScore,
        }));

        merged.sort((a, b) => {
          if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
          return parseTimeMs(b) - parseTimeMs(a);
        });

        const visible = merged
          .filter((i) => i.rankScore >= PROFILE_ACTIVITY_MIN_RANK)
          .slice(0, PROFILE_ACTIVITY_MAX_ITEMS);

        setItems(visible);
      } catch (e) {
        if (cancelled) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "Could not load activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isProfileLoaded, isPersonalized, profile, highRankPlans, selectedTime]);

  const snapshotLoading = !isProfileLoaded || loading;

  return {
    items,
    loading: snapshotLoading,
    error,
    mode,
    mappedAreas,
    profileBorough,
  };
}
