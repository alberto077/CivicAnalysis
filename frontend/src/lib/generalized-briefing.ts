import type { PolicyBriefing } from "@/lib/api";
import type { PolicyResponse, PolicySource } from "@/lib/policy-reply";

export type GeneralizedBriefingContext = {
  /** Raw dashboard value: `"All"` or a policy area name. */
  selectedArea: string;
  /** e.g. "All NYC" or "Brooklyn" */
  locationLabel: string;
  /** e.g. "Last 30 Days" */
  timeLabel: string;
};

const MAX_WHAT_HAPPENED = 8;
const MAX_TOPIC_TAGS = 4;

/** Cutoff timestamp (inclusive): records with published_date before this are excluded. */
export function timeframeCutoffMs(selectedTime: string, now = Date.now()): number | null {
  if (selectedTime === "All Time") return null;
  const d = new Date(now);
  if (selectedTime === "Last 30 Days") {
    d.setDate(d.getDate() - 30);
    return d.getTime();
  }
  if (selectedTime === "Last 6 Months") {
    d.setMonth(d.getMonth() - 6);
    return d.getTime();
  }
  return null;
}

export function filterPoliciesByTimeframe(
  policies: PolicyBriefing[],
  selectedTime: string,
): PolicyBriefing[] {
  const cutoff = timeframeCutoffMs(selectedTime);
  if (cutoff === null) return policies;

  return policies.filter((p) => {
    if (!p.published_date) return true;
    const t = Date.parse(p.published_date);
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
}

function policyToSource(p: PolicyBriefing): PolicySource {
  const dateLine = p.published_date
    ? `Published ${new Date(p.published_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "";
  const description = [p.source_type, dateLine].filter(Boolean).join(" · ");

  const url =
    p.source_url && p.source_url !== "#" && /^https?:\/\//i.test(p.source_url)
      ? p.source_url
      : undefined;

  return {
    title: p.title,
    description: description || "Indexed official record.",
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
  const slice = policies.slice(0, MAX_WHAT_HAPPENED);

  const areaPhrase = ctx.selectedArea === "All" ? "all policy areas" : ctx.selectedArea;

  const tldr: string[] = [
    `This automatic snapshot lists ${n} recent indexed ${n === 1 ? "record" : "records"} for ${ctx.locationLabel}, ${areaPhrase}, ${ctx.timeLabel}. It is not an answer to a specific question.`,
    `Use the search box above to ask how a topic, bill, or ZIP code affects you—we will generate a tailored briefing from the same library.`,
  ];

  const topic_tags: string[] = [];
  if (ctx.selectedArea !== "All") {
    topic_tags.push(ctx.selectedArea);
  }
  const typeCounts = new Map<string, number>();
  for (const p of slice) {
    if (p.source_type) typeCounts.set(p.source_type, (typeCounts.get(p.source_type) ?? 0) + 1);
  }
  const topTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 2);
  topic_tags.push(...topTypes);

  const what_happened = slice.map((p) => {
    const date = p.published_date
      ? new Date(p.published_date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const typeTag = p.source_type?.trim() ? `**${p.source_type.trim()}** · ` : "";
    const dateSuffix = date ? ` (${date})` : "";
    return `${typeTag}${p.title}${dateSuffix}`;
  });

  const why_it_matters = [
    "These entries come straight from the indexed civic library—bills, transcripts, and notices that can shape budgets, enforcement, and neighborhood projects.",
  ];

  const whos_affected = [
    "Residents, community boards, and advocates tracking how agencies and legislatures publish updates on housing, budgets, safety, and services.",
  ];

  const key_numbers: string[] = [];

  const what_happens_next = [
    "Ask a concrete question in the search box (for example a bill number, ZIP code, or “how does this affect renters?”) for a tailored briefing.",
    "Change policy area, location, or timeframe to refresh this snapshot and the recent updates list below.",
  ];

  const sources: PolicySource[] = policies.map(policyToSource);

  return {
    tldr,
    topic_tags: topic_tags.slice(0, MAX_TOPIC_TAGS),
    what_happened,
    why_it_matters,
    whos_affected,
    key_numbers,
    what_happens_next,
    read_more: [],
    at_a_glance: what_happened,
    key_takeaways: why_it_matters,
    what_this_means: whos_affected,
    relevant_actions: what_happens_next,
    sources,
    retrieval_sources: [],
    sources_used: sources.length,
  };
}
