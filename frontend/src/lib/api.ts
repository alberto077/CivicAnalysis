import {
  normalizePolicyReply,
  type PolicyResponse,
  type RetrievalTier,
} from "@/lib/policy-reply";

export type { PolicyResponse, RetrievalTier } from "@/lib/policy-reply";

export type PolicyBriefing = {
  id: string;
  title: string;
  source_url: string;
  source_type: string;
  published_date: string;
};

export type District = {
  id: number;
  name: string;
  rep: string;
  issues: string[];
  zip_codes?: string[];
};

export async function getDistricts(): Promise<District[]> {
  try {
    const res = await fetch(`${CIVIC_API}/districts`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error("Backend responded with error");
    const data = await res.json();
    return data.districts || [];
  } catch (e) {
    console.warn("Failed to fetch districts", e);
    return [];
  }
}

export async function getDistrictsMap(): Promise<unknown> {
  try {
    const res = await fetch(`${CIVIC_API}/districts/map`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error("Failed to load map data from backend");
    return await res.json();
  } catch (e) {
    console.warn("Falling back to local districts.geojson", e);
    const res = await fetch("/districts.geojson", { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to load fallback map data");
    return await res.json();
  }
}

export async function getRecentPolicies(borough?: string, area?: string): Promise<{ policies: PolicyBriefing[] }> {
  try {
    const params = new URLSearchParams();
    if (borough) params.append("borough", borough);
    if (area) params.append("area", area);
    const res = await fetch(`${CIVIC_API}/policies/recent?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch policies");
    return await res.json();
  } catch (e) {
    console.warn("Fallback mock policies", e);
    return {
      policies: [
        {
          id: "mock-1",
          title: "Intro 123: Local Law to amend the administrative code...",
          source_url: "#",
          source_type: "Legislation",
          published_date: new Date().toISOString()
        },
        {
          id: "mock-2",
          title: "Committee on Housing and Buildings Transcript",
          source_url: "#",
          source_type: "Transcript",
          published_date: new Date().toISOString()
        }
      ]
    };
  }
}

export type ChatExtra = {
  zip?: string;
  borough?: string;
  community_board?: string;
  issue_area?: string;
  timeframe?: string;
  location_scope?: string;
  profile_active?: string;
};

export type HealthResponse = {
  status?: string;
  db_connected?: boolean;
  has_data?: boolean;
  error?: string;
};

export type Politician = {
  id?: number | null | string;
  name: string;
  role?: string;
  office: string;
  borough: string;
  district?: string | null;
  party?: string | null;
  political_stance: string;
  bio_url?: string | null;
  data_source?: string;
  zip_codes?: string[];
  neighborhoods?: string[];
  committees?: string[];
  photo_url?: string | null;
  phone?: string;
  email?: string;
  website?: string;
  level?: string;
  represents?: string;
  next_election?: string;
  senate_class?: string;
};

export type PoliticianFilterOptions = {
  boroughs: string[];
  stances: string[];
};

export type OpenAiChatRole = "system" | "user" | "assistant";

export type OpenAiChatMessage = {
  role: OpenAiChatRole;
  content: string;
};


const CIVIC_API = "/api/civic";
const LLM_API = "/api/llm";

function buildDemographics(extra?: ChatExtra): Record<string, string> {
  if (!extra) return {};
  const d: Record<string, string> = {};
  if (extra.zip?.trim()) d.zip = extra.zip.trim();
  if (extra.borough?.trim()) d.borough = extra.borough.trim();
  if (extra.community_board?.trim()) d.community_board = extra.community_board.trim();
  if (extra.issue_area?.trim()) d.issue_area = extra.issue_area.trim();
  if (extra.timeframe?.trim()) d.timeframe = extra.timeframe.trim();
  if (extra.location_scope?.trim()) d.location_scope = extra.location_scope.trim();
  if (extra.profile_active?.trim()) d.profile_active = extra.profile_active.trim();
  return d;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${CIVIC_API}/health`, {
    method: "GET",
    cache: "no-store",
  });

  const json = (await res.json()) as HealthResponse & { detail?: string };

  if (!res.ok) {
    throw new Error(json.detail || json.error || `HTTP ${res.status}`);
  }

  return json;
}

function friendlyChatError(status: number, data: unknown): string {
  let serverMessage: string | undefined;
  if (typeof data === "object" && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string" && d.detail.trim()) {
      serverMessage = d.detail.trim();
    } else if (typeof d.error === "string" && d.error.trim()) {
      serverMessage = d.error.trim();
    }
  }

  switch (status) {
    case 429:
      return "You're sending messages too quickly. Please wait a moment and try again.";
    case 503:
      return serverMessage || "The AI service is temporarily busy. Please try again in a moment.";
    case 502:
      return "We're having trouble reaching the AI service. Please try again shortly.";
    default:
      return serverMessage || `Request failed: ${status}`;
  }
}

export async function sendChat(
  query: string,
  extra?: ChatExtra,
): Promise<PolicyResponse> {
  const demographics = buildDemographics(extra);

  const body: { query: string; demographics?: Record<string, string> } = { query };
  if (Object.keys(demographics).length > 0) {
    body.demographics = demographics;
  }

  const res = await fetch(`${CIVIC_API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await res.json()) as unknown;

  if (!res.ok) {
    throw new Error(friendlyChatError(res.status, data));
  }

  const payload: unknown =
    typeof data === "object" &&
      data !== null &&
      "reply" in (data as Record<string, unknown>)
      ? (data as { reply: unknown }).reply
      : data;

  return normalizePolicyReply(payload);
}

export type FloatingRetrievalSource = {
  title: string;
  source_url: string;
  source_type: string;
};

function parseFloatingRetrievalSources(
  data: Record<string, unknown>,
): FloatingRetrievalSource[] {
  const raw = data.retrieval_sources;
  if (!Array.isArray(raw)) return [];
  const out: FloatingRetrievalSource[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const source_url = typeof r.source_url === "string" ? r.source_url.trim() : "";
    const source_type = typeof r.source_type === "string" ? r.source_type.trim() : "";
    if (!source_url) continue;
    out.push({
      title: title || "Source",
      source_url,
      source_type,
    });
  }
  return out.slice(0, 8);
}

export type FloatingChatRagResult = {
  mode: "rag";
  markdown: string;
  sources_used: number;
  retrieval_tier: RetrievalTier;
  retrieval_sources: FloatingRetrievalSource[];
};

export type FloatingChatOpenAiResult = {
  mode: "openai_fallback";
  markdown: string;
  sources_used: number;
  retrieval_tier: RetrievalTier;
  retrieval_sources: FloatingRetrievalSource[];
};

export type FloatingChatResult = FloatingChatRagResult | FloatingChatOpenAiResult;

export type FloatingChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function postFloatingChatOrchestrated(params: {
  messages: FloatingChatTurn[];
  currentPath?: string;
}): Promise<FloatingChatResult> {
  if (!params.messages.length) {
    throw new Error("At least one message is required.");
  }

  const res = await fetch(`${CIVIC_API}/floating-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      currentPath: params.currentPath?.trim() || "/",
    }),
    cache: "no-store",
  });

  const data = (await res.json()) as unknown;

  if (!res.ok) {
    throw new Error(friendlyChatError(res.status, data));
  }

  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as Record<string, unknown>).mode !== "string"
  ) {
    throw new Error("Invalid floating chat response.");
  }

  const mode = (data as Record<string, unknown>).mode;
  const sources_used = Number((data as Record<string, unknown>).sources_used);
  const retrieval_tier = (data as Record<string, unknown>).retrieval_tier;

  const dataObj = data as Record<string, unknown>;
  const retrieval_sources = parseFloatingRetrievalSources(dataObj);
  const tier =
    retrieval_tier === "vector" ||
      retrieval_tier === "lexical" ||
      retrieval_tier === "recent" ||
      retrieval_tier === "none"
      ? retrieval_tier
      : "none";

  if (mode === "rag") {
    const md = dataObj.markdown;
    if (typeof md !== "string" || !md.trim()) {
      throw new Error("Invalid floating chat response: missing markdown.");
    }
    return {
      mode: "rag",
      markdown: md.trim(),
      sources_used: Number.isFinite(sources_used) ? sources_used : 0,
      retrieval_tier: tier,
      retrieval_sources,
    };
  }

  if (mode === "openai_fallback") {
    const md = dataObj.markdown;
    if (typeof md !== "string" || !md.trim()) {
      throw new Error("Invalid floating chat response: missing markdown.");
    }
    return {
      mode: "openai_fallback",
      markdown: md.trim(),
      sources_used: Number.isFinite(sources_used) ? sources_used : 0,
      retrieval_tier: tier,
      retrieval_sources,
    };
  }

  throw new Error("Invalid floating chat response mode.");
}

// TODO: connect to database? (scraper not finished yet)
export async function getPoliticians(filters?: {
  borough?: string;
  stance?: string;
}): Promise<Politician[]> {
  const { fetchAllPoliticians } = await import("@/lib/politicians");
  const all = await fetchAllPoliticians();

  return all.filter((p) => {
    if (filters?.borough && filters.borough.toLowerCase() !== "all") {
      if (!p.borough.toLowerCase().includes(filters.borough.toLowerCase())) return false;
    }
    if (filters?.stance && filters.stance.toLowerCase() !== "all") {
      if (p.political_stance !== filters.stance) return false;
    }
    return true;
  }) as Politician[];
}

export async function getPoliticianFilters(): Promise<PoliticianFilterOptions> {
  const { getPoliticianFilters: getFiltersShim } = await import("@/lib/politicians");
  const opts = await getFiltersShim();
  return {
    boroughs: Array.isArray(opts.boroughs) ? opts.boroughs : [],
    stances: Array.isArray(opts.stances) ? opts.stances : [],
  };
}

export async function sendOpenAiChat(
  messages: OpenAiChatMessage[],
): Promise<OpenAiChatMessage> {
  const safeMessages = messages
    .filter((msg) => typeof msg.content === "string" && msg.content.trim().length > 0)
    .map((msg) => ({ role: msg.role, content: msg.content.trim() }));

  const res = await fetch(`${LLM_API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: safeMessages }),
    cache: "no-store",
  });

  const data = (await res.json()) as unknown;

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    if (typeof data === "object" && data !== null && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") message = d;
      else if (Array.isArray(d)) message = JSON.stringify(d);
    }
    throw new Error(message);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "message" in (data as Record<string, unknown>)
  ) {
    const message = (data as { message: unknown }).message;
    if (
      typeof message === "object" &&
      message !== null &&
      (message as Record<string, unknown>).role === "assistant" &&
      typeof (message as Record<string, unknown>).content === "string"
    ) {
      return {
        role: "assistant",
        content: (message as Record<string, string>).content,
      };
    }
  }

  throw new Error("Invalid chat response shape.");
}