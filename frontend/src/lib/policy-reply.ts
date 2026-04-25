export type PolicyResponse = {
  at_a_glance: string[];
  key_takeaways: string[];
  what_this_means: string[];
  relevant_actions: string[];
  sources: {
    title: string;
    description: string;
  }[];
};

export function normalizePolicyReply(payload: unknown): PolicyResponse {
  return {
    at_a_glance:
      typeof payload === "object" &&
      payload !== null &&
      Array.isArray((payload as Record<string, unknown>).at_a_glance)
        ? ((payload as Record<string, unknown>).at_a_glance as unknown[]).filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    key_takeaways:
      typeof payload === "object" &&
      payload !== null &&
      Array.isArray((payload as Record<string, unknown>).key_takeaways)
        ? ((payload as Record<string, unknown>).key_takeaways as unknown[]).filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    what_this_means:
      typeof payload === "object" &&
      payload !== null &&
      Array.isArray((payload as Record<string, unknown>).what_this_means)
        ? ((payload as Record<string, unknown>).what_this_means as unknown[]).filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    relevant_actions:
      typeof payload === "object" &&
      payload !== null &&
      Array.isArray((payload as Record<string, unknown>).relevant_actions)
        ? ((payload as Record<string, unknown>).relevant_actions as unknown[]).filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    sources:
      typeof payload === "object" &&
      payload !== null &&
      Array.isArray((payload as Record<string, unknown>).sources)
        ? ((payload as Record<string, unknown>).sources as unknown[])
            .filter(
              (item): item is { title: string; description: string } =>
                typeof item === "object" &&
                item !== null &&
                typeof (item as Record<string, unknown>).title === "string" &&
                typeof (item as Record<string, unknown>).description === "string",
            )
            .map((item) => ({ title: item.title, description: item.description }))
        : [],
  };
}

export function hasPolicyBriefingContent(b: PolicyResponse): boolean {
  return (
    b.at_a_glance.length > 0 ||
    b.key_takeaways.length > 0 ||
    b.what_this_means.length > 0 ||
    b.relevant_actions.length > 0 ||
    b.sources.length > 0
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
