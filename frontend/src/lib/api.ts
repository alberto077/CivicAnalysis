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

export type ChatExtra = {
  zip?: string;
  borough?: string;
  community_board?: string;
};

export type HealthResponse = {
  status?: string;
  db_connected?: boolean;
  has_data?: boolean;
  error?: string;
};

export type Politician = {
  id?: number | null;
  name: string;
  office: string;
  borough: string;
  district?: string | null;
  party?: string | null;
  political_stance: string;
  bio_url?: string | null;
  data_source?: string;
};

export type PoliticianFilterOptions = {
  boroughs: string[];
  stances: string[];
};


const CIVIC_API = "/api/civic";

function buildDemographics(extra?: ChatExtra): Record<string, string> {
  if (!extra) return {};
  const d: Record<string, string> = {};
  if (extra.zip?.trim()) d.zip = extra.zip.trim();
  if (extra.borough?.trim()) d.borough = extra.borough.trim();
  if (extra.community_board?.trim()) d.community_board = extra.community_board.trim();
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
    let message = `Request failed: ${res.status}`;
    if (typeof data === "object" && data !== null && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") message = d;
      else if (Array.isArray(d)) message = JSON.stringify(d);
    }
    throw new Error(message);
  }

  const payload: unknown =
    typeof data === "object" &&
    data !== null &&
    "reply" in (data as Record<string, unknown>)
      ? (data as { reply: unknown }).reply
      : data;

  const safe: PolicyResponse = {
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

  return safe;
}

export async function getPoliticians(filters?: {
  borough?: string;
  stance?: string;
}): Promise<Politician[]> {
  const params = new URLSearchParams();
  const borough = filters?.borough?.trim();
  if (borough && borough.toLowerCase() !== "all") {
    params.set("borough", borough);
  }
  const stance = filters?.stance?.trim();
  if (stance && stance.toLowerCase() !== "all") {
    params.set("stance", stance);
  }

  const url = `${CIVIC_API}/politicians${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await res.json()) as {
    politicians?: unknown;
    detail?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  }

  if (!Array.isArray(data.politicians)) {
    return [];
  }

  return data.politicians.filter(
    (item): item is Politician =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).name === "string" &&
      typeof (item as Record<string, unknown>).office === "string" &&
      typeof (item as Record<string, unknown>).borough === "string" &&
      typeof (item as Record<string, unknown>).political_stance === "string",
  );
}

export async function getPoliticianFilters(): Promise<PoliticianFilterOptions> {
  const res = await fetch(`${CIVIC_API}/politicians/filters`, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await res.json()) as {
    boroughs?: unknown;
    stances?: unknown;
    detail?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.detail || data.error || `HTTP ${res.status}`);
  }

  const boroughs = Array.isArray(data.boroughs)
    ? data.boroughs.filter((v): v is string => typeof v === "string")
    : [];
  const stances = Array.isArray(data.stances)
    ? data.stances.filter((v): v is string => typeof v === "string")
    : [];

  return { boroughs, stances };
}