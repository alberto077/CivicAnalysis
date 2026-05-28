"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Search } from "lucide-react";
import { MotionReveal } from "./MotionReveal";
import { timeAgo } from "@/lib/policyMetadata";

type LegislationEvent = {
  id: number;
  title: string;
  description: string | null;
  jurisdiction: string;
  status: string | null;
  event_date: string | null;
  event_url: string | null;
  outcome: "Passed" | "Failed" | "Pending";
};

const OUTCOME = {
  Passed: { icon: CheckCircle, color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/40", text: "text-emerald-700 dark:text-emerald-400" },
  Failed: { icon: XCircle, color: "#ef4444", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800/40", text: "text-red-700 dark:text-red-400" },
  Pending: { icon: Clock, color: "#64748b", bg: "bg-slate-50 dark:bg-slate-900/40", border: "border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-400" },
} as const;

export function RecentUpdates() {
  const [events, setEvents] = useState<LegislationEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "Passed" | "Failed" | "Pending">("all");
  const LIMIT = 20;

  const fetchEvents = useCallback(async (newOffset = 0, append = false) => {
    if (newOffset === 0) setLoading(true); else setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
      const res = await fetch(`/api/civic/votes?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { events: LegislationEvent[]; total: number };
      setTotal(data.total);
      setEvents(prev => append ? [...prev, ...data.events] : data.events);
      setOffset(newOffset + data.events.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchEvents(0, false); }, [fetchEvents]);

  const filtered = events.filter(e => {
    if (outcomeFilter !== "all" && e.outcome !== outcomeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return e.title.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    passed: events.filter(e => e.outcome === "Passed").length,
    failed: events.filter(e => e.outcome === "Failed").length,
    pending: events.filter(e => e.outcome === "Pending").length,
  };

  return (
    <MotionReveal>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-work-sans text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] leading-none">NYC Council · Legistar</p>
            <h2 className="font-limelight text-lg font-semibold tracking-tight text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] leading-tight">
              Recent Legislation
            </h2>
          </div>
          <button type="button" onClick={() => fetchEvents(0, false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-all shadow-sm">
            <RefreshCw className="h-3 w-3" />Refresh
          </button>
        </div>

        {/* Stats */}
        {!loading && events.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {(["Passed", "Failed", "Pending"] as const).map(o => {
              const cfg = OUTCOME[o];
              const Icon = cfg.icon;
              const count = stats[o.toLowerCase() as keyof typeof stats];
              return (
                <button key={o} type="button"
                  onClick={() => setOutcomeFilter(p => p === o ? "all" : o)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${outcomeFilter === o ? "shadow-sm" : `${cfg.bg} ${cfg.border} hover:opacity-80`
                    }`}
                  style={outcomeFilter === o ? { borderColor: `${cfg.color}50`, background: `${cfg.color}10` } : undefined}>
                  <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                  <span className="text-[15px] font-black tabular-nums" style={{ color: cfg.color }}>{count}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">{o}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search legislation…"
            className="font-work-sans w-full rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 pl-9 pr-3 py-2 text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15" />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 p-4 h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 text-[12px] text-red-800 dark:text-red-200">
            <p className="font-semibold">Could not load legislation.</p>
            <p className="opacity-80 mt-0.5">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-[var(--border)] text-center">
            <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">No results</p>
            <p className="text-[11px] text-[var(--muted)]">Try adjusting the search or filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-work-sans text-[10px] font-bold text-[var(--muted)]">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}{outcomeFilter !== "all" ? ` · ${outcomeFilter}` : ""}
            </p>
            {filtered.map(event => {
              const cfg = OUTCOME[event.outcome] ?? OUTCOME.Pending;
              const Icon = cfg.icon;
              return (
                <motion.div key={event.id} layout
                  className="rounded-2xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 backdrop-blur-sm px-4 py-3 flex items-start gap-3 hover:shadow-sm transition-shadow">
                  <div className={`flex shrink-0 items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold mt-0.5 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    <Icon className="h-3 w-3" />
                    {event.outcome}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.event_date && (
                        <span className="text-[9px] text-[var(--muted)] flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />{timeAgo(event.event_date)}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">
                        {event.jurisdiction}
                      </span>
                    </div>
                  </div>
                  {event.event_url && (
                    <a href={event.event_url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                      title="View on Legistar">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </motion.div>
              );
            })}
            {offset < total && (
              <button type="button" onClick={() => fetchEvents(offset, true)} disabled={loadingMore}
                className="w-full py-3 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[12px] font-bold text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loadingMore
                  ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />Loading…</>
                  : <>Load more · {total - offset} remaining</>}
              </button>
            )}
          </div>
        )}
      </div>
    </MotionReveal>
  );
}