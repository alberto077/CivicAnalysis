/**
 * Maps onboarding issue strings (federal-style labels) to dashboard/API policy areas.
 * Only values in `POLICY_API_AREAS` are valid for `getRecentPolicies(..., area)`.
 */
export const POLICY_API_AREAS = [
  "Housing",
  "Education",
  "Policing",
  "Transit",
  "Environment",
  "Health",
  "Immigration",
] as const;

export type PolicyApiArea = (typeof POLICY_API_AREAS)[number];

const EXPLICIT: Partial<Record<string, PolicyApiArea>> = {
  Health: "Health",
  Immigration: "Immigration",
  Education: "Education",
  "Environmental Protection": "Environment",
  "Transportation and Public Works": "Transit",
  "Crime and Law Enforcement": "Policing",
  "Housing and Community Development": "Housing",
  Energy: "Environment",
  "Science, Technology, Communications": "Environment",
  "Emergency Management": "Policing",
  "Civil Rights and Liberties, Minority Issues": "Policing",
  "Native Americans": "Immigration",
  "International Affairs": "Immigration",
  "Public Lands and Natural Resources": "Environment",
  "Water Resources Development": "Environment",
  Agriculture: "Environment",
  Commerce: "Immigration",
  Taxation: "Immigration",
  "Economics and Public Finance": "Immigration",
  "Social Welfare": "Health",
  Families: "Health",
  "Labor and Employment": "Housing",
  Law: "Policing",
  Congress: "Education",
  Animals: "Environment",
};

/** Max distinct area queries per profile (plan cap). */
export const MAX_PROFILE_AREA_QUERIES = 3;

function keywordArea(issue: string): PolicyApiArea | undefined {
  const t = issue.toLowerCase();
  if (t.includes("hous") || t.includes("tenant") || t.includes("community development")) return "Housing";
  if (t.includes("health") || t.includes("medic") || t.includes("welfare")) return "Health";
  if (t.includes("immigr") || t.includes("foreign") || t.includes("international affair")) return "Immigration";
  if (t.includes("educ") || t.includes("school")) return "Education";
  if (t.includes("transit") || t.includes("transport")) return "Transit";
  if (t.includes("environment") || t.includes("climate") || t.includes("energy") || t.includes("water resource"))
    return "Environment";
  if (t.includes("crime") || t.includes("polic") || t.includes("law enforcement") || t.includes("civil rights"))
    return "Policing";
  return undefined;
}

export function profileIssueToPolicyArea(issue: string): PolicyApiArea | undefined {
  const trimmed = issue.trim();
  if (!trimmed) return undefined;
  const direct = EXPLICIT[trimmed];
  if (direct) return direct;
  return keywordArea(trimmed);
}

export function uniquePolicyAreasFromIssues(issues: string[]): PolicyApiArea[] {
  const seen = new Set<PolicyApiArea>();
  const out: PolicyApiArea[] = [];
  for (const issue of issues) {
    const a = profileIssueToPolicyArea(issue);
    if (a && !seen.has(a)) {
      seen.add(a);
      out.push(a);
    }
    if (out.length >= MAX_PROFILE_AREA_QUERIES) break;
  }
  return out;
}
