// data layer for politician cards from server-side api: /api/civic/politicians

export type GovLevel =
    | "City Council"
    | "State Assembly"
    | "State Senate"
    | "U.S. House"
    | "U.S. Senate";

export interface Politician {
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

export interface FilterOptions {
    boroughs: string[];
    parties: string[];
    stances: string[];
    districts: string[];
    committees: string[];
}

export interface FilterState {
    search: string;
    boroughs: string[];
    level: GovLevel | "All";
    party: string;
    stance: string;
    district: string;
    committee: string;
}



// in-memory session cache: avoids re-fetching on tab switches
// page reload always re-fetches fresh data from the route

interface SessionCache {
    all: Politician[] | null;
    byLevel: Partial<Record<GovLevel, Politician[]>>;
    fetchedAt: number | null;
}

const SESSION: SessionCache = { all: null, byLevel: {}, fetchedAt: null };
const SESSION_TTL_MS = 10 * 60 * 1000; // 10 min — route itself caches 24h

function cacheValid(): boolean {
    return (
        SESSION.all !== null &&
        SESSION.fetchedAt !== null &&
        Date.now() - SESSION.fetchedAt < SESSION_TTL_MS
    );
}




// core fetch — all data goes through /api/civic/politicians (server proxy)
// called by /src/app/api/civic/representatives/route.ts (representatives page)

export async function fetchAllPoliticians(): Promise<Politician[]> {
    if (cacheValid() && SESSION.all) return SESSION.all;

    const res = await fetch("/api/civic/politicians", { cache: "no-store" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status} from /api/civic/politicians`);
    }

    const data = (await res.json()) as { politicians: Politician[] };
    const politicians = data.politicians ?? [];

    SESSION.all = politicians;
    SESSION.fetchedAt = Date.now();
    SESSION.byLevel = {};

    return politicians;
}

export async function fetchByLevel(level: GovLevel): Promise<Politician[]> {
    if (cacheValid() && SESSION.byLevel[level]) return SESSION.byLevel[level]!;
    const all = await fetchAllPoliticians();
    const filtered = all.filter((p) => p.level === level);
    SESSION.byLevel[level] = filtered;
    return filtered;
}

export function invalidateCache(): void {
    SESSION.all = null;
    SESSION.byLevel = {};
    SESSION.fetchedAt = null;
}




// filtering — always derived from live data

export function filterPoliticians(
    politicians: Politician[],
    filters: Partial<FilterState>
): Politician[] {
    const {
        search = "", boroughs = [], level = "All", party = "All",
        stance = "All", district = "All", committee = "All",
    } = filters;
    const q = search.toLowerCase().trim();

    return politicians.filter((p) => {
        if (level !== "All" && p.level !== level) return false;
        if (party !== "All" && p.party !== party) return false;
        if (stance !== "All" && p.political_stance !== stance) return false;
        if (district !== "All" && p.district !== district) return false;
        if (committee !== "All" && !p.committees.includes(committee)) return false;
        if (boroughs.length > 0 && !boroughs.some((b) =>
            p.borough.toLowerCase().includes(b.toLowerCase())
        )) return false;
        if (q) {
            const hay = [
                p.name, p.office, p.borough, p.district ?? "", p.party,
                p.political_stance, p.represents ?? "",
                ...p.neighborhoods, ...p.zip_codes, ...p.committees,
            ].join(" ").toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

// returns filter menu options for the dropdowns
export function getFilterOptions(politicians: Politician[]): FilterOptions {
    return {
        boroughs: [
            ...new Set(
                politicians.flatMap((p) =>
                    p.borough.split(/[\/,]/).map((b) => b.trim()).filter(Boolean)
                )
            ),
        ].sort(),
        parties: [...new Set(politicians.map((p) => p.party).filter(Boolean))].sort(),
        stances: [...new Set(politicians.map((p) => p.political_stance).filter(Boolean))].sort(),
        districts: [
            ...new Set(politicians.map((p) => p.district ?? "").filter(Boolean)),
        ].sort((a, b) => {
            const na = Number(a), nb = Number(b);
            return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
        }),
        committees: [...new Set(politicians.flatMap((p) => p.committees))].sort(),
    };
}

// bio/website links (called by PoliticianCard)
export function getLearnMoreUrl(p: Politician): string {
    if (p.bio_url?.trim()) return p.bio_url.trim();
    if (p.website?.trim()) return p.website.trim();
    switch (p.level) {
        case "City Council":
            return p.district ? `https://council.nyc.gov/district-${p.district}/` : "https://council.nyc.gov/districts/";
        case "State Assembly": return "https://nyassembly.gov/mem/";
        case "State Senate": return "https://www.nysenate.gov/senators-committees";
        case "U.S. House": return "https://www.house.gov/representatives/find-your-representative";
        case "U.S. Senate": return "https://www.senate.gov/states/NY/intro.htm";
    }
}



// back-compat shims — existing callers in api.ts keep working

export async function getPoliticians(filters?: {
    borough?: string;
    stance?: string;
}): Promise<Politician[]> {
    const all = await fetchAllPoliticians();
    if (!filters) return all;
    return all.filter((p) => {
        if (filters.borough && filters.borough.toLowerCase() !== "all") {
            if (!p.borough.toLowerCase().includes(filters.borough.toLowerCase())) return false;
        }
        if (filters.stance && filters.stance.toLowerCase() !== "all") {
            if (p.political_stance !== filters.stance) return false;
        }
        return true;
    });
}

export async function getPoliticianFilters() {
    const all = await fetchAllPoliticians();
    const opts = getFilterOptions(all);
    return { boroughs: opts.boroughs, stances: opts.stances };
}