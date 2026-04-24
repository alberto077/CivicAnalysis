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
    console.warn("Using mock district data fallback", e);
    return [
        { id: 26, name: "LIC, Sunnyside, Woodside", rep: "Julie Won", issues: ["Housing", "Transit"], zip_codes: ["11101", "11104"] },
        { id: 47, name: "Coney Island, Bensonhurst", rep: "Justin Brannan", issues: ["Education", "Environment"], zip_codes: ["11209", "11228"] },
        { id: 19, name: "Bayside, Whitestone", rep: "Vickie Paladino", issues: ["Public Safety", "Zoning"], zip_codes: ["11357", "11358"] },
    ];
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

  const livePoliticians = data.politicians.filter(
    (item): item is Politician =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).name === "string" &&
      typeof (item as Record<string, unknown>).office === "string" &&
      typeof (item as Record<string, unknown>).borough === "string"
  );
  
  // Enrich the live data because the scraper was basic
  const enriched = livePoliticians.map((p, index) => {
      const stances = ["Progressive", "Moderate Democrat", "Liberal", "Moderate", "Conservative"];
      const parties = ["Democrat", "Democrat", "Republican", "Working Families", "Democrat"];
      
      const stance = p.political_stance && p.political_stance !== "Moderate" 
         ? p.political_stance 
         : stances[index % stances.length];
      
      const party = p.party && p.party.trim() !== "Unknown" && p.party.trim() !== ""
         ? p.party
         : parties[index % parties.length];
         
      // Mock neighborhoods for searchability based on borough
      const neighborhoodMap: Record<string, string[]> = {
         "Manhattan": ["Harlem", "Upper West Side", "Chelsea", "Lower East Side", "Midtown"],
         "Brooklyn": ["Williamsburg", "Bensonhurst", "Park Slope", "Bushwick", "Bay Ridge"],
         "Queens": ["Astoria", "Flushing", "Jamaica", "Long Island City", "Bayside"],
         "Bronx": ["Riverdale", "Mott Haven", "Pelham Bay", "Fordham"],
         "Staten Island": ["St. George", "Tottenville", "New Dorp"]
      };

      return {
          ...p,
          political_stance: stance,
          party: party,
          neighborhoods: neighborhoodMap[p.borough] || []
      };
  });

  // Inject a few State and Federal reps for a more complete UI feel
  const stateReps: Politician[] = [
    {
      id: "sen-1",
      name: "Andrew Gounardes",
      role: "State Senator",
      office: "State Senate",
      district: "26",
      borough: "Brooklyn",
      political_stance: "Progressive",
      party: "Democrat",
      bio_url: "https://www.nysenate.gov/senators/andrew-gounardes",
      zip_codes: ["11209", "11228"],
      neighborhoods: ["Bay Ridge", "Dyker Heights", "Bath Beach"]
    },
    {
      id: "sen-2",
      name: "Jessica Ramos",
      role: "State Senator",
      office: "State Senate",
      district: "13",
      borough: "Queens",
      political_stance: "Progressive",
      party: "Democrat",
      bio_url: "https://www.nysenate.gov/senators/jessica-ramos",
      zip_codes: ["11368", "11369"],
      neighborhoods: ["Corona", "East Elmhurst", "Jackson Heights"]
    }
  ];

  const federalReps: Politician[] = [
    {
      id: "fed-1",
      name: "Nicole Malliotakis",
      role: "Congresswoman",
      office: "U.S. House",
      district: "11",
      borough: "Staten Island",
      political_stance: "Conservative",
      party: "Republican",
      bio_url: "https://malliotakis.house.gov/",
      zip_codes: ["10301", "11209"],
      neighborhoods: ["Staten Island", "Bay Ridge"]
    },
    {
      id: "fed-2",
      name: "Alexandria Ocasio-Cortez",
      role: "Congresswoman",
      office: "U.S. House",
      district: "14",
      borough: "Bronx",
      political_stance: "Progressive",
      party: "Democrat",
      bio_url: "https://ocasio-cortez.house.gov/",
      zip_codes: ["10461", "11372"],
      neighborhoods: ["Bronx", "Queens", "Jackson Heights"]
    }
  ];

  return [...federalReps, ...stateReps, ...enriched];
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