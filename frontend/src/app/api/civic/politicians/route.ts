import { NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// browser UA so government sites don't block us
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";


// types ---------------------------------------------------------------------------------
type GovLevel =
  | "City Council"
  | "State Assembly"
  | "State Senate"
  | "U.S. House"
  | "U.S. Senate";

interface Politician {
  id: string;
  name: string;
  office: string;
  level: GovLevel;
  party: string;
  political_stance: string;
  borough: string;
  district: string | null;
  neighborhoods: string[];
  zip_codes: string[];
  committees: string[];
  bio_url: string | null;
  photo_url: string | null;
  phone?: string;
  email?: string;
  website?: string;
  term_ends?: string;
  next_election?: string;
  senate_class?: string;
  represents?: string;
}


// helper functions ---------------------------------------------------------------------------------

function partyToStance(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("working families") || p.includes("green")) return "Progressive";
  if (p.includes("democrat")) return "Liberal";
  if (p.includes("republican") || p.includes("conservative")) return "Conservative";
  if (p.includes("independent") || p.includes("libertarian")) return "Independent";
  return "Moderate";
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

// NYC Council district --> borough (official mapping)
function councilBorough(d: number): string {
  if (d >= 1 && d <= 10) return "Manhattan";
  if (d >= 11 && d <= 18) return "Bronx";
  if (d >= 19 && d <= 32) return "Queens";
  if (d >= 33 && d <= 48) return "Brooklyn";
  if (d >= 49 && d <= 51) return "Staten Island";
  return "New York City";
}

// NY Assembly district --> NYC borough (rough mapping; upstate shown explicitly)
function assemblyBorough(d: number): string {
  if (d >= 36 && d <= 64) return "Brooklyn";
  if (d >= 65 && d <= 76) return "Manhattan";
  if (d >= 77 && d <= 90) return "Bronx";
  if (d >= 22 && d <= 35) return "Queens";
  if (d >= 60 && d <= 64) return "Staten Island";
  return "New York";
}

// NY Senate district --> NYC borough (rough)
function senateBorough(d: number): string {
  if (d >= 21 && d <= 27) return "Brooklyn";
  if (d >= 24 && d <= 27) return "Manhattan";
  if (d === 23) return "Staten Island";
  if (d >= 28 && d <= 33) return "Bronx";
  if (d >= 10 && d <= 16) return "Queens";
  return "New York";
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}



// NYC City Council — council.nyc.gov/districts/

async function fetchCityCouncil(): Promise<Politician[]> {
  const res = await fetch("https://council.nyc.gov/districts/", {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`Council page HTTP ${res.status}`);
  const html = await res.text();

  const members: Politician[] = [];
  const seen = new Set<string>();
  const re = /href="https?:\/\/council\.nyc\.gov\/district-(\d+)\/[^"]*"[^>]*>([\s\S]+?)<\/a>/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    const district = m[1];
    if (seen.has(district)) continue;

    const raw = stripHtml(m[2]);
    // skip pure numbers, very short strings, and nav links
    if (/^\d+$/.test(raw) || raw.length < 4 || raw.toLowerCase().includes("district info")) continue;

    seen.add(district);
    const d = Number(district);

    // TODO: improve to scrape for party affiliation, political_stance, bio_url, photo_url, zip_codes, neighborhoods, committees
    members.push({
      id: `nyc-council-d${district}`,
      name: raw,
      office: "NYC Council Member",
      level: "City Council",
      party: "Democrat",
      political_stance: "Liberal",
      borough: councilBorough(d),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],
      bio_url: `https://council.nyc.gov/district-${district}/`,
      photo_url: null,
    });
  }

  console.log(`[Council scrape] ${members.length} members`);
  return members;
}



// NY State Assembly — nyassembly.gov/mem/

async function fetchAssembly(): Promise<Politician[]> {
  const res = await fetch("https://nyassembly.gov/mem/", {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`Assembly page HTTP ${res.status}`);
  const html = await res.text();

  const members: Politician[] = [];
  const seen = new Set<string>();
  const linkRe = /href="(?:https?:\/\/nyassembly\.gov)?\/mem\/([\w\-'.]+)"[^>]*>([\s\S]+?)<\/a>/g;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];

    // skip search / email / non-member links
    if (slug === "search" || slug === "email" || slug === "leadership" || slug.includes("@")) continue;

    const rawText = stripHtml(m[2]);
    const districtMatch = rawText.match(/District\s+(\d+)/i);
    if (!districtMatch) continue;

    const district = districtMatch[1];
    if (seen.has(district)) continue;
    seen.add(district);

    // name = everything before "District"
    const name = rawText.replace(/\s*District\s+\d+.*$/i, "").replace(/\s+/g, " ").trim();
    if (!name || name.length < 3) continue;

    // email: look in the next 600 chars of raw HTML
    const ahead = html.slice(m.index, m.index + 600);
    const emailM = ahead.match(/mailto:([a-z0-9._%-]+@nyassembly\.gov)/i);
    const email = emailM ? emailM[1] : undefined;


    // TODO: improve to get party affiliation, political_stance, bio_url, photo_url, zip_codes, neighborhoods, committees
    const d = Number(district);
    members.push({
      id: `ny-assembly-${slug}`,
      name,
      office: "NY Assembly Member",
      level: "State Assembly",
      party: "Unknown",
      political_stance: "Moderate",
      borough: assemblyBorough(d),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],
      bio_url: `https://nyassembly.gov/mem/${slug}`,
      photo_url: null,
      email,
    });
  }

  console.log(`[Assembly scrape] ${members.length} members`);
  return members;
}



// NY State Senate — NYS_SENATE_API_KEY 

interface NYSenatorItem {
  memberId?: number;
  chamber?: string;
  incumbent?: boolean;
  fullName?: string;
  shortName?: string;
  imgName?: string;
  sessionYear?: number;
  districtCode?: number;
}

async function fetchSenate(): Promise<Politician[]> {
  const apiKey = process.env.NYS_SENATE_API_KEY;
  if (!apiKey) throw new Error("NYS_SENATE_API_KEY not set");

  // TODO: improve to scrape by dynamic session year; get party affiliation, political_stance, bio_url, photo_url, zip_codes, neighborhoods, committees
  // fetch all 2025 session members, filter to incumbent senators only
  const res = await fetch(
    `https://legislation.nysenate.gov/api/3/members/2025?key=${apiKey}&limit=200&full=true`,
    { signal: AbortSignal.timeout(15_000), next: { revalidate: 86400 } }
  );

  if (!res.ok) throw new Error(`NY Senate API HTTP ${res.status}`);
  const data = (await res.json()) as { success?: boolean; result?: { items?: NYSenatorItem[] } };

  const items = (data.result?.items ?? []).filter(
    (m) => m.incumbent === true && m.chamber === "SENATE"
  );

  return items.map((m): Politician => {
    const district = m.districtCode != null ? String(m.districtCode) : null;
    const d = Number(district ?? 0);
    // photo: nysenate.gov has member images at a known CDN path
    const photoUrl = m.imgName
      ? `https://www.nysenate.gov/sites/default/files/styles/4x3/public/${m.imgName}`
      : null;

    return {
      id: `ny-senate-${m.memberId ?? m.shortName}`,
      name: m.fullName?.trim() ?? "Unknown",
      office: "NY State Senator",
      level: "State Senate",
      party: "Unknown",       // API does not expose party affiliation
      political_stance: "Moderate",
      borough: senateBorough(d),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],
      bio_url: `https://www.nysenate.gov/senators/${(m.shortName ?? "").toLowerCase()}`,
      photo_url: photoUrl,
    };
  });
}



// US House & Senate 

// TODO: GovTrack API is deprecated, replace with new API or scrape from scratch !!! 
interface GovTrackRole {
  id?: number;
  person?: { name?: string; firstname?: string; lastname?: string; link?: string };
  district?: number | null;
  party?: string;
  phone?: string;
  website?: string;
  senator_class?: string;
  enddate?: string | null;
}

const SENATE_CLASS_YEAR: Record<string, string> = { "1": "2030", "2": "2026", "3": "2028" };

function usHouseBorough(d: number): string {
  if ([5, 6].includes(d)) return "Queens";
  if ([7, 8, 9, 10].includes(d)) return "Brooklyn";
  if ([11].includes(d)) return "Staten Island";
  if ([12].includes(d)) return "Manhattan";
  if ([13, 14, 15, 16].includes(d)) return "Bronx";
  if (d >= 17 && d <= 22) return "Hudson Valley / Upstate";
  return "New York";
}

async function fetchGovTrack(roleType: "representative" | "senator"): Promise<Politician[]> {
  const res = await fetch(
    `https://www.govtrack.us/api/v2/role?current=true&state=NY&role_type=${roleType}&limit=50&format=json`,
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000), next: { revalidate: 86400 } }
  );
  if (!res.ok) throw new Error(`GovTrack ${roleType} HTTP ${res.status}`);
  const data = (await res.json()) as { objects?: GovTrackRole[] };

  return (data.objects ?? []).map((r, i): Politician => {
    const level: GovLevel = roleType === "representative" ? "U.S. House" : "U.S. Senate";
    const party = r.party?.trim() ?? "Unknown";
    const district = r.district != null ? String(r.district) : null;
    const senClass = r.senator_class ? String(r.senator_class) : undefined;
    const name =
      r.person?.name?.trim() ??
      `${r.person?.firstname ?? ""} ${r.person?.lastname ?? ""}`.trim() ??
      "Unknown";

    return {
      id: r.id ? `${roleType === "representative" ? "us-house" : "us-senate"}-${r.id}` : `${roleType}-${i}`,
      name,
      office: roleType === "representative" ? "U.S. Representative" : "U.S. Senator",
      level,
      party,
      political_stance: partyToStance(party),
      borough: roleType === "senator" ? "New York State" : usHouseBorough(Number(district ?? 0)),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],
      bio_url: r.person?.link ? `https://www.govtrack.us${r.person.link}` : (r.website ?? null),
      photo_url: null,
      phone: r.phone?.trim(),
      website: r.website?.trim(),
      term_ends: r.enddate ?? undefined,
      senate_class: senClass ? `Class ${senClass}` : undefined,
      next_election: senClass ? (SENATE_CLASS_YEAR[senClass] ?? "2026") : "2026",
      represents:
        level === "U.S. Senate"
          ? "All of New York State"
          : `New York's ${ordinal(Number(district ?? 0))} Congressional District`,
    };
  });
}




// backend data inference ----------------------------------------------------------------------

function inferLevel(office: string): GovLevel {
  const o = office.toLowerCase();
  if (o.includes("council")) return "City Council";
  if (o.includes("assembly")) return "State Assembly";
  if (o.includes("senator") && !o.includes("u.s")) return "State Senate";
  if (o.includes("representative") || o.includes("congress") || o.includes("u.s. house")) return "U.S. House";
  if (o.includes("u.s. senator") || o.includes("us senator")) return "U.S. Senate";
  return "City Council";
}

function enrichBackend(raw: Partial<Politician>[]): Politician[] {
  return raw
    .filter((p) => typeof p.name === "string" && typeof p.office === "string")
    .map((p, i): Politician => {
      const level = p.level ?? inferLevel(p.office ?? "");
      const party = p.party?.trim() || "Unknown";
      return {
        id: String(p.id ?? `backend-${i}`),
        name: p.name!.trim(),
        office: p.office!.trim(),
        level,
        party,
        political_stance: p.political_stance?.trim() || partyToStance(party),
        borough: p.borough?.trim() || "New York",
        district: p.district ?? null,
        neighborhoods: p.neighborhoods ?? [],
        zip_codes: p.zip_codes ?? [],
        committees: p.committees ?? [],
        bio_url: p.bio_url ?? null,
        photo_url: p.photo_url ?? null,
        phone: p.phone,
        email: p.email,
        website: p.website,
        term_ends: p.term_ends,
        next_election: p.next_election,
        senate_class: p.senate_class,
        represents: p.represents,
      };
    });
}


// aggregate all sources ------------------------------------------------------------------------

async function fetchAllLive(): Promise<Politician[]> {
  const labels = ["City Council", "State Assembly", "State Senate", "US House", "US Senate"];
  const settled = await Promise.allSettled([
    fetchCityCouncil(),
    fetchAssembly(),
    fetchSenate(),
    fetchGovTrack("representative"),
    fetchGovTrack("senator"),
  ]);

  const all = settled.flatMap((r, i) => {
    if (r.status === "fulfilled") {
      console.log(`[/api/civic/politicians] ${labels[i]}: ${r.value.length}`);
      return r.value;
    }
    console.warn(`[/api/civic/politicians] ${labels[i]} failed:`, (r.reason as Error)?.message ?? r.reason);
    return [];
  });

  // deduplicate by normalized name
  const seen = new Set<string>();
  return all.filter((p) => {
    const key = p.name.toLowerCase().replace(/[^a-z]/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}



// route handler ------------------------------------------------------------------------------------

const CACHE = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  // try python backend first
  try {
    const up = await fetch(`${getBackendOrigin()}/api/politicians${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (up.ok) {
      const json = (await up.json()) as { politicians?: Partial<Politician>[] };
      if (Array.isArray(json.politicians) && json.politicians.length > 0) {
        const enriched = enrichBackend(json.politicians);
        console.log(`[/api/civic/politicians] backend: ${enriched.length}`);
        return NextResponse.json(
          { politicians: enriched, source: "backend", fetched_at: new Date().toISOString() },
          { status: 200, headers: CACHE }
        );
      }
    }
  } catch {
    // backend unreachable - fall through to live scraping
  }

  // live html scraping
  try {
    const politicians = await fetchAllLive();
    console.log(`[/api/civic/politicians] total: ${politicians.length}`);
    return NextResponse.json(
      { politicians, source: "live_scrape", fetched_at: new Date().toISOString() },
      { status: 200, headers: CACHE }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { politicians: [], error: msg, fetched_at: new Date().toISOString() },
      { status: 200, headers: CACHE }
    );
  }
}