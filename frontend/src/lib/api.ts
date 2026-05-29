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
  impact?: string;
  affects?: string;
  topic_tags?: string[];
  districts?: number[];
  zips?: string[];
};

export type District = {
  id: number;
  name: string;
  rep: string;
  issues: string[];
  zip_codes?: string[];
  phone?: string;
  email?: string;
  website?: string;
  office?: string;
  political_stance?: string;
};

function fallback(): { policies: PolicyBriefing[] } {
  return {
    policies: [
      { id: "mock-1", title: "Intro 123: Local Law to amend the administrative code...", source_url: "#", source_type: "Legislation", published_date: new Date().toISOString() },
      { id: "mock-2", title: "Committee on Housing and Buildings Transcript", source_url: "#", source_type: "Transcript", published_date: new Date().toISOString() },
    ]
  };
}

export async function getDistricts(): Promise<District[]> {
  try {
    const politicians = await getPoliticians();
    const councilMembers = politicians.filter((p) => p.level === "City Council");
    return councilMembers.map((p) => {
      const distId = parseInt(p.district ?? "");
      return {
        id: isNaN(distId) ? 0 : distId,
        name: p.represents || p.neighborhoods?.join(", ") || `District ${distId}`,
        rep: p.name || "Council Member",
        issues: [],
        zip_codes: p.zip_codes || [],
        phone: p.phone,
        email: p.email,
        website: p.website || (distId ? `https://council.nyc.gov/district-${distId}/` : undefined),
        office: p.level || "City Council",
        political_stance: p.political_stance,
      };
    }).filter((d) => d.id > 0);
  } catch (e) {
    console.error("Failed to load districts from politicians", e);
    return [];
  }
}

export async function getDistrictsMap(): Promise<unknown> {
  try {
    const res = await fetch("/boundaries-districts.geojson", { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to load GeoJSON");
    return await res.json();
  } catch (e) { console.warn("District map fetch failed", e); return null; }
}

export async function getRecentPolicies(
  borough?: string,
  area?: string,
  days?: number,
  limit?: number,
): Promise<{ policies: PolicyBriefing[] }> {
  try {
    const params = new URLSearchParams();
    if (borough) params.append("borough", borough);
    if (area) params.append("area", area);
    if (days) params.append("days", String(days));
    if (limit) params.append("limit", String(limit));

    const res = await fetch(
      `${CIVIC_API}/policies${params.toString() ? `?${params}` : ""}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      console.warn("Policies endpoint unavailable, using fallback");
      return fallback();
    }

    const data = (await res.json()) as any;
    const raw: any[] = Array.isArray(data) ? data : (data?.policies ?? data?.items ?? []);
    if (!Array.isArray(raw)) return fallback();

    return {
      policies: raw.map((p: any) => {
        const m = p.metadata || p.metadata_tags || {};
        return {
          id: p.id || p.source_url || Math.random().toString(),
          title: p.title || "Untitled Record",
          source_url: p.source_url || m.source_url || "#",
          source_type: p.source_type || m.source_type || "Record",
          published_date: p.published_date || m.published_date || new Date().toISOString(),
          impact: p.impact || m.impact || m.summary || "",
          affects: p.affects || m.affects || m.affected_groups || "",
          topic_tags: p.topic_tags || m.tags || [],
          // districts now populated by backend inference from title/URL
          districts: (
            p.districts ||
            m.council_districts ||
            m.districts ||
            (m.council_district ? [m.council_district] : [])
          )
            .map((d: any) => parseInt(d))
            .filter((d: any) => !isNaN(d)),
          zips: p.zips || m.zip_codes || m.zips || (m.zip ? [m.zip] : []),
        };
      }),
    };
  } catch (e) { console.warn("Fallback policies", e); return fallback(); }
}

export type ChatExtra = {
  zip?: string; borough?: string; community_board?: string;
  issue_area?: string; timeframe?: string; location_scope?: string; profile_active?: string;
};
export type HealthResponse = { status?: string; db_connected?: boolean; has_data?: boolean; error?: string; total_records?: number; };
export type PoliticianFilterOptions = { boroughs: string[]; stances: string[]; parties: string[]; districts: string[]; committees: string[]; };
export type OpenAiChatRole = "system" | "user" | "assistant";
export type OpenAiChatMessage = { role: OpenAiChatRole; content: string; };

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

const TIMEOUT_MSG = "Policy backend did not respond in time. Start the FastAPI server (port 8000) or set BACKEND_PROD_URL.";

export async function checkHealth(): Promise<HealthResponse> {
  let res: Response;
  try { res = await fetch(`${CIVIC_API}/health`, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(125_000) }); }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); throw new Error(/timeout|aborted/i.test(msg) ? TIMEOUT_MSG : (msg || "Health check failed.")); }
  let json: HealthResponse & { detail?: string };
  try { json = (await res.json()) as HealthResponse & { detail?: string }; }
  catch { throw new Error(`Health check (${res.status}): invalid response.`); }
  if (!res.ok) { const raw = (json.detail || json.error || `HTTP ${res.status}`).trim(); throw new Error(/timeout|aborted/i.test(raw) ? TIMEOUT_MSG : raw); }
  return json;
}

function chatErr(status: number, data: unknown): string {
  let msg: string | undefined;
  if (typeof data === "object" && data !== null) { const d = data as Record<string, unknown>; if (typeof d.detail === "string") msg = d.detail.trim(); else if (typeof d.error === "string") msg = d.error.trim(); }
  if (status === 429) return "Too many requests. Please wait a moment.";
  if (status === 503) return msg || "AI service temporarily busy.";
  if (status === 502) return msg || "Trouble reaching AI service.";
  return msg || `Request failed: ${status}`;
}

export async function sendChat(query: string, extra?: ChatExtra): Promise<PolicyResponse> {
  const dem = buildDemographics(extra);
  const body: { query: string; demographics?: Record<string, string> } = { query };
  if (Object.keys(dem).length > 0) body.demographics = dem;
  const res = await fetch(`${CIVIC_API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const raw = await res.text();
  let data: unknown = {};
  if (raw) { try { data = JSON.parse(raw); } catch { data = { detail: raw.slice(0, 400) }; } }
  if (!res.ok) throw new Error(chatErr(res.status, data));
  const env = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const payload = "reply" in env && env.reply !== undefined ? env.reply : data;
  const normalized = normalizePolicyReply(payload);
  const retrieval_sources = parseRetrievalSourcesEnvelope(env, 12);
  const su = env.sources_used;
  return { ...normalized, retrieval_sources, sources_used: typeof su === "number" && Number.isFinite(su) ? su : retrieval_sources.length };
}

export type FloatingRetrievalSource = { title: string; source_url: string; source_type: string; published_date?: string; };
export type FloatingChatRagResult = { mode: "rag"; markdown: string; sources_used: number; retrieval_tier: RetrievalTier; retrieval_sources: FloatingRetrievalSource[]; };
export type FloatingChatOpenAiResult = { mode: "openai_fallback"; markdown: string; sources_used: number; retrieval_tier: RetrievalTier; retrieval_sources: FloatingRetrievalSource[]; };
export type FloatingChatResult = FloatingChatRagResult | FloatingChatOpenAiResult;
export type FloatingChatTurn = { role: "user" | "assistant"; content: string; };

export async function postFloatingChatOrchestrated(p: { messages: FloatingChatTurn[]; currentPath?: string; demographics?: Record<string, string>; }): Promise<FloatingChatResult> {
  if (!p.messages.length) throw new Error("At least one message required.");
  const payload: Record<string, unknown> = { messages: p.messages, currentPath: p.currentPath?.trim() || "/" };
  if (p.demographics && Object.keys(p.demographics).length > 0) payload.demographics = p.demographics;
  const res = await fetch(`${CIVIC_API}/floating-chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
  const data = (await res.json()) as unknown;
  if (!res.ok) throw new Error(chatErr(res.status, data));
  if (typeof data !== "object" || data === null || typeof (data as any).mode !== "string") throw new Error("Invalid floating chat response.");
  const d = data as Record<string, unknown>;
  const su = Number(d.sources_used);
  const rt = d.retrieval_tier;
  const tier: RetrievalTier = (rt === "vector" || rt === "lexical" || rt === "recent" || rt === "none") ? rt : "none";
  const rs = parseRetrievalSourcesEnvelope(d, 8) as FloatingRetrievalSource[];
  if (d.mode === "rag" || d.mode === "openai_fallback") {
    const md = d.markdown;
    if (typeof md !== "string" || !md.trim()) throw new Error("Missing markdown in floating chat response.");
    return { mode: d.mode as any, markdown: md.trim(), sources_used: Number.isFinite(su) ? su : 0, retrieval_tier: tier, retrieval_sources: rs };
  }
  throw new Error("Invalid floating chat mode.");
}

export async function getPoliticians(f?: { borough?: string; stance?: string; }): Promise<Politician[]> {
  const p = new URLSearchParams();
  if (f?.borough) p.set("borough", f.borough);
  if (f?.stance) p.set("stance", f.stance);
  const res = await fetch(`${CIVIC_API}/politicians${p.size ? `?${p}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} from /api/civic/politicians`);
  return ((await res.json()) as { politicians: Politician[] }).politicians ?? [];
}

export async function getPoliticianFilters(): Promise<PoliticianFilterOptions> {
  const all = await getPoliticians();
  const boroughs = [...new Set(all.flatMap((p) => p.borough.split(/[/,]/).map((b) => b.trim()).filter(Boolean)))].sort();
  const parties = [...new Set(all.flatMap((p) => p.allParties ?? (p.party && p.party !== "N/A" ? [p.party] : [])))].sort();
  const stances = [...new Set(all.map((p) => p.political_stance).filter(Boolean))].sort();
  const districts = [...new Set(all.map((p) => p.district ?? "").filter(Boolean))].sort((a, b) => { const na = Number(a), nb = Number(b); return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b); });
  const committees = [...new Set(all.flatMap((p) => p.committees ?? []))].sort();
  return { boroughs, parties, stances, districts, committees };
}

export async function sendOpenAiChat(messages: OpenAiChatMessage[]): Promise<OpenAiChatMessage> {
  const safe = messages.filter((m) => typeof m.content === "string" && m.content.trim().length > 0).map((m) => ({ role: m.role, content: m.content.trim() }));
  const res = await fetch(`${LLM_API}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: safe }), cache: "no-store" });
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    if (typeof data === "object" && data !== null && "detail" in data) { const d = (data as { detail: unknown }).detail; if (typeof d === "string") msg = d; else if (Array.isArray(d)) msg = JSON.stringify(d); }
    throw new Error(msg);
  }
  if (typeof data === "object" && data !== null && "message" in (data as any)) {
    const m = (data as any).message;
    if (typeof m === "object" && m !== null && m.role === "assistant" && typeof m.content === "string") return { role: "assistant", content: m.content };
  }
  throw new Error("Invalid chat response shape.");
}