import type { PolicyBriefing } from "@/lib/api";
import type { PolicyResponse, PolicySource, PolicyRetrievalSource } from "@/lib/policy-reply";

export type GeneralizedBriefingContext = {
  selectedArea: string;
  locationLabel: string;
  timeLabel: string;
};

const MAX_ITEMS = 50;
const MAX_TAGS = 4;

export function timeframeCutoffMs(selectedTime: string, now = Date.now()): number | null {
  if (selectedTime === "All Time") return null;
  const d = new Date(now);
  if (selectedTime === "Last 30 Days") { d.setDate(d.getDate() - 30); return d.getTime(); }
  if (selectedTime === "Last 6 Months") { d.setMonth(d.getMonth() - 6); return d.getTime(); }
  return null;
}

export function filterPoliciesByTimeframe(policies: PolicyBriefing[], selectedTime: string): PolicyBriefing[] {
  const cutoff = timeframeCutoffMs(selectedTime);
  if (cutoff === null) return policies;

  return policies.filter((p) => {
    if (!p.published_date) return true;
    const t = Date.parse(p.published_date);
    return isNaN(t) || t >= cutoff;
  });
}

function policyToSource(p: PolicyBriefing): PolicySource {
  const dateLine = p.published_date
    ? `Published ${new Date(p.published_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    : "";
  const url = p.source_url && p.source_url !== "#" && /^https?:\/\//i.test(p.source_url) ? p.source_url : undefined;
  return {
    title: p.title,
    description: [p.source_type, dateLine].filter(Boolean).join(" · ") || "Indexed official record.",
    url,
    source_type: p.source_type,
    published_date: p.published_date,
  };
}

/**
 * Deterministic, non-LLM briefing shape for the dashboard snapshot (pre-search).
 */
export function buildGeneralizedBriefingFromPolicies(
  policies: PolicyBriefing[],
  ctx: GeneralizedBriefingContext,
): PolicyResponse {
  const n = policies.length;
  const slice = policies.slice(0, MAX_ITEMS);
  const area = ctx.selectedArea === "All" ? "all policy areas" : ctx.selectedArea;

  const tldr: string[] = [
    `${n} recently indexed ${n === 1 ? "record" : "records"} for ${ctx.locationLabel}, ${area}, ${ctx.timeLabel}.`,
    "Click any district on the map above to generate a tailored briefing, or type a question in the search bar.",
  ];

  const topic_tags: string[] = [];
  if (ctx.selectedArea !== "All") topic_tags.push(ctx.selectedArea);
  const typeCounts = new Map<string, number>();
  for (const p of slice) { if (p.source_type) typeCounts.set(p.source_type, (typeCounts.get(p.source_type) ?? 0) + 1); }
  [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([k]) => topic_tags.push(k));

  const what_happened = slice.map((p) => {
    const date = p.published_date
      ? new Date(p.published_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "";
    const typeTag = p.source_type?.trim() ? `**${p.source_type.trim()}** · ` : "";
    return `${typeTag}${p.title}${date ? ` (${date})` : ""}`;
  });

  const why_it_matters = ["These records come from the indexed civic library — bills, transcripts, and notices that shape budgets, enforcement, and neighborhood services."];
  const whos_affected = ["Residents, community boards, and advocates tracking how agencies and legislatures publish updates on housing, budgets, safety, and services."];
  const what_happens_next = [
    "Click a district on the map to generate a targeted briefing for that area.",
    "Use the search bar to ask about a specific bill, ZIP code, or topic.",
    "Adjust the location, timeframe, or policy area filters to narrow results.",
  ];

  const sources: PolicySource[] = policies.map(policyToSource);
  const retrieval_sources: PolicyRetrievalSource[] = policies.map((p) => ({
    title: p.title, source_url: p.source_url, source_type: p.source_type, published_date: p.published_date,
  }));

  return {
    tldr,
    topic_tags: topic_tags.slice(0, MAX_TAGS),
    what_happened,
    why_it_matters,
    whos_affected,
    key_numbers: [],
    what_happens_next,
    read_more: [],
    at_a_glance: what_happened,
    key_takeaways: why_it_matters,
    what_this_means: whos_affected,
    relevant_actions: what_happens_next,
    sources,
    retrieval_sources,
    sources_used: sources.length,
  };
}
