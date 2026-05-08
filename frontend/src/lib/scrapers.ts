import * as cheerio from "cheerio";
import { GovLevel, Politician } from "./politicians";

// browser UA so government sites don't block us
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function partyToStance(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("working families") || p.includes("green")) return "Progressive";
  if (p.includes("democrat")) return "Liberal";
  if (p.includes("republican") || p.includes("conservative")) return "Conservative";
  if (p.includes("independent") || p.includes("libertarian")) return "Independent";
  return "Moderate";
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
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

    seenDistricts.add(district);
    const d = Number(district);

    members.push({
      id: `nyc-council-d${district}`,
      name: name,
      office: "NYC Council Member",
      level: "City Council",
      party: "Democrat",
      political_stance: "Liberal",
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
  if (d >= 36 && d <= 64) return "Brooklyn";
  if (d >= 65 && d <= 76) return "Manhattan";
  if (d >= 77 && d <= 90) return "Bronx";
  if (d >= 22 && d <= 35) return "Queens";
  if (d >= 60 && d <= 64) return "Staten Island";
  return "New York";
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
  await Promise.allSettled(comms.map(async (comm) => {
    try {
      const cRes = await fetch(`https://nyassembly.gov/comm/?id=${comm.id}&sec=membership`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8_000) });
      if (!cRes.ok) return;
      const cHtml = await cRes.text();
      const $c = cheerio.load(cHtml);

      $c("a[href^='/mem/']").each((_, el) => {
        const slug = $(el).attr("href")?.split("/").pop();
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
    const ahead = html.slice(m.index, m.index + 600);
    const emailM = ahead.match(/mailto:([a-z0-9._%-]+@nyassembly\.gov)/i);
    members.push({
      id: `ny-assembly-${slug}`,
      name,
      office: "NY Assembly Member",
      level: "State Assembly",
      party: "Unknown",
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
      email: emailM ? emailM[1] : undefined,
    });
  }

  const commMapping = await fetchAssemblyCommittees();
  members.forEach(p => {
    const slug = p.id.replace("ny-assembly-", "");
    if (commMapping[slug]) {
      p.committees = commMapping[slug].committees;
      p.subcommittees = commMapping[slug].subcommittees;
      p.caucuses = commMapping[slug].caucuses;
    }
  });
  return members;
}

// NY Senate ----------------------------------------------------------------------
function senateBorough(d: number): string {
  if (d >= 21 && d <= 27) return "Brooklyn";
  if (d >= 24 && d <= 27) return "Manhattan";
  if (d === 23) return "Staten Island";
  if (d >= 28 && d <= 33) return "Bronx";
  if (d >= 10 && d <= 16) return "Queens";
  return "New York";
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
    const party = m.party || "Unknown";

    return {
      id: `ny-senate-${m.memberId ?? m.shortName}`,
      name: m.fullName?.trim() ?? "Unknown",
      office: "NY State Senator",
      level: "State Senate",
      party,
      political_stance: partyToStance(party),
      borough: senateBorough(d),
      district,
      neighborhoods: [],
      zip_codes: [],
      committees: m.committees?.map((c: any) => c.name) || [],
      subcommittees: [],
      caucuses: [],
      bio_url: `https://www.nysenate.gov/senators/${(m.shortName ?? "").toLowerCase()}`,
      photo_url: photoUrl,
    };
  });
}

// US House ----------------------------------------------------------------------
function usHouseBorough(d: number): string {
  if ([5, 6].includes(d)) return "Queens";
  if ([7, 8, 9, 10].includes(d)) return "Brooklyn";
  if ([11].includes(d)) return "Staten Island";
  if ([12].includes(d)) return "Manhattan";
  if ([13, 14, 15, 16].includes(d)) return "Bronx";
  if (d >= 17 && d <= 22) return "Hudson Valley / Upstate";
  return "New York";
}

export async function fetchHouse(): Promise<Politician[]> {
  const res = await fetch("https://www.house.gov/representatives", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`House.gov HTTP ${res.status}`);
  const html = await res.text();
  const members: Politician[] = [];
  const nyStart = html.indexOf('id="state-new-york"');
  if (nyStart === -1) throw new Error("Could not find NY section on house.gov");
  const nySection = html.slice(nyStart, html.indexOf('id="state-north-carolina"', nyStart));

  const re = /<td[^>]*>(\d+)[a-z]*\s*<\/td>\s*<td[^>]*><a href="([^"]+)">([^<]+)<\/a>\s*<\/td>\s*<td[^>]*>([A-Z])\s*<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(nySection)) !== null) {
    const district = m[1];
    const bio_url = m[2];
    const name = m[3].split(",").reverse().join(" ").trim();
    const party = m[4].trim() === "D" ? "Democrat" : "Republican";

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
      committees: [],
      subcommittees: [],
      caucuses: [],
      bio_url,
      photo_url: null,
      represents: `New York's ${ordinal(Number(district))} Congressional District`,
    });
  }
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
      committees: ["Majority Leader", "Committee on Rules and Administration"],
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
      committees: ["Committee on Armed Services", "Committee on Agriculture, Nutrition, and Forestry", "Select Committee on Intelligence", "Special Committee on Aging"],
      subcommittees: ["Subcommittee on Personnel (Chair)", "Subcommittee on Livestock, Dairy, Poultry, Local Food Systems, and Food Safety and Security (Chair)"],
      caucuses: ["Women's Caucus"],
      bio_url: "https://www.gillibrand.senate.gov/",
      photo_url: "https://www.gillibrand.senate.gov/imo/media/image/Gillibrand_Official_Photo.jpg",
      senate_class: "Class 1",
      next_election: "2030",
      represents: "All of New York State",
    },
  ];
}
