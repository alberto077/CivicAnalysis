import * as cheerio from "cheerio";
import { GovLevel, Politician } from "./politicians";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
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

// TODO: replace with more robust method (minority party affiliation?)
// Minority members of NY Assembly as of 2024-2025
const ASSEMBLY_MINORITY_SLUGS = new Set([
  "jodi-giglio", "joe-destefano", "ed-flood", "doug-smith", "jarett-gandolfo",
  "michael-j-fitzpatrick", "michael-durso", "keith-p-brown", "david-g-mcdonough",
  "jake-blumencranz", "daniel-j-norber", "john-k-mikulin", "edward-p-ra",
  "ari-brown", "michael-novakhov", "alec-brook-krasny", "lester-chang",
  "michael-reilly", "sam-pirozzolo", "michael-tannousis", "matt-slater",
  "karl-brabenec", "brian-maher", "chris-tague", "anil-beephan-jr",
  "scott-bendett", "mary-beth-walsh", "matthew-simpson", "scott-gray",
  "ken-blankenbush", "robert-smullen", "william-a-barclay", "joe-angelino",
  "brian-d-miller", "christopher-s-friend", "john-lemondes", "brian-manktelow",
  "jeff-gallahan", "philip-a-palmesano", "josh-jensen", "stephen-hawley",
  "patrick-j-chludzinski", "paul-a-bologna", "angelo-j-morinello",
  "david-dipietro", "joe-sempolinski", "andrew-m-molitor"
]);

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

    seenDistricts.add(district);
    const d = Number(district);

    members.push({
      id: `nyc-council-d${district}`,
      name: name,
      office: "NYC Council Member",
      level: "City Council",
      party: "Democrat",
      political_stance: "N/A",
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

  // Enrich in parallel
  await Promise.allSettled(members.map(async (p) => {
    try {
      const pRes = await fetch(p.bio_url!, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
      if (!pRes.ok) return;
      const pHtml = await pRes.text();
      const $ = cheerio.load(pHtml);

      const partyText = $("body").text().match(/(Democratic|Republican|Conservative|Working Families)/i);
      if (partyText) {
        p.party = partyText[0];
        p.political_stance = partyToStance(p.party);
      } else {
        p.political_stance = "N/A";
      }

      const photo = $(".district-member-photo img").attr("src");
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
  if (d >= 41 && d <= 63) return "Brooklyn";
  if (d === 60) return "Staten Island"; // overlap: 60 spans SI + Brooklyn
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
  if (d >= 15 && d <= 19) return "Nassau";
  if (d === 20) return "Nassau";
  if (d === 21) return "Nassau";

  // upstate / other counties (refine as needed)
  if (d >= 91 && d <= 104) return "Westchester / Rockland / Putnam";
  if (d >= 105 && d <= 111) return "Albany / Hudson Valley";
  if (d >= 112 && d <= 126) return "Capital Region / Mohawk Valley";
  if (d >= 127 && d <= 135) return "Central / Southern Tier";
  if (d >= 136 && d <= 150) return "Western New York / Finger Lakes";

  return "Unknown"; // fallback
}

async function fetchAssemblyCommittees(): Promise<Record<string, { committees: string[], subcommittees: string[], caucuses: string[] }>> {
  const res = await fetch("https://nyassembly.gov/comm/", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return {};
  const html = await res.text();
  const $ = cheerio.load(html);

  const comms: { id: string; name: string; isSub: boolean }[] = [];
  $("a[href*='/comm/?id=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const name = $(el).text().trim();
    const idMatch = href.match(/id=(\d+)/);
    if (idMatch && name && name.length > 3 && !name.includes("Agenda") && !name.includes("Notice")) {
      comms.push({ id: idMatch[1], name, isSub: name.toLowerCase().includes("subcommittee") });
    }
  });

  const mapping: Record<string, { committees: string[], subcommittees: string[], caucuses: string[] }> = {};
  const chunks = [];
  for (let i = 0; i < comms.length; i += 10) chunks.push(comms.slice(i, i + 10));

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(async (comm) => {
      try {
        const cRes = await fetch(`https://nyassembly.gov/comm/?id=${comm.id}&sec=membership`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8_000) });
        if (!cRes.ok) return;
        const cHtml = await cRes.text();
        const $c = cheerio.load(cHtml);

        $c("a[href^='/mem/']").each((_, el) => {
          const href = $(el).attr("href") || "";
          const slug = normalizeSlug(href.split("/").pop() || "");
          if (slug && slug !== "search" && slug !== "email") {
            if (!mapping[slug]) mapping[slug] = { committees: [], subcommittees: [], caucuses: [] };
            const role = $(el).closest("td").prev().text().trim() || "Member";
            const entry = role.includes("Chair") ? `Chair, ${comm.name}` : comm.name;
            if (comm.isSub) mapping[slug].subcommittees.push(entry);
            else mapping[slug].committees.push(entry);
          }
        });
      } catch { }
    }));
  }
  return mapping;
}

export async function fetchAssembly(): Promise<Politician[]> {
  const res = await fetch("https://nyassembly.gov/mem/", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Assembly page HTTP ${res.status}`);
  const html = await res.text();
  const members: Politician[] = [];
  const seen = new Set<string>();
  const linkRe = /href="(?:https?:\/\/nyassembly\.gov)?\/mem\/([\w\-'.]+)"[^>]*>([\s\S]+?)<\/a>/g;
  let m: RegExpExecArray | null;

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

    const isMinority = ASSEMBLY_MINORITY_SLUGS.has(slug) || ASSEMBLY_MINORITY_SLUGS.has(slug.toLowerCase());
    const party = isMinority ? "Republican" : "Democrat";

    members.push({
      id: `ny-assembly-${slug}`,
      name,
      office: "NY Assembly Member",
      level: "State Assembly",
      party,
      political_stance: "N/A",
      borough: assemblyBorough(Number(district)),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: [],
      subcommittees: [],
      caucuses: [],
      bio_url: `https://nyassembly.gov/mem/${slug}`,
      photo_url: `https://nyassembly.gov/mem/pic/${slug}.jpg`,
    });
  }

  const commMapping = await fetchAssemblyCommittees();
  members.forEach(p => {
    const slug = p.id.replace("ny-assembly-", "");
    const nSlug = normalizeSlug(slug);
    if (commMapping[nSlug]) {
      p.committees = commMapping[nSlug].committees;
      p.subcommittees = commMapping[nSlug].subcommittees;
      p.caucuses = commMapping[nSlug].caucuses;
    }
  });

  return members;
}

// NY Senate ----------------------------------------------------------------------
function senateBorough(d: number): string {
  if (d >= 10 && d <= 16) return "Queens";
  if (d >= 17 && d <= 20) return "Brooklyn";
  if (d >= 21 && d <= 27) return "Brooklyn";
  if (d >= 28 && d <= 33) return "Manhattan";
  if (d >= 34 && d <= 36) return "Bronx";
  if (d === 23) return "Staten Island";
  return "New York";
}

function senateSlug(fullName: string): string {
  return fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function fetchSenate(): Promise<Politician[]> {
  const apiKey = process.env.NYS_SENATE_API_KEY;
  if (!apiKey) throw new Error("NYS_SENATE_API_KEY not set");

  const res = await fetch(`https://legislation.nysenate.gov/api/3/members/2025?key=${apiKey}&limit=200&full=true`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`NY Senate API HTTP ${res.status}`);
  const data = await res.json();
  const items = (data.result?.items ?? []).filter((m: any) => m.incumbent === true && m.chamber === "SENATE");

  return items.map((m: any): Politician => {
    const district = m.districtCode != null ? String(m.districtCode) : null;
    const d = Number(district ?? 0);
    const photoUrl = m.imgName ? `https://www.nysenate.gov/sites/default/files/styles/4x3/public/${m.imgName}` : null;
    const party = m.party || "N/A";
    const name = m.fullName?.trim() ?? "N/A";

    return {
      id: `ny-senate-${m.memberId ?? m.shortName}`,
      name,
      office: "NY State Senator",
      level: "State Senate",
      party,
      political_stance: "N/A",
      borough: senateBorough(d),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: m.committees?.map((c: any) => c.name) || [],
      subcommittees: [],
      caucuses: [],
      bio_url: `https://www.nysenate.gov/senators/${senateSlug(name)}`,
      photo_url: photoUrl,
    };
  });
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
    const party = partyLetter === "D" ? "Democrat" : partyLetter === "R" ? "Republican" : "N/A";
    const committeesRaw = tds.eq(5).text().trim();
    const committees = committeesRaw.split("|").map(c => c.trim()).filter(Boolean);

    members.push({
      id: `us-house-ny${district}`,
      name,
      office: "U.S. Representative",
      level: "U.S. House",
      party,
      political_stance: "N/A",
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
        "Subcommittee on Strategic Forces"
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
