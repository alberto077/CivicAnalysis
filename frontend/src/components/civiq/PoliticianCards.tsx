"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import { Check, Search, X, RotateCcw } from "lucide-react";
import {
  getPoliticians,
  getPoliticianFilters,
  type Politician,
} from "@/lib/api";
import { ThemedSelect } from "./ThemedSelect";

const BOROUGH_CANONICAL: Record<string, string> = {
  bronx: "Bronx",
  brooklyn: "Brooklyn",
  manhattan: "Manhattan",
  queens: "Queens",
  "staten island": "Staten Island",
};

function normalizeBorough(value?: string): string {
  if (!value) return "All";

  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "all") return "All";

  return BOROUGH_CANONICAL[normalized] || value.trim();
}

function splitBoroughs(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[\/,|]/)
    .map((part) => normalizeBorough(part))
    .filter((part) => part !== "All" && Boolean(part));
}

function compareDistricts(a: string, b: string) {
  const aNumber = Number(a);
  const bNumber = Number(b);

  if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber)) {
    return aNumber - bNumber;
  }

  return a.localeCompare(b);
}

function getLearnMoreUrl(p: Politician) {
  if (p.bio_url?.trim()) return p.bio_url.trim();

  return `https://www.google.com/search?q=${encodeURIComponent(
    `${p.name} ${p.office} District ${p.district ?? ""} ${p.borough} official profile`,
  )}`;
}

export function PoliticianCards({ userBorough }: { userBorough?: string }) {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");

  const filterRequestIdRef = useRef(0);
  const politicianRequestIdRef = useRef(0);

  const boroughInstance = useId().replace(/:/g, "");
  const districtInstance = useId().replace(/:/g, "");
  const boroughSelectId = `borough-select-${boroughInstance}`;
  const districtSelectId = `district-select-${districtInstance}`;

  useEffect(() => {
    async function loadFilterOptions() {
      const requestId = ++filterRequestIdRef.current;

      setError(null);

      try {
        const data = await getPoliticianFilters();

        if (requestId === filterRequestIdRef.current) {
          const options = new Set<string>(["All"]);

          for (const borough of data.boroughs) {
            if (borough?.trim()) {
              const parts = splitBoroughs(borough);
              if (parts.length === 0) {
                options.add(normalizeBorough(borough));
              } else {
                for (const part of parts) options.add(part);
              }
            }
          }

          setLocationOptions(
            Array.from(options).sort((a, b) => {
              if (a === "All") return -1;
              if (b === "All") return 1;
              return a.localeCompare(b);
            }),
          );
        }
      } catch (e) {
        if (requestId === filterRequestIdRef.current) {
          setError(
            e instanceof Error ? e.message : "Unable to load filter options",
          );
        }
      }
    }

    void loadFilterOptions();
  }, [userBorough]);

  useEffect(() => {
    async function loadPoliticiansForSelection() {
      const requestId = ++politicianRequestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        // Always fetch the full representative set once;
        // borough/district filters are applied locally for consistent behavior.
        const data = await getPoliticians();

        if (requestId === politicianRequestIdRef.current) {
          setPoliticians(data);
        }
      } catch (e) {
        if (requestId === politicianRequestIdRef.current) {
          setError(
            e instanceof Error ? e.message : "Unable to load representatives",
          );
          setPoliticians([]);
        }
      } finally {
        if (requestId === politicianRequestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void loadPoliticiansForSelection();
  }, []);

  const boroughFilteredPoliticians =
    selectedLocation === "All"
      ? politicians
      : politicians.filter(
          (p) => splitBoroughs(p.borough).includes(selectedLocation),
        );

  const districtOptions = [
    "All",
    ...Array.from(
      new Set(
        boroughFilteredPoliticians
          .map((p) => p.district?.trim())
          .filter((district): district is string => Boolean(district)),
      ),
    ).sort(compareDistricts),
  ];

  const filteredPoliticians =
    selectedDistrict === "All"
      ? boroughFilteredPoliticians
      : boroughFilteredPoliticians.filter(
          (p) => p.district?.trim() === selectedDistrict,
        );

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <MotionReveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-limelight text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
            Local Representatives
          </h2>

          {(selectedLocation !== "All" || selectedDistrict !== "All") && (
            <span className="font-work-sans rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
              Filtered for{" "}
              {selectedLocation !== "All" ? selectedLocation : "All Boroughs"}
              {selectedDistrict !== "All"
                ? ` • District ${selectedDistrict}`
                : ""}
            </span>
          )}
        </div>

        <p className="mt-3 max-w-2xl text-[15px] text-[var(--muted)]">
          Browse representatives connected to backend data, filtered by borough
          and district.
        </p>
      </MotionReveal>

      <MotionReveal className="mt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-work-sans text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Borough
            </span>

            <ThemedSelect
              instanceId={boroughSelectId}
              ariaLabel="Borough"
              value={selectedLocation}
              options={locationOptions.map((option) => ({
                value: option,
                label: option,
              }))}
              onChange={(next) => {
                setSelectedLocation(normalizeBorough(next));
                setSelectedDistrict("All");
              }}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-work-sans text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              District
            </span>

            <ThemedSelect
              instanceId={districtSelectId}
              ariaLabel="District"
              value={selectedDistrict}
              options={districtOptions.map((district) => ({
                value: district,
                label: district === "All" ? "All" : `District ${district}`,
              }))}
              onChange={setSelectedDistrict}
            />
          </label>
        </div>
      </MotionReveal>

      <MotionReveal className="mt-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/45 dark:text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-6 text-sm text-[var(--muted)] dark:bg-[var(--surface-card)]/80">
            Loading representatives...
          </div>
        ) : null}

        {!loading && !error && filteredPoliticians.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-[var(--border)] dark:bg-[var(--surface-card)]/80 dark:text-[var(--foreground-secondary)]">
            No representatives matched these filters.
          </div>
        ) : null}

        {!loading && !error && filteredPoliticians.length > 0 ? (
          <motion.div
            key={`${selectedLocation}-${selectedDistrict}`}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            {filteredPoliticians.map((p) => (
              <motion.div
                key={`${p.name}-${p.borough}-${p.district ?? "na"}`}
                variants={staggerItem}
                className="glass-card group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] p-6 transition duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-limelight text-xl font-bold leading-tight text-[var(--foreground)]">
                      {p.name}
                    </h3>

                    <p className="font-work-sans text-sm font-medium text-[var(--muted)]">
                      {p.office}
                    </p>
                  </div>

                  <div className="flex min-w-[70px] flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white px-2 py-2 dark:bg-[var(--surface-elevated)]">
                    <span className="font-work-sans text-[10px] font-bold uppercase leading-none tracking-widest text-[var(--muted)]">
                      Stance
                    </span>

                    <span className="font-work-sans mt-1 text-center text-xs font-semibold leading-tight text-[var(--foreground)]">
                      {p.political_stance || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <p className="font-work-sans mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Borough
                    </p>

                    <p className="text-[13px] leading-snug text-[var(--foreground)]">
                      {p.borough || "Unknown"}
                    </p>
                  </div>

                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="font-work-sans mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      District
                    </p>

                    <p className="text-[13px] leading-snug text-[var(--foreground)]">
                      {p.district ? p.district : "Not listed"}
                    </p>
                  </div>

                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="font-work-sans mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Party
                    </p>

                    <p className="text-[13px] leading-snug text-[var(--foreground)]">
                      {p.party || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                  <div className="min-w-0">
                    <p className="font-work-sans text-xs text-[var(--muted)]">
                      View official profile and details
                    </p>
                  </div>

                  <a
                    href={getLearnMoreUrl(p)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-work-sans shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-90"
                  >
                    Learn More
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </MotionReveal>
    </section>
  );
}