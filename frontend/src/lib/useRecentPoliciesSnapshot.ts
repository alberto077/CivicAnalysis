"use client";

import { useState, useEffect } from "react";
import { getRecentPolicies, type PolicyBriefing } from "@/lib/api";
import type { CivicProfile } from "@/lib/useProfile";
import { filterPoliciesByTimeframe } from "@/lib/generalized-briefing";

/** Match `HomeShell` / `handleSearch` borough resolution for `getRecentPolicies`. */
export function effectiveBoroughForPolicies(
  selectedLocation: string,
  isPersonalized: boolean,
  profile: CivicProfile | null,
): string | undefined {
  if (selectedLocation !== "All NYC") return selectedLocation;
  if (isPersonalized && profile?.borough) return profile.borough;
  return undefined;
}

export function useRecentPoliciesSnapshot(
  selectedArea: string,
  selectedLocation: string,
  selectedTime: string,
  isPersonalized: boolean,
  profile: CivicProfile | null,
  isProfileLoaded: boolean,
) {
  const [policies, setPolicies] = useState<PolicyBriefing[]>([]);
  /** Starts true so we do not flash an empty snapshot before the first fetch completes. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isProfileLoaded) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const borough = effectiveBoroughForPolicies(selectedLocation, isPersonalized, profile);
        const area = selectedArea !== "All" ? selectedArea : undefined;
        const data = await getRecentPolicies(borough, area);
        if (cancelled) return;
        const filtered = filterPoliciesByTimeframe(data.policies, selectedTime);
        setPolicies(filtered);
      } catch (e) {
        if (cancelled) return;
        setPolicies([]);
        setError(e instanceof Error ? e.message : "Could not load recent records");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedArea, selectedLocation, selectedTime, isPersonalized, profile, isProfileLoaded]);

  const snapshotLoading = !isProfileLoaded || loading;

  return { policies, snapshotLoading, snapshotError: error };
}
