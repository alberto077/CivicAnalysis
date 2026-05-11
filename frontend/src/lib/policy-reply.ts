export type PolicySource = {
  title: string;
  description: string;
  /** Official URL when the model or client merged index metadata. */
  url?: string;
  source_type?: string;
  published_date?: string;
};

/** Deduped rows from vector search (always has a URL when present). */
export type PolicyRetrievalSource = {
  title: string;
  source_url: string;
  source_type: string;
  published_date?: string;
};

export type BriefingSourceCard = {
  title: string;
  description: string;
  url?: string;
  source_type?: string;
  published_date?: string;
};

export type PolicyResponse = {
  /** 1–2 very short sentences; always present after normalize (may be derived). */
  tldr: string[];
  /** Short topic labels for chips (e.g. Housing, Budget). */
  topic_tags: string[];
  what_happened: string[];
  why_it_matters: string[];
  whos_affected: string[];
  /** Stats, dollars, dates, vote counts — model may use **bold** inside strings. */
  key_numbers: string[];
  what_happens_next: string[];
  /** Extra detail for progressive disclosure (Read more). */
  read_more: string[];
  /** Legacy fields — kept in sync for older UI paths. */
  at_a_glance: string[];
  key_takeaways: string[];
  what_this_means: string[];
  relevant_actions: string[];
  sources: PolicySource[];
  /** Official URLs from the retrieval index (merged in `sendChat`). */
  retrieval_sources: PolicyRetrievalSource[];
  /** Number of document excerpts passed to the model. */
  sources_used: number;
};

function filterStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter((item): item is string => typeof item === "string");
}

/** Remove template KPIs (e.g. $X, **Date**) so Key numbers only shows concrete figures from context. */
function isFactualKeyNumberLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 4) return false;

  const badPatterns = [
    /\$X\b/i,
    /€X\b/i,
    /£X\b/i,
    /\*\*\$X\*\*/i,
    /\*\*€X\*\*/i,
    /\*\*£X\*\*/i,
    /\*\*Date\*\*/i,
    /^Date\s+/i,
    /\bTBD\b/i,
    /\bN\/?A\b/i,
    /placeholder/i,
    /\bXXX\b/i,
    /\[\s*\.{3}\s*\]/,
  ];

  for (const re of badPatterns) {
    if (re.test(t)) return false;
  }

  const boldLead = t.match(/^\*\*([^*]+)\*\*/)?.[1]?.trim() ?? "";
  if (/^\$[xX]$/.test(boldLead) || /^[€£][xX]$/.test(boldLead)) return false;
  if (/^date$/i.test(boldLead)) return false;

  if (!/\d/.test(t)) return false;

  return true;
}

function filterFactualKeyNumbers(lines: string[]): string[] {
  return lines.map((s) => s.trim()).filter(Boolean).filter(isFactualKeyNumberLine);
}

function parseTldr(payload: Record<string, unknown>): string[] {
  const raw = payload.tldr;
  if (typeof raw === "string" && raw.trim()) {
    const one = raw.trim();
    const bySentence = one.split(/(?<=[.!?])\s+/).filter(Boolean);
    return bySentence.slice(0, 2).length ? bySentence.slice(0, 2) : [one];
  }
  if (Array.isArray(raw)) {
    const lines = raw.filter((item): item is string => typeof item === "string").map((s) => s.trim()).filter(Boolean);
    return lines.slice(0, 2);
  }
  return [];
}

function optString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

/** Allow only http(s) links in UI anchors. */
export function safeHttpUrl(raw: string | undefined): string | undefined {
  const u = raw?.trim();
  if (!u) return undefined;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    return undefined;
  }
  return undefined;
}

function normTitleKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merge LLM narrative sources with retrieval index URLs so cards always prefer
 * official links when titles align; unmatched retrieval rows are appended.
 */
export function buildBriefingSourceCards(
  llmSources: PolicySource[],
  retrieval: PolicyRetrievalSource[],
): BriefingSourceCard[] {
  const usedUrls = new Set<string>();
  const out: BriefingSourceCard[] = [];

  const retrievalList = retrieval.filter((r) => safeHttpUrl(r.source_url));
  const byExact = new Map<string, PolicyRetrievalSource>();
  for (const r of retrievalList) {
    byExact.set(normTitleKey(r.title), r);
  }

  for (const s of llmSources) {
    const key = normTitleKey(s.title);
    let match = byExact.get(key);
    if (!match) {
      match =
        retrievalList.find(
          (r) =>
            normTitleKey(r.title).includes(key) ||
            key.includes(normTitleKey(r.title)),
        ) ?? undefined;
    }
    const url =
      safeHttpUrl(s.url) ||
      (match ? safeHttpUrl(match.source_url) : undefined);
    if (url) usedUrls.add(url);
    out.push({
      title: s.title.trim() || "Source",
      description: s.description.trim(),
      url,
      source_type: optString(s.source_type) || optString(match?.source_type),
      published_date: optString(s.published_date) || optString(match?.published_date),
    });
  }

  for (const r of retrievalList) {
    const url = safeHttpUrl(r.source_url);
    if (!url || usedUrls.has(url)) continue;
    usedUrls.add(url);
    out.push({
      title: r.title.trim() || "Source",
      description: r.source_type
        ? `${r.source_type} — official record from the indexed library.`
        : "Official document from the indexed search library.",
      url,
      source_type: optString(r.source_type),
      published_date: optString(r.published_date),
    });
  }

  return out;
}

/** Parse `retrieval_sources` from the `/api/chat` JSON envelope (deduped URLs from the index). */
export function parseRetrievalSourcesEnvelope(
  data: Record<string, unknown>,
  maxItems = 12,
): PolicyRetrievalSource[] {
  const raw = data.retrieval_sources;
  if (!Array.isArray(raw)) return [];

  const out: PolicyRetrievalSource[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const source_url = typeof r.source_url === "string" ? r.source_url.trim() : "";
    const source_type = typeof r.source_type === "string" ? r.source_type.trim() : "";
    const published_date = optString(r.published_date);
    if (!source_url) continue;
    out.push({
      title: title || "Source",
      source_url,
      source_type,
      ...(published_date ? { published_date } : {}),
    });
    if (out.length >= maxItems) break;
  }
  return out;
}

export function normalizePolicyReply(payload: unknown): PolicyResponse {
  const p =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const raw_at_a_glance = filterStrings(p.at_a_glance);
  const raw_key_takeaways = filterStrings(p.key_takeaways);
  const raw_what_this_means = filterStrings(p.what_this_means);
  const raw_relevant_actions = filterStrings(p.relevant_actions);

  const raw_what_happened = filterStrings(p.what_happened);
  const raw_why = filterStrings(p.why_it_matters);
  const raw_who = filterStrings(p.whos_affected);
  const raw_next = filterStrings(p.what_happens_next);

  const what_happened = raw_what_happened.length ? raw_what_happened : raw_at_a_glance;
  const at_a_glance = raw_at_a_glance.length ? raw_at_a_glance : what_happened;

  const why_it_matters = raw_why.length ? raw_why : raw_key_takeaways;
  const key_takeaways = raw_key_takeaways.length ? raw_key_takeaways : why_it_matters;

  const whos_affected = raw_who.length ? raw_who : raw_what_this_means;
  const what_this_means = raw_what_this_means.length ? raw_what_this_means : whos_affected;

  const what_happens_next = raw_next.length ? raw_next : raw_relevant_actions;
  const relevant_actions = raw_relevant_actions.length ? raw_relevant_actions : what_happens_next;

  const key_numbers = filterFactualKeyNumbers(filterStrings(p.key_numbers));

  const read_more = filterStrings(p.read_more);

  let tldr = parseTldr(p);
  if (tldr.length === 0) {
    const fromGlance = at_a_glance.slice(0, 2).map((s) => {
      const t = s.trim();
      if (t.length <= 200) return t;
      return `${t.slice(0, 197)}…`;
    });
    tldr = fromGlance.length ? fromGlance : [];
  }
  if (tldr.length > 2) tldr = tldr.slice(0, 2);

  const topic_tags = filterStrings(p.topic_tags);

  const sources: PolicySource[] = Array.isArray(p.sources)
    ? (p.sources as unknown[])
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).title === "string" &&
            typeof (item as Record<string, unknown>).description === "string",
        )
        .map((item) => {
          const url =
            optString(item.url) ||
            optString(item.source_url) ||
            optString(item.href) ||
            optString(item.link);
          return {
            title: String(item.title).trim(),
            description: String(item.description).trim(),
            url,
            source_type: optString(item.source_type),
            published_date: optString(item.published_date),
          };
        })
    : [];

  return {
    tldr,
    topic_tags,
    what_happened,
    why_it_matters,
    whos_affected,
    key_numbers,
    what_happens_next,
    read_more,
    at_a_glance: at_a_glance.length ? at_a_glance : what_happened,
    key_takeaways: key_takeaways.length ? key_takeaways : why_it_matters,
    what_this_means: what_this_means.length ? what_this_means : whos_affected,
    relevant_actions: relevant_actions.length ? relevant_actions : what_happens_next,
    sources,
    retrieval_sources: [],
    sources_used: 0,
  };
}

export function hasPolicyBriefingContent(b: PolicyResponse): boolean {
  return (
    b.tldr.length > 0 ||
    b.topic_tags.length > 0 ||
    b.what_happened.length > 0 ||
    b.why_it_matters.length > 0 ||
    b.whos_affected.length > 0 ||
    b.key_numbers.length > 0 ||
    b.what_happens_next.length > 0 ||
    b.read_more.length > 0 ||
    b.at_a_glance.length > 0 ||
    b.key_takeaways.length > 0 ||
    b.what_this_means.length > 0 ||
    b.relevant_actions.length > 0 ||
    b.sources.length > 0 ||
    b.retrieval_sources.length > 0
  );
}

export function ragReplyHasError(reply: unknown): boolean {
  return (
    typeof reply === "object" &&
    reply !== null &&
    "error" in reply &&
    typeof (reply as Record<string, unknown>).error === "string"
  );
}

/** Plain-style RAG reply: `{ "markdown": "..." }` from the backend. */
export function extractRagMarkdown(reply: unknown): string {
  if (typeof reply !== "object" || reply === null) return "";
  const md = (reply as Record<string, unknown>).markdown;
  return typeof md === "string" ? md.trim() : "";
}

export type RetrievalTier = "vector" | "lexical" | "recent" | "none";
