"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Search, X, RotateCcw, Info, ExternalLink,
  MapPin, ChevronDown, ChevronUp, Briefcase, Sparkles, BookOpen, Users
} from "lucide-react";
import {
  getPoliticians,
  getPoliticianFilters,
  type Politician,
} from "@/lib/api";
import { useProfile } from "@/lib/useProfile";



// Levels of Government
const GOV_LEVELS = ["All", "City Council", "State Assembly", "State Senate", "U.S. House", "U.S. Senate"];

// clicking external links within interactive containers
const handleLinkClick = (e: React.MouseEvent) => {
  e.stopPropagation();
};

// level helpers
function getLevelKey(p: Politician): string {
  return (p as { level?: string }).level ?? "";
}

// colors --- diff govt/office levels
function getOfficeStyles(office: string) {
  const o = office.toLowerCase();
  if (o.includes("council")) return "bg-blue-100 text-blue-700 border-blue-200";
  if (o.includes("assembly")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (o.includes("state senator") || (o.includes("senate") && !o.includes("u.s"))) return "bg-amber-100 text-amber-700 border-amber-200";
  if (o.includes("representative") || o.includes("house")) return "bg-purple-100 text-purple-700 border-purple-200";
  if (o.includes("u.s. senator") || (o.includes("senate") && (o.includes("u.s") || o.includes("federal")))) return "bg-violet-100 text-violet-700 border-violet-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getLevelAccent(level: string): string {
  if (level === "City Council") return "bg-blue-500";
  if (level === "State Assembly") return "bg-emerald-500";
  if (level === "State Senate") return "bg-amber-500";
  if (level === "U.S. House") return "bg-purple-500";
  if (level === "U.S. Senate") return "bg-violet-500";
  return "bg-slate-400";
}

function getStanceStyles(stance: string) {
  const s = (stance || "").toLowerCase();
  if (s === "n/a" || s === "unknown") return "bg-slate-50 text-slate-400 border-slate-200";
  if (s.includes("progressive")) return "bg-teal-50 text-teal-700 border-teal-100";
  if (s.includes("liberal")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (s.includes("conservative")) return "bg-red-50 text-red-700 border-red-100";
  if (s.includes("independent")) return "bg-orange-50 text-orange-700 border-orange-100";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function cleanPoliticianData(name: string) {
  let cleanedName = name;
  let title = "";

  // extract titles, eg. "Majority Leader", "Deputy Speaker", etc
  const titleMatch = name.match(/^(Majority Leader|Minority Leader|Deputy Speaker|Speaker|President Pro Tempore|Deputy Leader|Rep\.|Sen\.)\s+/i);
  if (titleMatch) {
    title = titleMatch[1];
    cleanedName = cleanedName.replace(titleMatch[0], "");
  }

  // remove [D-NY] or similar brackets in name
  cleanedName = cleanedName.replace(/\s*\[[A-Z]-[A-Z]{2}.*?\]/g, "");

  return { cleanedName: cleanedName.trim(), title };
}

function getLearnMoreUrl(p: Politician) {
  if (p.bio_url?.trim()) return p.bio_url.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${p.name} ${p.office} District ${p.district ?? ""} ${p.borough} official profile`,
  )}`;
}




// TODO: replace with better/relevant data for state/federal
const SCOPE_BULLETS: Record<string, string[]> = {
  "State Assembly": ["Lower chamber of NY Legislature", "State budget & education", "Represents ~130k residents"],
  "State Senate": ["Upper chamber of NY Legislature", "Confirms judges & officials", "Represents ~310k residents"],
  "U.S. House": ["Federal legislation & appropriations", "Represents ~760k residents", "Serves on House committees"],
  "U.S. Senate": ["Represents all ~20M New Yorkers", "Treaties & federal judiciary", "Serves on Senate committees"],
};


function PoliticianCard({ p, userIssues = [] }: { p: Politician, userIssues?: string[] }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const level = getLevelKey(p);
  const ext = p as { phone?: string; email?: string; senate_class?: string; next_election?: string };

  const { cleanedName, title } = cleanPoliticianData(p.name);

  return (
    /* main container - controls the flip */
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative h-[480px] w-full [perspective:1000px] group"
      onClick={() => setIsFlipped(f => !f)}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d] cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >

        {/* Card Front */}
        <div className="absolute inset-0 h-full w-full rounded-3xl border border-[var(--border)] bg-white [backface-visibility:hidden] shadow-sm group-hover:shadow-xl transition-shadow flex flex-col overflow-hidden">
          <div className={`h-1 w-full flex-shrink-0 ${getLevelAccent(level)}`} />
          <div className="p-8 flex flex-col flex-1">
            <div className="mb-6 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl font-bold leading-tight text-[var(--foreground)]">{cleanedName}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${getOfficeStyles(p.office)}`}>{p.office}</span>
                  {title && <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">{title}</span>}
                  {p.district && <span className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 whitespace-nowrap">District {p.district}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)] font-medium">Borough</span>
                <span className="font-bold text-[var(--foreground)]">{p.borough || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)] font-medium">Party</span>
                <span className="font-bold text-[var(--foreground)]">{p.party || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--muted)] font-medium">Stance</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStanceStyles(p.political_stance)}`}>
                  {p.political_stance || "N/A"}
                </span>
              </div>

              <div className="mt-auto pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Information</span>
                {(ext.email || ext.phone) ? (
                  <div className="flex flex-col gap-1">
                    {ext.email && <span className="text-[11px] text-slate-600 font-medium truncate"><span className="font-bold">Email:</span> {ext.email}</span>}
                    {ext.phone && <span className="text-[11px] text-slate-600 font-medium"><span className="font-bold">Phone:</span> {ext.phone}</span>}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No contact info available</span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <a href={getLearnMoreUrl(p)} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                View Official Profile <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>


        {/* Card Back */}
        <div className="absolute inset-0 h-full w-full rounded-3xl border border-[var(--accent-soft)] bg-slate-50 [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-inner flex flex-col overflow-hidden">
          <div className={`h-1 w-full flex-shrink-0 ${getLevelAccent(level)}`} />
          <div className="p-8 flex flex-col flex-1 overflow-hidden">

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {p.committees && p.committees.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-2">Committee Assignments</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.committees.map((c, i) => (
                      <span key={`${c}-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                        <Users className="h-3 w-3 text-blue-400" />{c}
                      </span>
                    ))}
                  </div>
                </div>
              )}



              {level === "City Council" && (p.neighborhoods ?? []).length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-2">Neighborhoods Served</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.neighborhoods!.map((n, i) => <span key={`${n}-${i}`} className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg">{n}</span>)}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-2">Areas Represented</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-800">
                    {level === "U.S. Senate" ? "All of New York State" : level === "City Council" ? `NYC District ${p.district ?? "—"} (${p.borough})` : `NY District ${p.district ?? "—"} (${p.borough})`}
                  </span>
                </div>
              </div>

              {(p.zip_codes ?? []).length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-2">ZIP Codes Served</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.zip_codes!.map((z, i) => <span key={`${z}-${i}`} className="text-[11px] font-bold text-[var(--accent)]">{z}</span>)}
                  </div>
                </div>
              )}
            </div>

            {/* button - redirect to politician profile */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <a href={getLearnMoreUrl(p)} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800">
                View Official Profile <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}


// ----------------------------------------------------------------------------------------------
export function PoliticianCards({ userBorough }: { userBorough?: string }) {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(true); // true = show spinner immediately on mount
  const [error, setError] = useState<string | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const { profile } = useProfile();
  const [visibleCount, setVisibleCount] = useState(24);

  const [selectedBoroughs, setSelectedBoroughs] = useState<string[]>([]);
  const [dynamicBoroughs, setDynamicBoroughs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedParty, setSelectedParty] = useState("All");
  const [selectedStance, setSelectedStance] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedCommittee, setSelectedCommittee] = useState("All");

  const politicianRequestIdRef = useRef(0);

  const officeInfo = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    // NYC municipal: odd-year cycle starting 2021 (2021, 2025, 2029…)
    const nextMunicipal = (() => {
      let yr = 2021;
      while (yr < y || (yr === y && m >= 10)) yr += 4;
      return yr.toString();
    })();

    // state/federal House: every even year
    const nextEven = (() => {
      let yr = y % 2 === 0 ? y : y + 1;
      if (yr === y && m >= 10) yr += 2;
      return yr.toString();
    })();

    // NY US Senate: dynamic 6-year cycle. Class 2 base 2026 (Gillibrand), Class 3 base 2028 (Schumer)
    const nextInCycle = (base: number) => { let yr = base; while (yr < y || (yr === y && m >= 10)) yr += 6; return yr; };
    const c2 = nextInCycle(2026), c3 = nextInCycle(2028);
    const nextSenate = c2 === c3 ? String(c2) : [c2, c3].sort((a, b) => a - b).join(" / ");

    return [
      {
        office: "City Council",
        members: 51,
        term: "4 Years",
        limit: "2 Terms",
        next: nextMunicipal,
        power: "Local laws, city budget, zoning & land use, sanitation, parks.",
        color: "text-blue-700 bg-blue-50 border-blue-200"
      },
      {
        office: "State Assembly",
        members: 150,
        term: "2 Years",
        limit: "None",
        next: nextEven,
        power: "State legislation (lower chamber), education, labor, state budget approval.",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200"
      },
      {
        office: "State Senate",
        members: 63,
        term: "2 Years",
        limit: "None",
        next: nextEven,
        power: "State legislation (upper chamber), judicial confirmations, state budget oversight.",
        color: "text-amber-700 bg-amber-50 border-amber-200"
      },
      {
        office: "U.S. House",
        members: 26,
        term: "2 Years",
        limit: "None",
        next: nextEven,
        power: "Federal laws & appropriations, constituent services, committee oversight.",
        color: "text-purple-700 bg-purple-50 border-purple-200"
      },
      {
        office: "U.S. Senate",
        members: 2,
        term: "6 Years",
        limit: "None",
        next: nextSenate,
        power: "Federal legislation, treaty ratification, confirms federal judges & cabinet.",
        color: "text-violet-700 bg-violet-50 border-violet-200"
      }
    ];
  }, []);

  useEffect(() => {
    if (userBorough && selectedBoroughs.length === 0) {
      setSelectedBoroughs([userBorough]);
    }
  }, [userBorough]);

  const isAnyFilterActive = useMemo(() => {
    return selectedBoroughs.length > 0 ||
      selectedLevel !== "All" ||
      selectedParty !== "All" ||
      selectedStance !== "All" ||
      selectedDistrict !== "All" ||
      selectedCommittee !== "All" ||
      searchTerm !== "";
  }, [selectedBoroughs, selectedLevel, selectedParty, selectedStance, selectedDistrict, selectedCommittee, searchTerm]);

  const clearAllFilters = () => {
    setSelectedBoroughs([]);
    setSelectedLevel("All");
    setSelectedParty("All");
    setSelectedStance("All");
    setSelectedDistrict("All");
    setSelectedCommittee("All");
    setSearchTerm("");
  };

  const toggleBorough = (b: string) => {
    setSelectedBoroughs(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  };

  useEffect(() => {
    async function loadFilters() {
      try {
        const filters = await getPoliticianFilters();
        if (filters.boroughs?.length) {
          // exclude statewide/upstate values from the borough chip filter
          const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
          const filtered = filters.boroughs.filter((b: string) =>
            NYC_BOROUGHS.some(nb => b.toLowerCase().includes(nb.toLowerCase()))
          );
          setDynamicBoroughs(filtered.length ? filtered : NYC_BOROUGHS);
        }
      } catch (e) {
        console.warn("Failed to load dynamic filters, using defaults", e);
        setDynamicBoroughs(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]);
      }
    }
    void loadFilters();
  }, []);

  useEffect(() => {
    async function load() {
      const requestId = ++politicianRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const data = await getPoliticians();

        if (requestId === politicianRequestIdRef.current) {
          // randomized sorting on initial load
          const shuffled = [...data].sort(() => Math.random() - 0.5);
          setPoliticians(shuffled);
        }
      } catch (e) {
        if (requestId === politicianRequestIdRef.current) {
          setError(e instanceof Error ? e.message : "Unable to load representatives");
          setPoliticians([]);
        }
      } finally {
        if (requestId === politicianRequestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void load();
  }, []);

  // reset pagination when filters change
  useEffect(() => {
    setVisibleCount(24);
  }, [searchTerm, selectedBoroughs, selectedLevel, selectedParty, selectedStance, selectedDistrict, selectedCommittee]);

  // filters - parties, stances, districts, committees, level, search-term, boroughs ??
  const availableParties = useMemo(() => {
    const parties = new Set(politicians.map(p => p.party || "N/A"));
    return ["All", ...Array.from(parties).sort()];
  }, [politicians]);

  const availableStances = useMemo(() => {
    const stances = new Set(politicians.map(p => p.political_stance || "N/A"));
    return ["All", ...Array.from(stances).sort()];
  }, [politicians]);

  const availableDistricts = useMemo(() => {
    const dists = new Set(politicians.map(p => p.district).filter(Boolean) as string[]);
    return ["All", ...Array.from(dists).sort((a, b) => Number(a) - Number(b))];
  }, [politicians]);

  const availableCommittees = useMemo(() => {
    const committees = new Set(politicians.flatMap(p => p.committees || []));
    return ["All", ...Array.from(committees).sort()];
  }, [politicians]);

  const filteredPoliticians = useMemo(() => {
    return politicians.filter(p => {
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchLower) ||
        p.office.toLowerCase().includes(searchLower) ||
        (p.district && p.district.toLowerCase().includes(searchLower)) ||
        (p.zip_codes && p.zip_codes.some(z => z.includes(searchLower))) ||
        (p.neighborhoods && p.neighborhoods.some(n => n.toLowerCase().includes(searchLower))) ||
        p.borough.toLowerCase().includes(searchLower) ||
        (p.party && p.party.toLowerCase().includes(searchLower)) ||
        (p.political_stance && p.political_stance.toLowerCase().includes(searchLower)) ||
        (p.committees && p.committees.some(c => c.toLowerCase().includes(searchLower)));

      const matchesBorough = selectedBoroughs.length === 0 ||
        selectedBoroughs.some(b => p.borough.toLowerCase().includes(b.toLowerCase()));

      let matchesLevel = true;
      if (selectedLevel !== "All") {
        const lvl = (p as { level?: string }).level;
        if (lvl) {
          matchesLevel = lvl === selectedLevel;
        } else {
          const office = p.office.toLowerCase();
          if (selectedLevel === "City Council") matchesLevel = office.includes("council");
          else if (selectedLevel === "State Assembly") matchesLevel = office.includes("assembly");
          else if (selectedLevel === "State Senate") matchesLevel = office.includes("senate") && !office.includes("u.s");
          else if (selectedLevel === "U.S. House") matchesLevel = office.includes("house") || office.includes("representative") || office.includes("congress");
          else if (selectedLevel === "U.S. Senate") matchesLevel = office.includes("senator") || (office.includes("senate") && (office.includes("u.s.") || office.includes("us ")));
        }
      }

      const matchesParty = selectedParty === "All" || (p.party || "N/A") === selectedParty;
      const matchesStance = selectedStance === "All" || (p.political_stance || "N/A") === selectedStance;
      const matchesDistrict = selectedDistrict === "All" || p.district === selectedDistrict;
      const matchesCommittee = selectedCommittee === "All" || (p.committees && p.committees.includes(selectedCommittee));

      return matchesSearch && matchesBorough && matchesLevel && matchesParty && matchesStance && matchesDistrict && matchesCommittee;
    });
  }, [politicians, searchTerm, selectedBoroughs, selectedLevel, selectedParty, selectedStance, selectedDistrict, selectedCommittee]);



  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <MotionReveal>
        <div className="flex items-start justify-between">
          <h1 className="font-display text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Representative Directory
          </h1>
        </div>

        {/* Understanding Your Representation Section (collapsable) - info on NY govt offices & types of representatives */}
        <div className="mt-10 mb-16 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-300">
          <button
            onClick={() => setIsReferenceOpen(!isReferenceOpen)}
            className={`w-full bg-slate-50 px-8 flex items-center justify-between hover:bg-slate-100/50 transition-all ${isReferenceOpen ? 'py-6 border-b border-slate-100' : 'py-4'}`}
          >
            <div className="text-left">
              <h2 className={`${isReferenceOpen ? 'text-xl' : 'text-base'} font-bold text-slate-900 transition-all`}>
                Understanding Your Representation
              </h2>
              {isReferenceOpen && (
                <p className="text-sm text-slate-500 mt-1">New York residents are represented across three main levels of government.</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest">
                <span className="animate-pulse">●</span>
                New York
              </div>
              {isReferenceOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </div>
          </button>

          <AnimatePresence>
            {isReferenceOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-8 py-4 font-bold text-slate-700">Office</th>
                        <th className="px-4 py-4 font-bold text-slate-700">Members</th>
                        <th className="px-4 py-4 font-bold text-slate-700">Term</th>
                        <th className="px-4 py-4 font-bold text-slate-700">Limit</th>
                        <th className="px-4 py-4 font-bold text-slate-700">Next Election</th>
                        <th className="px-8 py-4 font-bold text-slate-700">Responsibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {officeInfo.map((info) => (
                        <tr key={info.office} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4">
                            <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] border ${info.color}`}>
                              {info.office}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-600">{info.members}</td>
                          <td className="px-4 py-4 font-medium text-slate-600">{info.term}</td>
                          <td className="px-4 py-4 font-medium text-slate-600">{info.limit}</td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold">
                              {info.next}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-slate-500 text-xs leading-relaxed">{info.power}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* TODO: update links and content to more relevant stuff */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-8 bg-slate-50/30 border-t border-slate-100">
                  <a
                    href="https://www.nysenate.gov/legislation/laws/CONSOLIDATED"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-[var(--accent)] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Consolidated Laws of NY</p>
                        <p className="text-[10px] text-slate-500">Official NY State Legislative database</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-[var(--accent)]" />
                  </a>

                  <a
                    href="https://www.nysenate.gov/senators-committees"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-[var(--accent)] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Legislative Committees</p>
                        <p className="text-[10px] text-slate-500">View Senate committee assignments</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-[var(--accent)]" />
                  </a>

                  <a
                    href="https://www.house.gov/representatives#new-york"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-[var(--accent)] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Federal Delegation</p>
                        <p className="text-[10px] text-slate-500">US House & Senate members</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-[var(--accent)]" />
                  </a>
                </div>

                <div className="bg-slate-50/50 p-4 px-8 text-[11px] text-slate-400 italic border-t border-slate-100">
                  *Note: Directory reflects fresh data sourced from live integrations and official government directories. See <a className="text-[var(--accent)] hover:underline" href="/data-sources">data-sources</a> for more info.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionReveal>



      {/* Tabs : Levels of Government */}
      <MotionReveal className="mt-12 mb-6 border-b border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
          {GOV_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-2 py-4 font-bold text-sm transition-colors border-b-2 text-center ${selectedLevel === level
                ? "border-[var(--accent)] text-[var(--accent)] bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/30"
                }`}
            >
              {level}
            </button>
          ))}
        </div>
      </MotionReveal>

      {/* FILTERS */}
      <MotionReveal className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-12">
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
            {/* search : name, zip, committee, district */}
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, zip, committee, district..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-shadow"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto flex-1">
              {/* filter : district */}
              <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">District</span>
                <div className="relative">
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-all cursor-pointer"
                  >
                    {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </label>

              {/* filter : party */}
              <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Party</span>
                <div className="relative">
                  <select
                    value={selectedParty}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-all cursor-pointer"
                  >
                    {availableParties.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </label>

              {/* filter : stance */}
              <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Stance</span>
                <div className="relative">
                  <select
                    value={selectedStance}
                    onChange={(e) => setSelectedStance(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-all cursor-pointer"
                  >
                    {availableStances.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </label>

              {/* clear all - reset button */}
              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  disabled={!isAnyFilterActive}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all h-[42px] ${isAnyFilterActive
                    ? "bg-red-500 text-white shadow-md hover:bg-red-600"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                    }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* filter : multi-select boroughs */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2">Boroughs:</span>
              {dynamicBoroughs.map((b) => {
                const active = selectedBoroughs.includes(b);
                return (
                  <button
                    key={b}
                    onClick={() => toggleBorough(b)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[11px] font-bold transition-all ${active
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </MotionReveal>

      {/* RESULTS */}
      <div>
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-800 mb-8">
            {error}
          </div>
        )}

        {/* loading skeleton when loading data */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[480px] animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : (
          /* GRID : Politicians */
          <div className="relative">
            <div className="flex items-center justify-between mb-6 px-2">
              <p className="text-sm text-slate-500 font-medium">
                Showing <span className="text-slate-900 font-bold">{Math.min(visibleCount, filteredPoliticians.length)}</span> of <span className="text-slate-900 font-bold">{filteredPoliticians.length}</span> representatives
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
            >
              {filteredPoliticians.slice(0, visibleCount).map((p, idx) => (
                <PoliticianCard key={`${p.id || p.name}-${idx}`} p={p} userIssues={profile?.issues} />
              ))}
            </motion.div>

            {filteredPoliticians.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-300">
                <div className="p-4 rounded-full bg-slate-100 text-slate-400 mb-4">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No representatives found</h3>
                <p className="text-slate-500 mt-2">Try adjusting your filters or search term</p>
                <button onClick={clearAllFilters} className="mt-6 text-[var(--accent)] font-bold hover:underline">
                  Clear all filters
                </button>
              </div>
            )}

            {visibleCount < filteredPoliticians.length && (
              <div className="mt-16 flex justify-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="group relative flex items-center gap-3 px-10 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 font-bold transition-all hover:border-[var(--accent)] hover:shadow-lg active:scale-95"
                >
                  <span>Show More Representatives</span>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-[var(--accent)] transition-transform group-hover:translate-y-0.5" />
                  <div className="absolute -top-3 -right-3 px-2 py-1 rounded-md bg-[var(--accent)] text-white text-[10px] font-bold shadow-sm">
                    +{filteredPoliticians.length - visibleCount}
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}