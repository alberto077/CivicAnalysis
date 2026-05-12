"use client";

import { useEffect, useRef, useState, useMemo, startTransition } from "react";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Search, X, RotateCcw, Info, ExternalLink,
  ChevronDown, ChevronUp, BookOpen, Users,
  ChevronsUp, ChevronsDown
} from "lucide-react";
import {
  getPoliticians,
  getPoliticianFilters,
  type Politician,
} from "@/lib/api";
import { ThemedSelect } from "./ThemedSelect";


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
  if (o.includes("council"))
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/35";
  if (o.includes("assembly"))
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/35";
  if (o.includes("state senator") || (o.includes("senate") && !o.includes("u.s")))
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/35";
  if (o.includes("representative") || o.includes("house"))
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-400/35";
  if (o.includes("u.s. senator") || (o.includes("senate") && (o.includes("u.s") || o.includes("federal"))))
    return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-400/35";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-[var(--surface-card)] dark:text-[var(--foreground-secondary)] dark:border-[var(--border)]";
}

function getLevelAccent(level: string): string {
  if (level === "City Council") return "bg-blue-500";
  if (level === "State Assembly") return "bg-emerald-500";
  if (level === "State Senate") return "bg-amber-500";
  if (level === "U.S. House") return "bg-purple-500";
  if (level === "U.S. Senate") return "bg-violet-500";
  return "bg-slate-400";
}

function getLevelHoverAccent(level: string): string {
  if (level === "City Council") return "hover:bg-blue-500";
  if (level === "State Assembly") return "hover:bg-emerald-500";
  if (level === "State Senate") return "hover:bg-amber-600";
  if (level === "U.S. House") return "hover:bg-purple-500";
  if (level === "U.S. Senate") return "hover:bg-violet-500";
  return "hover:bg-slate-500 dark:hover:text-white";
}

function getPartyStyles(party: string) {
  const p = (party || "").toLowerCase();
  if (p === "democrat")
    return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/12 dark:text-blue-300";
  if (p === "republican")
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/12 dark:text-red-300";
  if (p === "conservative")
    return "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/12 dark:text-orange-300";
  if (p === "working families")
    return "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/12 dark:text-teal-300";
  if (p === "green")
    return "border-green-300 bg-green-50 text-green-700 dark:border-green-500/40 dark:bg-green-500/12 dark:text-green-300";
  if (p === "independent")
    return "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/40 dark:bg-purple-500/12 dark:text-purple-300";
  return "border-slate-200 bg-slate-50 text-slate-500 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[var(--muted)]";
}

function cleanPoliticianData(name: string) {
  let cleanedName = name;
  let title = "";

  const titleMatch = name.match(/^(Majority Leader|Minority Leader|Deputy Speaker|Speaker|President Pro Tempore|Deputy Leader|Rep\.|Sen\.)\s+/i);
  if (titleMatch) {
    title = titleMatch[1];
    cleanedName = cleanedName.replace(titleMatch[0], "");
  }

  cleanedName = cleanedName.replace(/\s*\[[A-Z]-[A-Z]{2}.*?\]/g, "");

  return { cleanedName: cleanedName.trim(), title };
}

function getLearnMoreUrl(p: Politician) {
  if (p.bio_url?.trim()) return p.bio_url.trim();
  const name = p.name || "Unknown";
  const office = p.office || "Representative";
  const district = p.district || "";
  const borough = p.borough || "NYC";
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${name} ${office} District ${district} ${borough} official profile`,
  )}`;
}


function PoliticianCard({ p }: { p: Politician }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const level = getLevelKey(p);
  const ext = p as { phone?: string; email?: string; senate_class?: string; next_election?: string; allParties?: string[] };

  const { cleanedName, title } = cleanPoliticianData(p.name || "");
  const allParties: string[] = ext.allParties ?? (p.party && p.party !== "N/A" ? [p.party] : []);

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative h-95 w-full perspective-[1000px] group"
      onClick={() => setIsFlipped(f => !f)}
    >
      <motion.div
        className="relative h-full w-full transform-3d cursor-pointer"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >

        {/* Card Front */}
        <div className="absolute inset-0 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-(--border) bg-white shadow-sm backface-hidden transition-shadow group-hover:shadow-xl dark:bg-(--surface-elevated) dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_28px_-12px_rgba(0,0,0,0.4)]">
          <div className={`h-1 w-full shrink-0 ${getLevelAccent(level)}`} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
            {/* Header */}
            <div className="mb-5 flex shrink-0 items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-2xl font-bold leading-tight text-foreground">{cleanedName}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${getOfficeStyles(p.office)}`}>{p.office}</span>
                  {title && (
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-300">
                      {title}
                    </span>
                  )}
                  {p.district && (
                    <span className="whitespace-nowrap rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:border-(--border) dark:bg-(--surface-card) dark:text-(--foreground-secondary)">
                      District {p.district}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-(--muted) font-medium">Borough/County</span>
                <span className="font-bold text-foreground">{p.borough || "N/A"}</span>
              </div>

              {/* Party chips */}
              <div className="flex justify-between items-start text-sm gap-2">
                <span className="text-(--muted) font-medium shrink-0">Party</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {allParties.length > 0 ? allParties.map((party, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPartyStyles(party)}`}>
                      {party}
                    </span>
                  )) : (
                    <span className="text-foreground font-bold text-sm">N/A</span>
                  )}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-(--muted)">
                  Areas Represented
                </span>
                <span className="text-[11px] text-slate-800 dark:text-foreground">
                  {level === "U.S. Senate" ? "All of New York State" : level === "City Council" ? `NYC District ${p.district ?? "—"} (${p.borough})` : `NY District ${p.district ?? "—"} (${p.borough})`}
                </span>
              </div>

            </div>

            <div className="mt-5 shrink-0 border-t border-slate-100 pt-4 dark:border-(--border)">
              <a
                href={getLearnMoreUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition ${getLevelHoverAccent(level)} dark:bg-foreground dark:text-background dark:hover:text-white`}
              >
                View Official Profile <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Card Back */}
        <div className="absolute inset-0 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-(--accent-soft) bg-slate-50 shadow-inner backface-hidden transform-[rotateY(180deg)] dark:border-(--border) dark:bg-(--surface-card)">
          <div className={`h-1 w-full shrink-0 ${getLevelAccent(level)}`} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-8">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {level === "City Council" && (p.neighborhoods ?? []).length > 0 && (
                <div>
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-(--muted)">
                    Neighborhoods Served
                  </span>
                  <div className="max-h-full pr-1">
                    <div className="flex flex-wrap gap-1.5">
                      {p.neighborhoods!.map((n, i) => (
                        <span
                          key={`${n}-${i}`}
                          className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 dark:border-(--border) dark:bg-(--surface-elevated) dark:text-(--foreground-secondary)"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(p.zip_codes ?? []).length > 0 && (
                <div>
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-(--muted)">
                    ZIP Codes Served
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.zip_codes!.map((z, i) => <span key={`${z}-${i}`} className="text-[11px] font-bold text-(--accent)">{z}</span>)}
                  </div>
                </div>
              )}

              {p.committees && p.committees.length > 0 && (
                <div>
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-(--muted)">
                    Committees
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.committees || []).map((c: string, i: number) => (
                      <span
                        key={`${c}-${i}`}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-(--border) dark:bg-(--surface-elevated) dark:text-(--foreground-secondary)"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {p.subcommittees && p.subcommittees.length > 0 && (
                <div>
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-(--muted)">
                    Subcommittees
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.subcommittees || []).map((sc: string, i: number) => (
                      <span
                        key={`${sc}-${i}`}
                        className="rounded-md border border-dashed border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 dark:border-(--border) dark:bg-(--surface-elevated) dark:text-(--muted)"
                      >
                        {sc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {p.caucuses && p.caucuses.length > 0 && (
                <div>
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-(--muted)">
                    Caucuses
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(p.caucuses || []).map((c: string, i: number) => (
                      <span
                        key={`${c}-${i}`}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-(--border) dark:bg-(--surface-elevated) dark:text-(--foreground-secondary)"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <div className="mt-4 shrink-0 border-t border-slate-200 pt-4 dark:border-(--border)">
              <a
                href={getLearnMoreUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition ${getLevelHoverAccent(level)} dark:bg-foreground dark:text-background dark:hover:text-white`}
              >
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  const [selectedBoroughs, setSelectedBoroughs] = useState<string[]>(() =>
    userBorough ? [userBorough] : []
  );
  const [dynamicBoroughs, setDynamicBoroughs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [selectedCommittee, setSelectedCommittee] = useState("All");
  const [selectedSubcommittee, setSelectedSubcommittee] = useState("All");
  const [selectedCaucus, setSelectedCaucus] = useState("All");

  const politicianRequestIdRef = useRef(0);

  const officeInfo = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    const nextMunicipal = (() => {
      let yr = 2021;
      while (yr < y || (yr === y && m >= 10)) yr += 4;
      return yr.toString();
    })();

    const nextEven = (() => {
      let yr = y % 2 === 0 ? y : y + 1;
      if (yr === y && m >= 10) yr += 2;
      return yr.toString();
    })();

    const nextInCycle = (base: number) => { let yr = base; while (yr < y || (yr === y && m >= 10)) yr += 6; return yr; };
    const c2 = nextInCycle(2026), c3 = nextInCycle(2028);
    const nextSenate = c2 === c3 ? String(c2) : [c2, c3].sort((a, b) => a - b).join(" / ");

    return [
      {
        office: "City Council", members: 51, term: "4 Years", limit: "2 Terms", next: nextMunicipal,
        power: "Local laws, city budget, zoning & land use, sanitation, parks.",
        color:
          "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-500/12 dark:text-blue-300 dark:border-blue-400/30",
      },
      {
        office: "State Assembly", members: 150, term: "2 Years", limit: "None", next: nextEven,
        power: "State legislation (lower chamber), education, labor, state budget approval.",
        color:
          "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:border-emerald-400/30",
      },
      {
        office: "State Senate", members: 63, term: "2 Years", limit: "None", next: nextEven,
        power: "State legislation (upper chamber), judicial confirmations, state budget oversight.",
        color:
          "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:border-amber-400/30",
      },
      {
        office: "U.S. House", members: 26, term: "2 Years", limit: "None", next: nextEven,
        power: "Federal laws & appropriations, constituent services, committee oversight.",
        color:
          "text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-500/12 dark:text-purple-300 dark:border-purple-400/30",
      },
      {
        office: "U.S. Senate", members: 2, term: "6 Years", limit: "None", next: nextSenate,
        power: "Federal legislation, treaty ratification, confirms federal judges & cabinet.",
        color:
          "text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-500/12 dark:text-violet-300 dark:border-violet-400/30",
      }
    ];
  }, []);

  const isAnyFilterActive = useMemo(() => {
    return selectedBoroughs.length > 0 ||
      selectedLevel !== "All" ||
      selectedParties.length > 0 ||
      selectedDistrict !== "All" ||
      selectedCommittee !== "All" ||
      selectedSubcommittee !== "All" ||
      selectedCaucus !== "All" ||
      searchTerm !== "";
  }, [selectedBoroughs, selectedLevel, selectedParties, selectedDistrict, selectedCommittee, selectedSubcommittee, selectedCaucus, searchTerm]);

  const clearAllFilters = () => {
    setSelectedBoroughs([]);
    setSelectedLevel("All");
    setSelectedParties([]);
    setSelectedDistrict("All");
    setSelectedCommittee("All");
    setSelectedSubcommittee("All");
    setSelectedCaucus("All");
    setSearchTerm("");
  };

  const toggleBorough = (b: string) => {
    setSelectedBoroughs(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const toggleParty = (party: string) => {
    setSelectedParties(prev => prev.includes(party) ? prev.filter(x => x !== party) : [...prev, party]);
  };

  useEffect(() => {
    async function loadFilters() {
      try {
        const filters = await getPoliticianFilters();
        if (filters.boroughs?.length) {
          const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
          const filtered = filters.boroughs.filter((b: string) =>
            NYC_BOROUGHS.some(nb => b.toLowerCase().includes(nb.toLowerCase()))
          );
          setDynamicBoroughs(filtered.length ? filtered : NYC_BOROUGHS);
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
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
          const levelOrder = ["City Council", "State Assembly", "State Senate", "U.S. Senate", "U.S. House"];
          const sorted = [...data].sort((a, b) => {
            const lA = levelOrder.indexOf(a.level);
            const lB = levelOrder.indexOf(b.level);
            if (lA !== lB) return lA - lB;
            if (a.district && b.district) {
              const dnumA = parseInt(a.district, 10);
              const dnumB = parseInt(b.district, 10);
              if (!isNaN(dnumA) && !isNaN(dnumB) && dnumA !== dnumB) return dnumA - dnumB;
              if (a.district !== b.district) return a.district.localeCompare(b.district);
            } else if (a.district) return -1;
            else if (b.district) return 1;
            return a.name.localeCompare(b.name);
          });
          setPoliticians(sorted);
        }
      } catch (e) {
        if (requestId === politicianRequestIdRef.current) {
          setError(e instanceof Error ? e.message : "Unable to load representatives");
          setPoliticians([]);
        }
      } finally {
        if (requestId === politicianRequestIdRef.current) setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    startTransition(() => {
      setVisibleCount(24);
    });
  }, [searchTerm, selectedBoroughs, selectedLevel, selectedParties, selectedDistrict, selectedCommittee, selectedSubcommittee, selectedCaucus]);

  const filteredByLevel = useMemo(() => {
    if (selectedLevel === "All") return politicians;
    return politicians.filter(p => p.level === selectedLevel);
  }, [politicians, selectedLevel]);

  // Derive available parties from current level's data — normalized & deduplicated
  const availableParties = useMemo(() => {
    const parties = new Set<string>();
    filteredByLevel.forEach(p => {
      const all = p.allParties;
      if (all && all.length > 0) all.forEach(pt => parties.add(pt));
      else if (p.party && p.party !== "N/A") parties.add(p.party);
    });
    return Array.from(parties).sort();
  }, [filteredByLevel]);

  const availableDistricts = useMemo(() => {
    const dists = new Set(filteredByLevel.map(p => p.district).filter(Boolean) as string[]);
    return ["All", ...Array.from(dists).sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
    })];
  }, [filteredByLevel]);

  const availableCommittees = useMemo(() => {
    const committees = new Set(filteredByLevel.flatMap(p => p.committees || []));
    return ["All", ...Array.from(committees).sort()];
  }, [filteredByLevel]);

  const availableSubcommittees = useMemo(() => {
    const scs = new Set(filteredByLevel.flatMap(p => p.subcommittees || []));
    return ["All", ...Array.from(scs).sort()];
  }, [filteredByLevel]);

  const availableCaucuses = useMemo(() => {
    const cs = new Set(filteredByLevel.flatMap(p => p.caucuses || []));
    return ["All", ...Array.from(cs).sort()];
  }, [filteredByLevel]);

  const districtSelectOptions = useMemo(
    () => availableDistricts.map((d) => ({ value: d, label: d })),
    [availableDistricts],
  );
  const committeeSelectOptions = useMemo(
    () => availableCommittees.map((c) => ({ value: c, label: c })),
    [availableCommittees],
  );
  const subcommitteeSelectOptions = useMemo(
    () => availableSubcommittees.map((s) => ({ value: s, label: s })),
    [availableSubcommittees],
  );
  const caucusSelectOptions = useMemo(
    () => availableCaucuses.map((c) => ({ value: c, label: c })),
    [availableCaucuses],
  );

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
        (p.committees && p.committees.some(c => c.toLowerCase().includes(searchLower))) ||
        (p.subcommittees && p.subcommittees.some(s => s.toLowerCase().includes(searchLower))) ||
        (p.caucuses && p.caucuses.some(c => c.toLowerCase().includes(searchLower)));

      const isStatewideSenator = p.level === "State Senate" || p.level === "U.S. Senate";
      const matchesBorough = selectedBoroughs.length === 0 ||
        isStatewideSenator ||
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

      const pAllParties = p.allParties ?? (p.party && p.party !== "N/A" ? [p.party] : []);
      const matchesParty = selectedParties.length === 0 ||
        selectedParties.some(sp => pAllParties.includes(sp));

      const matchesDistrict = selectedDistrict === "All" || p.district === selectedDistrict;
      const matchesCommittee = selectedCommittee === "All" || (p.committees && p.committees.includes(selectedCommittee));
      const matchesSubcommittee = selectedSubcommittee === "All" || (p.subcommittees && p.subcommittees.includes(selectedSubcommittee));
      const matchesCaucus = selectedCaucus === "All" || (p.caucuses && p.caucuses.includes(selectedCaucus));

      return matchesSearch && matchesBorough && matchesLevel && matchesParty && matchesDistrict && matchesCommittee && matchesSubcommittee && matchesCaucus;
    });
  }, [politicians, searchTerm, selectedBoroughs, selectedLevel, selectedParties, selectedDistrict, selectedCommittee, selectedSubcommittee, selectedCaucus]);


  // move scroll top/bot upwards when at bottom of page
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      setAtBottom(scrollPosition >= pageHeight - 10);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <MotionReveal>
        <div className="flex items-start justify-between">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Representative Directory
          </h1>
        </div>

        {/* Understanding Your Representation Section */}
        <div className="mt-10 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 dark:border-(--border) dark:bg-(--surface-elevated) dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_40px_-16px_rgba(0,0,0,0.45)]">
          <button
            onClick={() => setIsReferenceOpen(!isReferenceOpen)}
            className={`w-full bg-slate-50 px-8 flex items-center justify-between hover:bg-slate-100/50 transition-all dark:bg-(--surface-card) dark:hover:bg-(--surface-glass)/80 ${isReferenceOpen ? "py-6 border-b border-slate-100 dark:border-(--border)" : "py-4"}`}
          >
            <div className="text-left">
              <h2
                className={`${isReferenceOpen ? "text-xl" : "text-base"} font-bold text-slate-900 transition-all dark:text-foreground`}
              >
                Understanding Your Representation
              </h2>
              {isReferenceOpen && (
                <p className="mt-1 text-sm text-slate-500 dark:text-(--foreground-secondary)">
                  New York residents are represented across three main levels of government.
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 md:flex dark:bg-blue-500/15 dark:text-blue-300">
                <span className="animate-pulse">●</span>
                New York
              </div>
              {isReferenceOpen ? (
                <ChevronUp className="h-5 w-5 text-slate-400 dark:text-(--muted)" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400 dark:text-(--muted)" />
              )}
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
                      <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-(--border) dark:bg-(--surface-card)">
                        <th className="px-8 py-4 font-bold text-slate-700 dark:text-(--foreground-secondary)">Office</th>
                        <th className="px-4 py-4 font-bold text-slate-700 dark:text-(--foreground-secondary)">Members</th>
                        <th className="px-4 py-4 font-bold text-slate-700 dark:text-(--foreground-secondary)">Term</th>
                        <th className="px-4 py-4 font-bold text-slate-700 dark:text-(--foreground-secondary)">Limit</th>
                        <th className="px-4 py-4 font-bold text-slate-700 dark:text-(--foreground-secondary)">Next Election</th>
                        <th className="px-8 py-4 font-bold text-slate-700 dark:text-(--foreground-secondary)">Responsibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-(--border)">
                      {officeInfo.map((info) => (
                        <tr
                          key={info.office}
                          className="transition-colors hover:bg-slate-50/50 dark:hover:bg-(--surface-card)/60"
                        >
                          <td className="px-8 py-4">
                            <span className={`rounded-md border px-2.5 py-1 text-[11px] font-bold ${info.color}`}>{info.office}</span>
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-600 dark:text-(--foreground-secondary)">{info.members}</td>
                          <td className="px-4 py-4 font-medium text-slate-600 dark:text-(--foreground-secondary)">{info.term}</td>
                          <td className="px-4 py-4 font-medium text-slate-600 dark:text-(--foreground-secondary)">{info.limit}</td>
                          <td className="px-4 py-4">
                            <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:border-(--border) dark:bg-(--surface-glass) dark:text-(--muted)">
                              {info.next}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-xs leading-relaxed text-slate-500 dark:text-(--muted)">{info.power}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/30 p-8 md:grid-cols-2 lg:grid-cols-3 dark:border-(--border) dark:bg-(--surface-card)/40">
                  <a
                    href="https://www.nysenate.gov/legislation/laws/CONSOLIDATED"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-(--accent) dark:border-(--border) dark:bg-(--surface-elevated) dark:hover:border-(--accent)"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-foreground">Consolidated Laws of NY</p>
                        <p className="text-[10px] text-slate-500 dark:text-(--muted)">Official NY State Legislative database</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-(--accent) dark:text-(--muted) dark:group-hover:text-(--accent)" />
                  </a>
                  <a
                    href="https://www.nysenate.gov/senators-committees"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-(--accent) dark:border-(--border) dark:bg-(--surface-elevated) dark:hover:border-(--accent)"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-foreground">Legislative Committees</p>
                        <p className="text-[10px] text-slate-500 dark:text-(--muted)">View Senate committee assignments</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-(--accent) dark:text-(--muted) dark:group-hover:text-(--accent)" />
                  </a>
                  <a
                    href="https://www.house.gov/representatives#new-york"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-(--accent) dark:border-(--border) dark:bg-(--surface-elevated) dark:hover:border-(--accent)"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-foreground">Federal Delegation</p>
                        <p className="text-[10px] text-slate-500 dark:text-(--muted)">US House & Senate members</p>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-(--accent) dark:text-(--muted) dark:group-hover:text-(--accent)" />
                  </a>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-4 px-8 text-[11px] italic text-slate-400 dark:border-(--border) dark:bg-(--surface-card)/50 dark:text-(--muted)">
                  *Note: Directory reflects fresh data sourced from live integrations and official government directories. See{" "}
                  <a className="text-(--accent) hover:underline" href="/data-sources">
                    data-sources
                  </a>{" "}
                  for more info.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionReveal>

      {/* Tabs: Levels of Government — reset legislature-specific filters on switch */}
      <MotionReveal className="mt-10 mb-6 border-b border-slate-200 dark:border-(--border)">
        <div className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {GOV_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => {
                setSelectedLevel(level);
                // Reset legislature-specific filters when switching tabs
                setSelectedCommittee("All");
                setSelectedSubcommittee("All");
                setSelectedCaucus("All");
              }}
              className={`border-b-2 px-2 py-4 text-center text-sm font-bold transition-colors ${selectedLevel === level
                ? "border-(--accent) bg-slate-50/50 text-(--accent) dark:bg-(--surface-card)/60"
                : "border-transparent text-slate-500 hover:bg-slate-50/30 hover:text-slate-800 dark:text-(--muted) dark:hover:bg-(--surface-card)/40 dark:hover:text-foreground"
                }`}
            >
              {level}
            </button>
          ))}
        </div>
      </MotionReveal>

      {/* FILTERS */}
      <MotionReveal className="mb-12 rounded-4xl border border-slate-200 bg-white p-6 shadow-sm dark:border-(--border) dark:bg-(--surface-elevated) dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_40px_-16px_rgba(0,0,0,0.35)]">
        <div className="space-y-5">

          {/* Row 1: Search + District + Reset */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative min-w-50 flex-1">
              <span className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                Search
              </span>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-(--muted)" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, committee, district..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-(--accent-soft) dark:border-(--border) dark:bg-(--surface-card) dark:text-foreground dark:placeholder:text-(--muted)"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-(--muted) dark:hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* District */}
            <div className="flex min-w-32.5 flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                District
              </span>
              <ThemedSelect
                instanceId="rep-filter-district"
                ariaLabel="District filter"
                value={selectedDistrict}
                options={districtSelectOptions}
                onChange={setSelectedDistrict}
              />
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                onClick={clearAllFilters}
                disabled={!isAnyFilterActive}
                className={`flex h-10.5 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${isAnyFilterActive ? "bg-red-500 dark:bg-red-900 text-white shadow-md hover:bg-red-600" : "cursor-not-allowed bg-slate-100 text-slate-400 opacity-50 dark:bg-(--surface-card) dark:text-(--muted)"}`}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {/* Row 2: Borough chips + Party chips side by side */}
          <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-(--border) lg:flex-row">
            {/* Boroughs */}
            <div className="flex flex-1 flex-wrap items-center gap-2 pt-4">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                Borough:
              </span>
              {dynamicBoroughs.map((b) => {
                const active = selectedBoroughs.includes(b);
                return (
                  <button
                    key={b}
                    onClick={() => toggleBorough(b)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${active ? "border-(--accent) bg-(--accent) text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-600 dark:border-(--border) dark:bg-(--surface-card) dark:text-(--muted) dark:hover:border-(--accent)"}`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {b}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="hidden w-px self-stretch bg-slate-100 dark:bg-(--border) lg:block" />

            {/* Party chips */}
            <div className="flex flex-1 flex-wrap items-center gap-2 pt-4">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                Party:
              </span>
              {availableParties.map((party) => {
                const active = selectedParties.includes(party);
                return (
                  <button
                    key={party}
                    onClick={() => toggleParty(party)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${active ? "border-(--accent) bg-(--accent) text-white" : `border-slate-200 bg-white text-slate-500 hover:border-slate-600 dark:border-(--border) dark:bg-(--surface-card) dark:text-(--muted) dark:hover:border-(--accent)`}`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {party}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Committee / Subcommittee / Caucus dropdowns */}
          <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-(--border)">
            <div className="flex min-w-50 flex-1 flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                Committee
              </span>
              <ThemedSelect
                instanceId="rep-filter-committee"
                ariaLabel="Committee filter"
                value={selectedCommittee}
                options={committeeSelectOptions}
                onChange={setSelectedCommittee}
              />
            </div>

            <div className="flex min-w-50 flex-1 flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                Subcommittee
              </span>
              <ThemedSelect
                instanceId="rep-filter-subcommittee"
                ariaLabel="Subcommittee filter"
                value={selectedSubcommittee}
                options={subcommitteeSelectOptions}
                onChange={setSelectedSubcommittee}
              />
            </div>

            <div className="flex min-w-50 flex-1 flex-col gap-1.5">
              <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-(--muted)">
                Caucus
              </span>
              <ThemedSelect
                instanceId="rep-filter-caucus"
                ariaLabel="Caucus filter"
                value={selectedCaucus}
                options={caucusSelectOptions}
                onChange={setSelectedCaucus}
              />
            </div>
          </div>

        </div>
      </MotionReveal>

      {/* RESULTS */}
      <div>
        {error && (
          <div className="mb-8 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900/45 dark:bg-red-950/35 dark:text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-105 animate-pulse rounded-3xl bg-slate-100 dark:bg-(--surface-card)" />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="mb-6 flex items-center justify-between px-2">
              <p className="text-sm font-medium text-slate-500 dark:text-(--foreground-secondary)">
                Showing{" "}
                <span className="font-bold text-slate-900 dark:text-foreground">
                  {Math.min(visibleCount, filteredPoliticians.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-900 dark:text-foreground">{filteredPoliticians.length}</span>{" "}
                representatives
              </p>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6"
            >
              {filteredPoliticians.slice(0, visibleCount).map((p, idx) => (
                <PoliticianCard key={`${p.id || p.name}-${idx}`} p={p} />
              ))}
            </motion.div>

            {filteredPoliticians.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-slate-300 bg-white py-24 dark:border-(--border) dark:bg-(--surface-elevated)">
                <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400 dark:bg-(--surface-card) dark:text-(--muted)">
                  <Search className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-foreground">No representatives found</h3>
                <p className="mt-2 text-slate-500 dark:text-(--foreground-secondary)">Try adjusting your filters or search term</p>
                <button onClick={clearAllFilters} className="mt-6 font-bold text-(--accent) hover:underline">
                  Clear all filters
                </button>
              </div>
            )}

            {visibleCount < filteredPoliticians.length && (
              <div className="mt-16 flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="group relative flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-10 py-4 font-bold text-slate-900 transition-all hover:border-(--accent) hover:shadow-lg active:scale-95 dark:border-(--border) dark:bg-(--surface-elevated) dark:text-foreground dark:hover:border-(--accent)"
                >
                  <span>Show More</span>
                  <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-y-0.5 group-hover:text-(--accent) dark:text-(--muted)" />
                  <div className="absolute -right-3 -top-3 rounded-md bg-(--accent) px-2 py-1 text-[10px] font-bold text-white shadow-sm dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                    +{filteredPoliticians.length - visibleCount}
                  </div>
                </button>
                <button
                  onClick={() => setVisibleCount(filteredPoliticians.length)}
                  className={`relative flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-4 text-sm font-bold text-white transition-all ${getLevelHoverAccent("")} hover:shadow-lg active:scale-95 dark:bg-foreground dark:text-background`}
                >
                  <span>Show All</span>
                  <ChevronDown className="h-5 w-5 text-slate-400 dark:text-(--background)/70 dark:hover:text-white" />
                  <span className="absolute -right-3 -top-3 rounded-md border border-slate-200 bg-(--accent) px-2 py-1 text-[10px] font-bold text-white shadow-sm dark:border-(--border)">
                    = {filteredPoliticians.length}
                  </span>
                </button>
              </div>
            )}

            {/* scroll top/bot */}
            <div className={`fixed right-8 z-50 flex flex-col gap-2 transition-all duration-300 ${ atBottom ? "bottom-58" : "bottom-28" }`}>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="rounded-xl border-2 border-slate-200 bg-white/90 p-3 text-slate-600 shadow-lg backdrop-blur-sm transition-all hover:border-(--accent) hover:text-(--accent) active:scale-95 dark:border-(--border) dark:bg-(--surface-elevated)/95 dark:text-(--foreground-secondary) dark:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.5)] dark:hover:border-(--accent) dark:hover:text-(--accent)"
                title="Scroll to top"
              >
                <ChevronsUp className="h-5 w-5" />
              </button>
              <button
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
                className="rounded-xl border-2 border-slate-200 bg-white/90 p-3 text-slate-600 shadow-lg backdrop-blur-sm transition-all hover:border-(--accent) hover:text-(--accent) active:scale-95 dark:border-(--border) dark:bg-(--surface-elevated)/95 dark:text-(--foreground-secondary) dark:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.5)] dark:hover:border-(--accent) dark:hover:text-(--accent)"
                title="Scroll to bottom"
              >
                <ChevronsDown className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
