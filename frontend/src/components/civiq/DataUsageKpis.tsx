"use client";

import { Activity, Building2, Database, Link2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type KpiState = {
  civicRecordsIndex: number;
  newThisMonth: number;
  uniqueSourcesIndexed: number;
  boroughsCovered: number;
  fetchedAt: Date | null;
  loading: boolean;
  error: string | null;
};

const REFRESH_MS = 60_000;
const NYC_BOROUGH_COUNT = 5;
type RecordsMetricsResponse = {
  indexed_records_total?: number;
  new_records_this_month?: number;
  unique_sources_indexed?: number;
  updated_at?: string;
};

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value));
}

function formatUpdatedAt(date: Date | null): string {
  if (!date) return "Not synced yet";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function DataUsageKpis() {
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

  const cards = [
    {
      label: "Civic Records Indexed",
      value: formatValue(state.civicRecordsIndex),
      icon: Database,
    },
    {
      label: "New This Month",
      value: formatValue(state.newThisMonth),
      icon: Activity,
    },
    {
      label: "Unique Sources Indexed",
      value: formatValue(state.uniqueSourcesIndexed),
      icon: Link2,
    },
    {
      label: "Boroughs Covered",
      value: formatValue(state.boroughsCovered),
      icon: Building2,
    },
  ];

  return (
    <section className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-sm dark:border-[var(--border)] dark:bg-[var(--surface-card)]/95">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-limelight text-xl font-bold text-slate-900 dark:text-[var(--foreground)]">
              Live Data Usage KPIs
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-[var(--foreground-secondary)]">
              Continuously refreshed from live civic records and coverage metadata.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground-secondary)]">
            <RefreshCw className={`h-3.5 w-3.5 ${state.loading ? "animate-spin" : ""}`} />
            <span>Updated: {formatUpdatedAt(state.fetchedAt)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/80"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[var(--muted)]">
                  {card.label}
                </p>
                <card.icon className="h-4 w-4 text-slate-400 dark:text-[var(--foreground-secondary)]" />
              </div>
              <p className="font-limelight text-3xl font-bold text-slate-900 dark:text-[var(--foreground)]">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {state.error ? (
          <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
            Live refresh warning: {state.error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
