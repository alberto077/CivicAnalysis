"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Filter, Search, X, RotateCcw } from "lucide-react";
import {
  getPoliticians,
  getPoliticianFilters,
  type Politician,
} from "@/lib/api";

const GOV_LEVELS = ["All Levels", "City Council", "State Senate", "Federal"];

export function PoliticianCards() {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter States
  const [selectedBoroughs, setSelectedBoroughs] = useState<string[]>([]);
  const [dynamicBoroughs, setDynamicBoroughs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [selectedParty, setSelectedParty] = useState("All");
  const [selectedStance, setSelectedStance] = useState("All");
  
  const politicianRequestIdRef = useRef(0);

  const isAnyFilterActive = useMemo(() => {
    return selectedBoroughs.length > 0 || 
           selectedLevel !== "All Levels" || 
           selectedParty !== "All" || 
           selectedStance !== "All" ||
           searchTerm !== "";
  }, [selectedBoroughs, selectedLevel, selectedParty, selectedStance, searchTerm]);

  const clearAllFilters = () => {
    setSelectedBoroughs([]);
    setSelectedLevel("All Levels");
    setSelectedParty("All");
    setSelectedStance("All");
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
          setDynamicBoroughs(filters.boroughs);
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
        const boroughParam = selectedBoroughs.length > 0 ? selectedBoroughs.join(",") : undefined;
        const data = await getPoliticians({
          borough: boroughParam,
        });

        if (requestId === politicianRequestIdRef.current) {
          setPoliticians(data);
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
  }, [selectedBoroughs]);

  // Dynamic extracted filter options based on current data
  const availableParties = useMemo(() => {
    const parties = new Set(politicians.map(p => p.party).filter(Boolean) as string[]);
    return ["All", ...Array.from(parties).sort()];
  }, [politicians]);

  const availableStances = useMemo(() => {
    const stances = new Set(politicians.map(p => p.political_stance).filter(Boolean) as string[]);
    return ["All", ...Array.from(stances).sort()];
  }, [politicians]);

  // Combined client-side filtering
  const filteredPoliticians = useMemo(() => {
    return politicians.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      
      // 1. Universal Search (Name, Office, District, Zip, Neighborhood)
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchLower) ||
        p.office.toLowerCase().includes(searchLower) ||
        (p.district && p.district.toLowerCase().includes(searchLower)) ||
        (p.zip_codes && p.zip_codes.some(z => z.includes(searchLower))) ||
        (p.neighborhoods && p.neighborhoods.some(n => n.toLowerCase().includes(searchLower))) ||
        p.borough.toLowerCase().includes(searchLower);

      // 2. Borough Filter
      const matchesBorough = selectedBoroughs.length === 0 ||
        selectedBoroughs.some(b => p.borough.toLowerCase().includes(b.toLowerCase()));

      // 3. Level of Government Filter
      let matchesLevel = true;
      if (selectedLevel !== "All Levels") {
        if (selectedLevel === "City Council") matchesLevel = p.office.toLowerCase().includes("council");
        else if (selectedLevel === "State Senate") matchesLevel = p.office.toLowerCase().includes("senate");
        else if (selectedLevel === "Federal") matchesLevel = p.office.toLowerCase().includes("house") || p.office.toLowerCase().includes("congress") || p.office.toLowerCase().includes("fed");
      }

      // 4. Party Filter
      const matchesParty = selectedParty === "All" || p.party === selectedParty;

      // 5. Stance Filter
      const matchesStance = selectedStance === "All" || p.political_stance === selectedStance;

      return matchesSearch && matchesBorough && matchesLevel && matchesParty && matchesStance;
    });
  }, [politicians, searchTerm, selectedBoroughs, selectedLevel, selectedParty, selectedStance]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <MotionReveal>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
          Your Representatives
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">
          Search and filter representatives across all levels of government—from City Council to Federal office.
        </p>
      </MotionReveal>

      {/* Level of Government Tabs */}
      <MotionReveal className="mt-12 flex items-center gap-2 mb-6 border-b border-slate-200 pb-px overflow-x-auto hide-scrollbar">
        {GOV_LEVELS.map(level => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 whitespace-nowrap ${selectedLevel === level
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
          >
            {level}
          </button>
        ))}
      </MotionReveal>

      {/* Persistent Filters Area */}
      <MotionReveal className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-12">
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-4 items-center justify-between">
            {/* Universal Search */}
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, zip, neighborhood, district..."
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-shadow"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
               <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Party</span>
                  <select 
                    value={selectedParty}
                    onChange={(e) => setSelectedParty(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                  >
                    {availableParties.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
               </div>

               <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stance</span>
                  <select 
                    value={selectedStance}
                    onChange={(e) => setSelectedStance(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                  >
                    {availableStances.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>

               <button
                  onClick={clearAllFilters}
                  disabled={!isAnyFilterActive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isAnyFilterActive 
                      ? "bg-red-500 text-white shadow-md hover:bg-red-600" 
                      : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                  }`}
               >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear Filters
               </button>
            </div>
          </div>

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

      {/* Results */}
      <MotionReveal>
        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-800 mb-8">
            {error}
          </div>
        )}

        <div className="flex justify-between items-end mb-6">
          <h3 className="font-bold text-slate-800 text-lg">Results <span className="text-slate-400 font-medium text-sm ml-2">({filteredPoliticians.length} found)</span></h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : filteredPoliticians.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            {filteredPoliticians.map((p) => (
              <motion.div
                key={`${p.id || p.name}-${p.borough}-${p.district}`}
                variants={staggerItem}
                className="glass-card group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] p-8 transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
              >
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold leading-tight text-[var(--foreground)]">
                      {p.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md bg-[var(--accent)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
                        {p.office}
                      </span>
                      {p.district && (
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                          District {p.district}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--muted)] font-medium">Borough</span>
                    <span className="font-bold text-[var(--foreground)]">{p.borough}</span>
                  </div>
                  {p.party && p.party.trim() !== "Unknown" && p.party.trim() !== "" && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--muted)] font-medium">Party</span>
                      <span className="font-bold text-[var(--foreground)]">{p.party}</span>
                    </div>
                  )}
                  {p.neighborhoods && p.neighborhoods.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Neighborhoods Served</span>
                       <div className="flex flex-wrap gap-1.5">
                          {p.neighborhoods.slice(0, 3).map(n => (
                            <span key={n} className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                               {n}
                            </span>
                          ))}
                          {p.neighborhoods.length > 3 && <span className="text-[10px] text-slate-400 font-medium">+{p.neighborhoods.length - 3} more</span>}
                       </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm pt-2">
                    <span className="rounded-lg bg-[var(--accent-soft)]/10 px-2 py-1 text-xs font-bold text-[var(--accent)]">
                      {p.political_stance}
                    </span>
                  </div>
                </div>

                <div className="mt-8">
                  <a
                    href={p.bio_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    View Official Profile
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
            <p className="text-[var(--muted)]">No representatives found matching your detailed filters.</p>
            <button onClick={clearAllFilters} className="mt-4 text-[var(--accent)] font-bold text-sm hover:underline">Clear all filters</button>
          </div>
        )}
      </MotionReveal>
    </section>
  );
}