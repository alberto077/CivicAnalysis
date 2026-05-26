import type { CivicProfile } from "@/lib/useProfile";

export function civicProfileToDemographics(
  profile: CivicProfile | null,
): Record<string, string> {
  if (!profile) return {};

  const d: Record<string, string> = {};
  if (profile.borough?.trim()) { d.borough = profile.borough.trim(); }
  if (profile.housing?.trim()) { d.housing = profile.housing.trim(); }
  const issues = profile.issues?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (issues.length) { d.issues = issues.join(","); }
  const tags = profile.demographics?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (tags.length) { d.demographics = tags.join(","); }
  if (profile.income?.trim()) { d.income = profile.income.trim(); }
  if (profile.age?.trim()) { d.age = profile.age.trim(); }
  if (Object.keys(d).length > 0) { d.profile_active = "true"; }
  return d;
}

// does this profile have enough data to personalise a briefing? for personalization
export function profileHasPersonalisationData(profile: CivicProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.borough?.trim() ||
    (profile.issues?.length ?? 0) > 0 ||
    (profile.demographics?.length ?? 0) > 0 ||
    profile.housing?.trim(),
  );
}