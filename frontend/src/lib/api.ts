export type ChatResponse = {
  reply: string;
  sources_used?: number;
};

export type ChatExtra = {
  zip?: string;
  borough?: string;
  community_board?: string;
};

/** Same-origin proxy (see app/api/civic/*) — avoids CORS and localhost vs 127.0.0.1 issues. */
const CIVIC_API = "https://civic-spiegel.onrender.com";

/** Plain "Not Found" usually means the Next proxy hit the wrong host/path (wrong API_INTERNAL_BASE_URL). */
export function formatUserFacingApiError(message: string): string {
  const t = message.trim();
  if (t === "Not Found") {
    return `${t} — Configure API_INTERNAL_BASE_URL (or BACKEND_URL) to your FastAPI server’s public URL (where /api/health works), not your frontend site URL.`;
  }
  return message;
}

function buildDemographics(extra?: ChatExtra): Record<string, string> {
  if (!extra) return {};
  const d: Record<string, string> = {};
  if (extra.zip?.trim()) d.zip = extra.zip.trim();
  if (extra.borough?.trim()) d.borough = extra.borough.trim();
  if (extra.community_board?.trim()) d.community_board = extra.community_board.trim();
  return d;
}

export type HealthResponse = {
  status?: string;
  db_connected?: boolean;
  has_data?: boolean;
  error?: string;
};

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${CIVIC_API}/health`, {
    method: "GET",
    cache: "no-store",
  });

  const text = await res.text();
  let json: HealthResponse & { error?: string; detail?: string } = {};
  try {
    json = text ? (JSON.parse(text) as typeof json) : {};
  } catch {
    if (!res.ok) throw new Error(text || `Health check failed: ${res.status}`);
    throw new Error("Invalid health response");
  }

  if (!res.ok) {
    const hint =
      json.detail ||
      json.error ||
      (json as { error?: string }).error ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(hint);
  }

  return json;
}

export async function sendChat(
  query: string,
  extra?: ChatExtra,
): Promise<ChatResponse> {
  const demographics = buildDemographics(extra);

  const body: { query: string; demographics?: Record<string, string> } = {
    query,
  };
  if (Object.keys(demographics).length > 0) {
    body.demographics = demographics;
  }

  const res = await fetch(`${CIVIC_API}/briefing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `Invalid response (${res.status})`);
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    if (typeof json === "object" && json !== null && "detail" in json) {
      const d = (json as { detail: unknown }).detail;
      if (typeof d === "string") message = d;
      else if (Array.isArray(d)) message = JSON.stringify(d);
    } else if (text) message = text;
    throw new Error(message);
  }

  if (
    json == null ||
    typeof json !== "object" ||
    !("reply" in json) ||
    typeof (json as ChatResponse).reply !== "string"
  ) {
    throw new Error("Invalid briefing response shape");
  }

  return json as ChatResponse;
}
