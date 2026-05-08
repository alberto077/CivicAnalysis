import { NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";
import { Politician } from "@/lib/politicians";
import {
  fetchCityCouncil,
  fetchAssembly,
  fetchSenate,
  fetchHouse,
  fetchUSSenate
} from "@/lib/scrapers";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
};

function partyToStance(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("working families") || p.includes("green")) return "Progressive";
  if (p.includes("democrat")) return "Liberal";
  if (p.includes("republican") || p.includes("conservative")) return "Conservative";
  if (p.includes("independent") || p.includes("libertarian")) return "Independent";
  return "Moderate";
}

// backend data inference ----------------------------------------------------------------------
function inferLevel(office: string): any {
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
        party: party === "Unknown" ? "N/A" : party,
        political_stance: p.political_stance?.trim() || (party !== "Unknown" ? partyToStance(party) : "N/A"),
        borough: p.borough?.trim() || "New York",
        district: p.district ?? null,
        neighborhoods: p.neighborhoods ?? [],
        zip_codes: p.zip_codes ?? [],
        committees: p.committees ?? [],
        subcommittees: p.subcommittees ?? [],
        caucuses: p.caucuses ?? [],
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

async function fetchAllLive(): Promise<Politician[]> {
  const labels = ["City Council", "State Assembly", "State Senate", "US House", "US Senate"];
  const settled = await Promise.allSettled([
    fetchCityCouncil(),
    fetchAssembly(),
    fetchSenate(),
    fetchHouse(),
    fetchUSSenate(),
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();

  let livePoliticians: Politician[] | null = null;
  let backendPoliticians: Politician[] | null = null;

  // 1. Prefer Live HTML Scraping
  try {
    livePoliticians = await fetchAllLive();
  } catch (e) {
    console.warn("[/api/civic/politicians] Live scrape failed:", e);
  }

  // 2. Try Backend Data (to merge in committees/caucuses if live succeeded, or as fallback)
  try {
    const up = await fetch(`${getBackendOrigin()}/api/politicians${qs ? `?${qs}` : ""}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000), // Short timeout for merge
    });
    if (up.ok) {
      const json = (await up.json()) as { politicians?: Partial<Politician>[] };
      if (Array.isArray(json.politicians)) {
        backendPoliticians = enrichBackend(json.politicians);
      }
    }
  } catch {
    // Backend unreachable
  }

  // 3. Merge Strategy
  if (livePoliticians) {
    if (backendPoliticians) {
      const backendMap = new Map(backendPoliticians.map(p => [p.id, p]));
      for (const lp of livePoliticians) {
        const bp = backendMap.get(lp.id);
        if (bp) {
          if (bp.committees && bp.committees.length > 0) lp.committees = bp.committees;
          if (bp.subcommittees && bp.subcommittees.length > 0) lp.subcommittees = bp.subcommittees;
          if (bp.caucuses && bp.caucuses.length > 0) lp.caucuses = bp.caucuses;
          if (!lp.phone && bp.phone) lp.phone = bp.phone;
          if (!lp.email && bp.email) lp.email = bp.email;
        }
      }
    }

    return NextResponse.json(
      { politicians: livePoliticians, source: backendPoliticians ? "live_scrape_with_backend_merge" : "live_scrape", fetched_at: new Date().toISOString() },
      { status: 200, headers: CACHE }
    );
  }

  // 4. Fallback to Backend Only
  if (backendPoliticians) {
    return NextResponse.json(
      { politicians: backendPoliticians, source: "backend", fetched_at: new Date().toISOString() },
      { status: 200, headers: CACHE }
    );
  }

  return NextResponse.json({ politicians: [] }, { status: 200, headers: CACHE });
}
