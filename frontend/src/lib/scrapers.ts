import * as cheerio from "cheerio";
import { Politician } from "./politicians";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// module-level cache so fetchAssembly + fetchSenate share one API call
let _openStatesCache: Map<string, string> | null = null;

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeParty(raw: string): string {
  const p = (raw || "").toLowerCase().trim();
  if (!p || p === "n/a" || p === "unknown") return "N/A";
  if (p === "blank" || p.includes("blank party")) return "N/A";
  if (p === "d") return "Democrat";
  if (p === "r") return "Republican";
  if (p === "i") return "Independent";
  if (p.includes("working families")) return "Working Families";
  if (p.includes("independence")) return "Independence";
  if (p.includes("independent")) return "Independent";
  if (p.includes("green")) return "Green";
  if (p.includes("democrat")) return "Democrat";
  if (p.includes("republican")) return "Republican";
  if (p.includes("conservative")) return "Conservative";
  if (p.includes("libertarian")) return "Libertarian";
  if (p.includes("reform")) return "Reform";
  return raw.trim();
}

function parseMultiParty(parties: string[]): { party: string; allParties: string[] } {
  const normalized = parties.map(normalizeParty).filter(p => p && p !== "N/A");
  if (normalized.length === 0) return { party: "N/A", allParties: [] };
  const primary = normalized.find(p => p === "Democrat" || p === "Republican") ?? normalized[0];
  return { party: primary, allParties: normalized };
}

function partyToStance(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("working families") || p.includes("green")) return "Progressive";
  if (p.includes("democrat")) return "Liberal";
  if (p.includes("republican") || p.includes("conservative")) return "Conservative";
  if (p.includes("independent") || p.includes("libertarian")) return "Independent";
  return "N/A";
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// Open States API - NY legislators
interface OpenStatePerson {
  party: string;
  current_role: {
    org_classification: "upper" | "lower";
    district: string;
  };
}

interface OpenStatesResponse {
  results: OpenStatePerson[];
  pagination: { max_page: number };
}

async function fetchOpenStatesNY(): Promise<Map<string, string>> {
  if (_openStatesCache) return _openStatesCache;

  const apiKey = process.env.OPEN_STATES_API_KEY;
  if (!apiKey) {
    console.warn("[scrapers] OPEN_STATES_API_KEY not set — party data will be N/A");
    return new Map();
  }

  const partyMap = new Map<string, string>();
  let page = 1;
  let maxPage = 1;

  while (page <= maxPage) {
    try {
      const url = `https://v3.openstates.org/people?jurisdiction=ny&per_page=50&page=${page}&apikey=${apiKey}`;
      const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) { console.warn(`[scrapers] Open States page ${page} HTTP ${res.status}`); break; }
      const data = await res.json() as OpenStatesResponse;
      maxPage = data.pagination.max_page;
      for (const p of data.results) {
        const key = `${p.current_role.org_classification}:${p.current_role.district}`;
        partyMap.set(key, p.party);
      }
      page++;
    } catch (e) {
      console.warn(`[scrapers] Open States fetch failed on page ${page}:`, e);
      break;
    }
  }

  console.log(`[scrapers] Open States: loaded ${partyMap.size} party entries`);
  _openStatesCache = partyMap;
  return partyMap;
}



// NYC Council ----------------------------------------------------------------------
function councilBorough(d: number): string {
  if (d >= 1 && d <= 10) return "Manhattan";
  if (d >= 11 && d <= 18) return "Bronx";
  if (d >= 19 && d <= 32) return "Queens";
  if (d >= 33 && d <= 48) return "Brooklyn";
  if (d >= 49 && d <= 51) return "Staten Island";
  return "New York City";
}

export async function fetchCityCouncil(): Promise<Politician[]> {
  const res = await fetch("https://council.nyc.gov/districts/", {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`Council page HTTP ${res.status}`);
  const html = await res.text();
  const members: Politician[] = [];
  const seenDistricts = new Set<string>();

  const rows = html.split("<tr");
  for (const row of rows) {
    if (!row.includes('class="sort-district"')) continue;

    const dMatch = row.match(/district-(\d+)/);
    if (!dMatch) continue;
    const district = dMatch[1];
    if (seenDistricts.has(district)) continue;

    const nMatch = row.match(/data-member-name="([^"]+)"/);
    if (!nMatch) continue;
    const name = stripHtml(nMatch[1]);

    const nbMatch = row.match(/class="[^"]*sort-neighborhoods[^"]*"[^>]*>([\s\S]+?)<\/td>/);
    let neighborhoods: string[] = [];
    if (nbMatch) {
      const rawNb = stripHtml(nbMatch[1]);
      neighborhoods = rawNb.split(",").map(n => n.trim()).filter(n => n.length > 0);
    }

    let rowParty = "N/A";
    const dataPartyMatch = row.match(/data-(?:member-)?party="([^"]+)"/i);
    if (dataPartyMatch) {
      rowParty = normalizeParty(dataPartyMatch[1]);
    } else {
      const sortPartyMatch = row.match(/class="[^"]*sort-party[^"]*"[^>]*>([\s\S]+?)<\/td>/i);
      if (sortPartyMatch) rowParty = normalizeParty(stripHtml(sortPartyMatch[1]));
    }

    seenDistricts.add(district);
    const d = Number(district);

    members.push({
      id: `nyc-council-d${district}`,
      name,
      office: "NYC Council Member",
      level: "City Council",
      party: rowParty,
      political_stance: rowParty !== "N/A" ? partyToStance(rowParty) : "N/A",
      borough: councilBorough(d),
      district,
      neighborhoods,
      zip_codes: [],
      committees: [],
      subcommittees: [],
      caucuses: [],
      bio_url: `https://council.nyc.gov/district-${district}/`,
      photo_url: null,
    });
  }

  await Promise.allSettled(members.map(async (p) => {
    try {
      const pRes = await fetch(p.bio_url!, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
      if (!pRes.ok) return;
      const pHtml = await pRes.text();
      const $ = cheerio.load(pHtml);

      if (p.party === "N/A") {
        const headerEl = $(".district-member-intro, .district-member-header, .entry-header, h1").first();
        const profileBlock = headerEl.closest("section, div, article").first();
        const profileText = profileBlock.length ? profileBlock.text() : "";

        const partyInProfile = profileText.match(/\b(Working Families|Green|Democratic|Republican|Conservative)\s+Party\b/i);
        if (partyInProfile) {
          p.party = normalizeParty(partyInProfile[1]);
          p.political_stance = partyToStance(p.party);
        }
      }

      const photo = $(".district-member-photo img, .member-photo img").attr("src");
      if (photo) p.photo_url = photo;

      $("ul li a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (!text || text === "Committees" || text === "Caucuses") return;
        
        if (href.includes("/committees/")) {
          if (text.toLowerCase().includes("subcommittee")) p.subcommittees!.push(text);
          else p.committees!.push(text);
        } else if (href.includes("/caucuses/")) {
          p.caucuses!.push(text);
        }
      });

      const email = $("a[href^='mailto:']").first().attr("href")?.replace("mailto:", "");
      if (email) p.email = email;

      const phone = $("body").text().match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
      if (phone) p.phone = phone[0];
    } catch { }
  }));

  return members;
}

// NY Assembly ----------------------------------------------------------------------
function assemblyBorough(d: number): string {
  // NYC boroughs (heuristic ranges; not exact fit)
  if (d >= 23 && d <= 39) return "Queens";
  if (d >= 40 && d <= 59) return "Brooklyn";
  if (d === 60) return "Staten Island";
  if (d === 61) return "Staten Island";
  if (d === 62) return "Staten Island";
  if (d === 63) return "Staten Island";
  if (d >= 64 && d <= 76) return "Manhattan";
  if (d >= 77 && d <= 89) return "Bronx";

  // Non‑NYC districts: return county (coarse examples)
  if (d === 1) return "Suffolk";
  if (d >= 2 && d <= 4) return "Suffolk";
  if (d >= 5 && d <= 13) return "Nassau";
  if (d === 14) return "Nassau";
  if (d >= 15 && d <= 21) return "Nassau";

  // upstate / other counties (refine as needed)
  if (d >= 91 && d <= 104) return "Westchester / Rockland / Putnam";
  if (d >= 105 && d <= 111) return "Albany / Hudson Valley";
  if (d >= 112 && d <= 126) return "Capital Region / Mohawk Valley";
  if (d >= 127 && d <= 135) return "Central / Southern Tier";
  if (d >= 136 && d <= 150) return "Western New York / Finger Lakes";
  return "Unknown";
}

async function fetchAssemblyMemberCommittees(slug: string): Promise<{ committees: string[]; subcommittees: string[] }> {
  const url = `https://nyassembly.gov/mem/${slug}/comm/`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return { committees: [], subcommittees: [] };
    const html = await res.text();
    if (html.length < 500 || html.includes("not in allowlist")) return { committees: [], subcommittees: [] };
    const $ = cheerio.load(html);

    const committees: string[] = [];
    const subcommittees: string[] = [];

    // primary selector: <strong>Member, Committee on X</strong> followed by <a class="comm-mem-link">
    $("a.comm-mem-link").each((_, el) => {
      const strong = $(el).prev("strong");
      if (!strong.length) return;
      const raw = strong.text().trim();
      const name = raw.replace(/^(Ranking Member|Member|Chair|Co-Chair),\s*/i, "").trim();
      if (!name || name.length < 3) return;
      if (name.toLowerCase().includes("subcommittee")) subcommittees.push(name);
      else committees.push(name);
    });

    // fallback: any /comm/?id= links
    if (committees.length === 0 && subcommittees.length === 0) {
      $("a[href*='/comm/']").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        if (!href.includes("?id=")) return;
        const text = $(el).text().trim();
        if (!text || text.length < 3 || text === "Committee Home") return;
        if (text.toLowerCase().includes("subcommittee")) subcommittees.push(text);
        else committees.push(text);
      });
    }

    return {
      committees: [...new Set(committees)],
      subcommittees: [...new Set(subcommittees)],
    };
  } catch {
    return { committees: [], subcommittees: [] };
  }
}

export async function fetchAssembly(): Promise<Politician[]> {
  const res = await fetch("https://nyassembly.gov/mem/", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Assembly page HTTP ${res.status}`);
  const html = await res.text();
  const members: Politician[] = [];
  const seen = new Set<string>();
  const linkRe = /href="(?:https?:\/\/nyassembly\.gov)?\/mem\/([\w\-'.]+)"[^>]*>([\s\S]+?)<\/a>/g;
  let m: RegExpExecArray | null;

  // fetch party map once for all members
  const openStatesParty = await fetchOpenStatesNY();

  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    if (slug === "search" || slug === "email" || slug === "leadership" || slug.includes("@")) continue;
    const rawText = stripHtml(m[2]);
    const districtMatch = rawText.match(/District\s+(\d+)/i);
    if (!districtMatch) continue;
    const district = districtMatch[1];
    if (seen.has(district)) continue;
    seen.add(district);
    const name = rawText.replace(/\s*District\s+\d+.*$/i, "").trim();

    // resolve party from Open States map at parse time
    const rawParty = openStatesParty.get(`lower:${district}`) ?? "";
    const rawParties = rawParty.split("/").map(s => s.trim()).filter(Boolean);
    const { party, allParties } = parseMultiParty(rawParties.length ? rawParties : (rawParty ? [rawParty] : []));

    const politician: Politician = {
      id: `ny-assembly-${slug}`,
      name,
      office: "NY Assembly Member",
      level: "State Assembly",
      party,
      political_stance: partyToStance(party),
      borough: assemblyBorough(Number(district)),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],
      subcommittees: [],
      caucuses: [],
      bio_url: `https://nyassembly.gov/mem/${slug}`,
      photo_url: `https://nyassembly.gov/mem/pic/${slug}.jpg`,
    };
    if (allParties.length > 1) politician.allParties = allParties;
    members.push(politician);
  }

  const CHUNK = 10;
  for (let i = 0; i < members.length; i += CHUNK) {
    const chunk = members.slice(i, i + CHUNK);
    await Promise.allSettled(chunk.map(async (p) => {
      const slug = p.id.replace("ny-assembly-", "");
      const { committees, subcommittees } = await fetchAssemblyMemberCommittees(slug);
      p.committees = committees;
      p.subcommittees = subcommittees;
    }));
  }

  return members;
}

// NY Senate ----------------------------------------------------------------------
function senateBorough(d: number): string {
  if (d >= 10 && d <= 16) return "Queens";
  if (d >= 17 && d <= 22) return "Brooklyn";
  if (d === 23) return "Staten Island";
  if (d >= 24 && d <= 27) return "Brooklyn";
  if (d >= 28 && d <= 33) return "Manhattan";
  if (d >= 34 && d <= 36) return "Bronx";
  return "New York";
}

interface SenateApiMember {
  incumbent: boolean;
  chamber: string;
  districtCode: number | null;
  imgName?: string;
  fullName?: string;
  shortName?: string;
  memberId?: number;
  party?: string;
  committees?: Array<{ name: string }>;
  person?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    suffix?: string;
  };
}

function senateSlug(m: SenateApiMember): string {
  const p = m.person;
  if (p?.firstName && p?.lastName) {
    const parts = [
      p.firstName,
      p.middleName?.replace(/\.$/, ""),  // "P." → "P"
      p.lastName,
      p.suffix?.replace(/\.$/, ""),      // "Jr." → "Jr"
    ].filter(Boolean).join(" ");
    return parts
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  // fallback to fullName
  return (m.fullName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function fetchSenate(): Promise<Politician[]> {
  const apiKey = process.env.NYS_SENATE_API_KEY;
  if (!apiKey) throw new Error("NYS_SENATE_API_KEY not set");

  const [senateRes, openStatesParty] = await Promise.all([
    fetch(`https://legislation.nysenate.gov/api/3/members/2025?key=${apiKey}&limit=200&full=true`, { signal: AbortSignal.timeout(15_000) }),
    fetchOpenStatesNY(),
  ]);

  if (!senateRes.ok) throw new Error(`NY Senate API HTTP ${senateRes.status}`);
  const data = await senateRes.json();
  const items = (data.result?.items as SenateApiMember[] ?? []).filter(m => m.incumbent && m.chamber === "SENATE");

  const politicians: Politician[] = items.map((m): Politician => {
    const district = m.districtCode != null ? String(m.districtCode) : null;
    const d = Number(district ?? 0);
    const photoUrl = m.imgName ? `https://www.nysenate.gov/sites/default/files/styles/4x3/public/${m.imgName}` : null;
    const name = m.fullName?.trim() ?? "N/A";
    const slug = senateSlug(m);

    const rawParty = district ? (openStatesParty.get(`upper:${district}`) ?? "") : "";
    const rawParties = rawParty.split("/").map(s => s.trim()).filter(Boolean);
    const { party, allParties } = parseMultiParty(rawParties.length ? rawParties : (rawParty ? [rawParty] : []));

    const politician: Politician = {
      id: `ny-senate-${m.memberId ?? m.shortName}`,
      name,
      office: "NY State Senator",
      level: "State Senate",
      party,
      political_stance: partyToStance(party),
      borough: senateBorough(d),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],  // nysenate.gov is Cloudflare-blocked; committees unavailable for now
      subcommittees: [],
      caucuses: [],
      bio_url: `https://www.nysenate.gov/senators/${slug}`,
      photo_url: photoUrl,
    };
    if (allParties.length > 1) politician.allParties = allParties;
    return politician;
  });

  return politicians;
}

// US House ----------------------------------------------------------------------
function usHouseBorough(d: number): string {
  if ([3, 4, 5, 6].includes(d)) return "Queens";
  if ([7, 8, 9, 10].includes(d)) return "Brooklyn";
  if ([11].includes(d)) return "Staten Island";
  if ([12, 13].includes(d)) return "Manhattan";
  if ([14, 15, 16].includes(d)) return "Bronx";
  if (d >= 1 && d <= 2) return "Long Island";
  if (d >= 17) return "Upstate New York";
  return "New York";
}

export async function fetchHouse(): Promise<Politician[]> {
  const res = await fetch("https://www.house.gov/representatives", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`House.gov HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const members: Politician[] = [];

  const nyTable = $('caption:contains("New York")').closest("table");
  if (!nyTable.length) throw new Error("Could not find NY table on house.gov");

  nyTable.find("tbody tr").each((_, row) => {
    const tds = $(row).find("td");
    if (tds.length < 5) return;

    const districtText = tds.eq(0).text().trim();
    const district = districtText.replace(/[a-z]/gi, "");
    const nameLink = tds.eq(1).find("a");
    const name = nameLink.text().split(",").reverse().join(" ").trim();
    const bio_url = nameLink.attr("href") || "";
    const partyLetter = tds.eq(2).text().trim();
    const party = normalizeParty(partyLetter);
    const committeesRaw = tds.eq(5).text().trim();
    const committees = committeesRaw.split("|").map(c => c.trim()).filter(Boolean);

    members.push({
      id: `us-house-ny${district}`,
      name,
      office: "U.S. Representative",
      level: "U.S. House",
      party,
      political_stance: partyToStance(party),
      borough: usHouseBorough(Number(district)),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees,
      subcommittees: [],
      caucuses: [],
      bio_url,
      photo_url: null,
      represents: `New York's ${ordinal(Number(district))} Congressional District`,
    });
  });

  return members;
}

// US Senate ----------------------------------------------------------------------
export async function fetchUSSenate(): Promise<Politician[]> {
  return [
    {
      id: "us-senate-schumer",
      name: "Chuck Schumer",
      office: "U.S. Senator",
      level: "U.S. Senate",
      party: "Democrat",
      political_stance: "Liberal",
      borough: "New York State",
      district: null,
      neighborhoods: [],
      zip_codes: [],
      committees: ["Committee on Rules and Administration", "Select Committee on Intelligence", "Joint Congressional Committee on Inaugural Ceremonies - 2024"],
      subcommittees: [],
      caucuses: ["Democratic Caucus (Chair)"],
      bio_url: "https://www.schumer.senate.gov/",
      photo_url: "https://www.schumer.senate.gov/imo/media/image/Schumer_Official_Photo.jpg",
      senate_class: "Class 3",
      next_election: "2028",
      represents: "All of New York State",
    },
    {
      id: "us-senate-gillibrand",
      name: "Kirsten Gillibrand",
      office: "U.S. Senator",
      level: "U.S. Senate",
      party: "Democrat",
      political_stance: "Liberal",
      borough: "New York State",
      district: null,
      neighborhoods: [],
      zip_codes: [],
      committees: ["Committee on Appropriations", "Committee on Armed Services", "Select Committee on Intelligence", "Special Committee on Aging"],
      subcommittees: [
        "Subcommittee on Agriculture, Rural Development, Food and Drug Administration, and Related Agencies",
        "Subcommittee on Commerce, Justice, Science, and Related Agencies",
        "Subcommittee on Department of Interior, Environment, and Related Agencies",
        "Subcommittee on Military Construction, Veterans Affairs, and Related Agencies",
        "Subcommittee on Transportation, Housing and Urban Development, and Related Agencies",
        "Subcommittee on Cybersecurity",
        "Subcommittee on Emerging Threats and Capabilities",
        "Subcommittee on Strategic Forces",
      ],
      caucuses: ["Women's Caucus"],
      bio_url: "https://www.gillibrand.senate.gov/",
      photo_url: "https://www.gillibrand.senate.gov/imo/media/image/Gillibrand_Official_Photo.jpg",
      senate_class: "Class 1",
      next_election: "2030",
      represents: "All of New York State",
    },
  ];
}