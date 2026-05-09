import type { CivicProfile } from "@/lib/useProfile";

/** Maps saved profile (borough, income, housing, age, interests, demographic tags like Student) to backend `demographics`. */
export function civicProfileToDemographics(profile: CivicProfile | null): Record<string, string> {
  if (!profile) return {};
  const d: Record<string, string> = {};
  if (profile.borough?.trim()) d.borough = profile.borough.trim();
  if (profile.income?.trim()) d.income = profile.income.trim();
  if (profile.housing?.trim()) d.housing = profile.housing.trim();
  if (profile.age?.trim()) d.age = profile.age.trim();
  const interests = profile.issues?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (interests.length) d.policy_interests = interests.join(", ");
  const tags = profile.demographics?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (tags.length) d.demographic_tags = tags.join(", ");
  if (Object.keys(d).length > 0) d.profile_active = "true";
  return d;
}
