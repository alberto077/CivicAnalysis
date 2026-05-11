import {
  normalizePolicyReply,
  parseRetrievalSourcesEnvelope,
  type PolicyResponse,
  type RetrievalTier,
} from "@/lib/policy-reply";
import type { Politician } from "@/lib/politicians";

export type { PolicyResponse, RetrievalTier } from "@/lib/policy-reply";
export type { Politician };

const CIVIC_API = "/api/civic";
const LLM_API = "/api/llm";

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

function getFallbackPolicies(): { policies: PolicyBriefing[] } {
  return {
    policies: [
      {
        id: "mock-1",
        title: "Intro 123: Local Law to amend the administrative code...",
        source_url: "#",
        source_type: "Legislation",
        published_date: new Date().toISOString(),
      },
      {
        id: "mock-2",
        title: "Committee on Housing and Buildings Transcript",
        source_url: "#",
        source_type: "Transcript",
        published_date: new Date().toISOString(),
      },
    ],
  };
}

export async function getDistricts(): Promise<District[]> {
  // Safe fallback:
  // districts-data.json does not currently exist in /public, so do not fetch it.
  // Returning an empty list prevents mobile/calendar/briefings pages from crashing.
  return [];
}

export async function getDistrictsMap(): Promise<unknown> {
  try {
    const res = await fetch("/boundaries-districts.geojson", {
      cache: "force-cache",
    });

    if (!res.ok) {
      throw new Error("Failed to load boundaries-districts.geojson");
    }

    return await res.json();
  } catch (e) {
    console.warn("Failed to fetch district boundary map", e);
    return null;
  }
}

export async function getRecentPolicies(
  borough?: string,
  area?: string,
): Promise<{ policies: PolicyBriefing[] }> {
  try {
    const params = new URLSearchParams();

    if (borough) params.append("borough", borough);
    if (area) params.append("area", area);

    const query = params.toString();
    const url = `${CIVIC_API}/policies${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("Recent policies endpoint unavailable, using fallback data");
      return getFallbackPolicies();
    }

    const data = (await res.json()) as unknown;

    if (Array.isArray(data)) {
      return {
        policies: data as PolicyBriefing[],
      };
    }

    if (typeof data === "object" && data !== null) {
      const record = data as Record<string, unknown>;

      if (Array.isArray(record.policies)) {
        return {
          policies: record.policies as PolicyBriefing[],
        };
      }

      if (Array.isArray(record.items)) {
        return {
          policies: record.items as PolicyBriefing[],
        };
      }
    }

    return getFallbackPolicies();
  } catch (e) {
    console.warn("Fallback mock policies", e);
    return getFallbackPolicies();
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

export type PoliticianFilterOptions = {
  boroughs: string[];
  stances: string[];
  parties: string[];
  districts: string[];
  committees: string[];
};

export type OpenAiChatRole = "system" | "user" | "assistant";

export type OpenAiChatMessage = {
  role: OpenAiChatRole;
  content: string;
};

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

  const body: { query: string; demographics?: Record<string, string> } = {
    query,
  };

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

  const envelope =
    typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};

  const payload: unknown =
    "reply" in envelope && envelope.reply !== undefined ? envelope.reply : data;

  const normalized = normalizePolicyReply(payload);
  const retrieval_sources = parseRetrievalSourcesEnvelope(envelope, 12);
  const sources_used_raw = envelope.sources_used;
  const sources_used =
    typeof sources_used_raw === "number" && Number.isFinite(sources_used_raw)
      ? sources_used_raw
      : retrieval_sources.length;

  return {
    ...normalized,
    retrieval_sources,
    sources_used,
  };
}

export type FloatingRetrievalSource = {
  title: string;
  source_url: string;
  source_type: string;
  published_date?: string;
};

function parseFloatingRetrievalSources(
  data: Record<string, unknown>,
): FloatingRetrievalSource[] {
  return parseRetrievalSourcesEnvelope(data, 8);
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

export type FloatingChatResult =
  | FloatingChatRagResult
  | FloatingChatOpenAiResult;

export type FloatingChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function postFloatingChatOrchestrated(params: {
  messages: FloatingChatTurn[];
  currentPath?: string;
  demographics?: Record<string, string>;
}): Promise<FloatingChatResult> {
  if (!params.messages.length) {
    throw new Error("At least one message is required.");
  }

  const payload: Record<string, unknown> = {
    messages: params.messages,
    currentPath: params.currentPath?.trim() || "/",
  };

  const demo = params.demographics;

  if (demo && Object.keys(demo).length > 0) {
    payload.demographics = demo;
  }

  const res = await fetch(`${CIVIC_API}/floating-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

  const dataObj = data as Record<string, unknown>;
  const mode = dataObj.mode;
  const sources_used = Number(dataObj.sources_used);
  const retrieval_tier = dataObj.retrieval_tier;
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

export async function getPoliticians(filters?: {
  borough?: string;
  stance?: string;
}): Promise<Politician[]> {
  const params = new URLSearchParams();

  if (filters?.borough) params.set("borough", filters.borough);
  if (filters?.stance) params.set("stance", filters.stance);

  const res = await fetch(
    `${CIVIC_API}/politicians${params.size ? `?${params}` : ""}`,
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from /api/civic/politicians`);
  }

  const data = (await res.json()) as { politicians: Politician[] };

  return data.politicians ?? [];
}

export async function getPoliticianFilters(): Promise<PoliticianFilterOptions> {
  const all = await getPoliticians();

  const boroughs = [
    ...new Set(
      all.flatMap((p) =>
        p.borough
          .split(/[/,]/)
          .map((b) => b.trim())
          .filter(Boolean),
      ),
    ),
  ].sort();

  const parties = [
    ...new Set(
      all.flatMap((p) =>
        p.allParties ?? (p.party && p.party !== "N/A" ? [p.party] : []),
      ),
    ),
  ].sort();

  const stances = [
    ...new Set(all.map((p) => p.political_stance).filter(Boolean)),
  ].sort();

  const districts = [
    ...new Set(all.map((p) => p.district ?? "").filter(Boolean)),
  ].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);

    return !Number.isNaN(na) && !Number.isNaN(nb)
      ? na - nb
      : a.localeCompare(b);
  });

  const committees = [...new Set(all.flatMap((p) => p.committees ?? []))].sort();

  return {
    boroughs,
    parties,
    stances,
    districts,
    committees,
  };
}

export async function sendOpenAiChat(
  messages: OpenAiChatMessage[],
): Promise<OpenAiChatMessage> {
  const safeMessages = messages
    .filter(
      (msg) => typeof msg.content === "string" && msg.content.trim().length > 0,
    )
    .map((msg) => ({
      role: msg.role,
      content: msg.content.trim(),
    }));

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