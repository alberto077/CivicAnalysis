"use client";

import { useEffect, useRef, useState } from "react";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import { motion } from "framer-motion";
import {
  getPoliticians,
  getPoliticianFilters,
  type Politician,
} from "@/lib/api";

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

export function PoliticianCards({ userBorough }: { userBorough?: string }) {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("All");
  const filterRequestIdRef = useRef(0);
  const politicianRequestIdRef = useRef(0);

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
              options.add(normalizeBorough(borough));
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
        const data = await getPoliticians({
          borough: selectedLocation,
        });

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
  }, [selectedLocation]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <MotionReveal>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
            Local Representatives
          </h2>

          {selectedLocation !== "All" && (
            <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
              Filtered for {selectedLocation}
            </span>
          )}
        </div>

        <p className="mt-3 max-w-2xl text-[15px] text-[var(--muted)]">
          Browse representatives connected to backend data, filtered by borough.
        </p>
      </MotionReveal>

      <MotionReveal className="mt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Borough
            </span>

            <select
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none focus:border-[var(--accent)]"
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(normalizeBorough(e.target.value));
              }}
            >
              {locationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </MotionReveal>

      <MotionReveal className="mt-10">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-[var(--border)] bg-white/70 px-4 py-6 text-sm text-[var(--muted)]">
            Loading representatives...
          </div>
        ) : null}

        {!loading && !error && politicians.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
            No representatives matched this borough.
          </div>
        ) : null}

        {!loading && !error && politicians.length > 0 ? (
          <motion.div
            key={selectedLocation}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            {politicians.map((p) => (
              <motion.div
                key={`${p.name}-${p.borough}-${p.district ?? "na"}`}
                variants={staggerItem}
                className="glass-card group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] p-6 transition duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-sans text-xl font-bold leading-tight text-[var(--foreground)]">
                      {p.name}
                    </h3>
                    <p className="text-sm font-medium text-[var(--muted)]">
                      {p.office}
                      {p.district ? `, District ${p.district}` : ""}
                    </p>
                  </div>

                  <div className="flex min-w-[70px] flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-white px-2 py-2">
                    <span className="text-[10px] font-bold uppercase leading-none tracking-widest text-[var(--muted)]">
                      Stance
                    </span>
                    <span className="mt-1 text-center text-xs font-semibold leading-tight text-[var(--foreground)]">
                      {p.political_stance}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Borough
                    </p>
                    <p className="text-[13px] leading-snug text-[var(--foreground)]">
                      {p.borough}
                    </p>
                  </div>

                  <div className="border-t border-[var(--border)] pt-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Party
                    </p>
                    <p className="text-[13px] leading-snug text-[var(--foreground)]">
                      {p.party || "Unknown"}
                    </p>
                  </div>

                  {p.bio_url ? (
                    <a
                      href={p.bio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      Official profile
                    </a>
                  ) : null}

                  <p className="text-[11px] text-[var(--muted)]">
                    Source:{" "}
                    {p.data_source === "database"
                      ? "Civic database"
                      : "Seeded representative dataset"}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </MotionReveal>
    </section>
  );
}