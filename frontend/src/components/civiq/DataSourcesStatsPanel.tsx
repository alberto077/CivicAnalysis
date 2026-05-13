"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Info, RefreshCw } from "lucide-react";

const REFERENCE_STATS: readonly { n: string; label: string; tooltip: string }[] = [
  {
    n: "290+",
    label: "Representatives tracked",
    tooltip:
      "Live roster across NYC Council, NYS Assembly, NYS Senate, New York’s U.S. House delegation, and both U.S. Senators—refreshed daily into politicians.json.",
  },
  {
    n: "6",
    label: "Official data tiers",
    tooltip:
      "Six jurisdiction buckets we index: (1) U.S. House — NY districts, (2) U.S. Senate — NY’s senators, (3) NYS Legislature — Senate & Assembly, (4) NYC Council plus NYC Open Data civic endpoints, (5) NYS GIS — state leg & congressional district boundaries, (6) NYC geospatial layers (council, borough, NTA/MODZCTA) and Planning Labs address geocoding.",
  },
  {
    n: "384",
    label: "Embedding dimensions",
    tooltip:
      "Each document chunk is embedded with BAAI/bge-small-en-v1.5. The model outputs one 384-float vector per chunk, stored in Neon Postgres with pgvector for semantic (cosine) search.",
  },
  {
    n: "Daily",
    label: "Refresh cadence",
    tooltip:
      "GitHub Actions runs the ingest pipeline and politician scrapers on a daily schedule (06:00 UTC), committing fresh records and politicians.json.",
  },
] as const;

const REFRESH_MS = 60_000;
const NYC_BOROUGH_COUNT = 5;

type RecordsMetricsResponse = {
  indexed_records_total?: number;
  new_records_this_month?: number;
  unique_sources_indexed?: number;
  updated_at?: string;
};

type KpiState = {
  civicRecordsIndex: number;
  newThisMonth: number;
  uniqueSourcesIndexed: number;
  boroughsCovered: number;
  fetchedAt: Date | null;
  loading: boolean;
  error: string | null;
};

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value));
}

function formatUpdatedAt(date: Date | null): string {
  if (!date) return "Not synced yet";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function StatCell({
  value,
  label,
  tooltip,
  tipId,
  valueClassName,
  variant = "reference",
}: {
  value: string;
  label: string;
  tooltip?: string;
  tipId?: string;
  valueClassName?: string;
  variant?: "reference" | "live";
}) {
  const showTip = Boolean(tooltip && tipId);
  const shell =
    variant === "live"
      ? "border-emerald-200/90 bg-emerald-50/90 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/[0.07] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      : "border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${shell}`}>
      <div
        className={`font-work-sans text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white ${valueClassName ?? ""}`}
      >
        {value}
      </div>
      <div className="mt-0.5 flex items-start gap-1.5">
        <div className="min-w-0 flex-1 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{label}</div>
        {showTip ? (
          <span className="group relative inline-flex shrink-0 translate-y-px">
            <button
              type="button"
              className="rounded-full p-0.5 text-slate-500 transition hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500/70 dark:hover:text-slate-300 dark:focus-visible:outline-blue-400/80"
              aria-label={`About: ${label}`}
              aria-describedby={tipId}
            >
              <Info className="size-3 shrink-0" strokeWidth={2} aria-hidden />
            </button>
            <span
              id={tipId}
              role="tooltip"
              className="pointer-events-none invisible absolute bottom-full left-1/2 z-[80] mb-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] font-medium leading-snug tracking-[0.01em] text-slate-700 opacity-0 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-md transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-white/10 dark:bg-slate-950/98 dark:text-slate-200 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.75)] dark:ring-white/5"
            >
              {tooltip}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DataSourcesStatsPanel() {
  const baseId = useId().replace(/:/g, "");
  const [state, setState] = useState<KpiState>({
    civicRecordsIndex: 0,
    newThisMonth: 0,
    uniqueSourcesIndexed: 0,
    boroughsCovered: 0,
    fetchedAt: null,
    loading: true,
    error: null,
  });

  const fetchMetrics = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const metricsRes = await fetch("/api/civic/metrics/records", {
        cache: "no-store",
      });

      if (!metricsRes.ok) throw new Error(`Records metrics request failed (${metricsRes.status})`);

      const metricsPayload = (await metricsRes.json()) as RecordsMetricsResponse;
      const civicRecordsIndex = Number(metricsPayload.indexed_records_total);
      const newThisMonth = Number(metricsPayload.new_records_this_month);
      const uniqueSourcesIndexed = Number(metricsPayload.unique_sources_indexed);
      const parsedUpdatedAt = metricsPayload.updated_at ? new Date(metricsPayload.updated_at) : new Date();

      setState({
        civicRecordsIndex: Number.isFinite(civicRecordsIndex) ? Math.max(0, Math.floor(civicRecordsIndex)) : 0,
        newThisMonth: Number.isFinite(newThisMonth) ? Math.max(0, Math.floor(newThisMonth)) : 0,
        uniqueSourcesIndexed: Number.isFinite(uniqueSourcesIndexed)
          ? Math.max(0, Math.floor(uniqueSourcesIndexed))
          : 0,
        boroughsCovered: NYC_BOROUGH_COUNT,
        fetchedAt: Number.isNaN(parsedUpdatedAt.valueOf()) ? new Date() : parsedUpdatedAt,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to refresh KPI data",
        fetchedAt: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const interval = window.setInterval(() => {
      void fetchMetrics();
    }, REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [fetchMetrics]);

  const liveStats = [
    { label: "Civic records indexed", value: formatValue(state.civicRecordsIndex) },
    { label: "New this month", value: formatValue(state.newThisMonth) },
    { label: "Unique sources indexed", value: formatValue(state.uniqueSourcesIndexed) },
    { label: "Boroughs covered", value: formatValue(state.boroughsCovered) },
  ] as const;

  const liveValueClass = state.loading ? "opacity-45" : "";

  return (
    <section className="mt-10" aria-labelledby="data-sources-stats-heading">
      <div className="rounded-[1.75rem] border border-slate-200/90 bg-white/95 p-5 shadow-md shadow-slate-200/40 ring-1 ring-slate-200/50 backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_24px_80px_-32px_rgba(0,0,0,0.65)] dark:ring-white/[0.04]">
        <div className="mb-6">
          <h2
            id="data-sources-stats-heading"
            className="font-work-sans text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-white"
          >
            Coverage &amp; live index
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-600 sm:text-[13px] dark:text-slate-500">
            Reference figures for the architecture, plus counts from the production database (this page refetches about
            every minute).
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
                Reference metrics
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {REFERENCE_STATS.map((stat, i) => (
                <StatCell
                  key={stat.label}
                  value={stat.n}
                  label={stat.label}
                  tooltip={stat.tooltip}
                  tipId={`${baseId}-ref-${i}`}
                  variant="reference"
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-white/10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400/95">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/45 opacity-60 dark:bg-emerald-400/50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)] dark:bg-emerald-400 dark:shadow-[0_0_10px_rgba(52,211,153,0.55)]" />
                </span>
                Live from database
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
                <RefreshCw
                  className={`h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-500 ${state.loading ? "animate-spin" : ""}`}
                />
                <span>Updated {formatUpdatedAt(state.fetchedAt)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {liveStats.map((row) => (
                <StatCell
                  key={row.label}
                  value={row.value}
                  label={row.label}
                  valueClassName={liveValueClass}
                  variant="live"
                />
              ))}
            </div>
            {state.error ? (
              <p className="mt-4 text-[11px] text-amber-800 dark:text-amber-300/95" role="alert">
                Live refresh warning: {state.error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
