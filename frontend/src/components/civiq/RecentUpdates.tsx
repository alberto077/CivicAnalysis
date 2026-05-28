"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Clock, FileText, RefreshCw, Search, AlertCircle } from "lucide-react";
import { MotionReveal } from "./MotionReveal";
import { POLICY_AREAS, timeAgo, srcColor } from "@/lib/policyMetadata";
import { getRecentPolicies, type PolicyBriefing } from "@/lib/api";
import type { HeroContext } from "./Hero";
import type { CivicProfile } from "@/lib/useProfile";

type Props = {
  context: HeroContext;
  isPersonalized: boolean;
  profile: CivicProfile | null;
};

function timeframeToDays(t: string): number | undefined {
  if (t === "Last 30 days") return 30;
  if (t === "Last 6 months") return 180;
  if (t === "Last year") return 365;
  return undefined;
}

export function RecentUpdates({ context, isPersonalized, profile }: Props) {
  const [items, setItems] = useState<PolicyBriefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("All");

  const borough = context.location || (isPersonalized && profile?.borough) || undefined;
  const area = context.issue || undefined;
  const days = timeframeToDays(context.timeframe);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { policies } = await getRecentPolicies(borough, area, days);
      setItems(policies);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [borough, area, days]); // eslint-disable-line react-hooks/exhaustive-deps

  // unique source types for filter tabs
  const sourceTypes = ["All", ...Array.from(new Set(items.map(i => i.source_type).filter(Boolean)))];

  const filtered = items.filter(item => {
    if (sourceFilter !== "All" && item.source_type !== sourceFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) ||
        (item.impact ?? "").toLowerCase().includes(q) ||
        (item.affects ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const contextLabel = [
    borough,
    area?.split(" ").slice(0, 2).join(" "),
    context.timeframe,
  ].filter(Boolean).join(" · ") || "All NYC";

  return (
    <MotionReveal>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-work-sans text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] leading-none mb-0.5">
              {contextLabel}
            </p>
            <h2 className="font-limelight text-lg font-semibold tracking-tight text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] leading-tight">
              Recent Legislation &amp; Records
            </h2>
          </div>
          <button type="button" onClick={fetchItems}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-all shadow-sm">
            <RefreshCw className="h-3 w-3" />Refresh
          </button>
        </div>

        {/* source type tabs */}
        {!loading && sourceTypes.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {sourceTypes.map(type => (
              <button key={type} type="button"
                onClick={() => setSourceFilter(type)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${sourceFilter === type
                  ? "bg-[var(--accent)] text-white border-transparent shadow-sm"
                  : "bg-white/70 dark:bg-[var(--surface-elevated)]/70 border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}>
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search records…"
            className="font-work-sans w-full rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 pl-9 pr-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15" />
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 p-4 h-24" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 flex items-start gap-2" role="alert">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-800 dark:text-red-200">Could not load records</p>
              <p className="text-[12px] text-red-700/80 dark:text-red-300/70 mt-0.5">{error}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-[var(--border)] text-center">
            <FileText className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">No records found</p>
            <p className="text-[11.5px] text-[var(--muted)]">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-work-sans text-[10px] font-bold text-[var(--muted)]">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              {sourceFilter !== "All" ? ` · ${sourceFilter}` : ""}
            </p>
            {filtered.map((item, i) => {
              const color = srcColor(item.source_type);
              const areaMeta = POLICY_AREAS.find(a =>
                a.id !== "All" && (item.topic_tags ?? []).some(t =>
                  a.id.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(a.keywords[0] ?? "___")
                )
              );

              return (
                <motion.div key={item.id} layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.15) }}
                  className="rounded-2xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 backdrop-blur-sm px-4 py-3.5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      {/* source type + area tags */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border"
                          style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
                          {item.source_type}
                        </span>
                        {areaMeta && (
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold border"
                            style={{ color: areaMeta.color, background: `${areaMeta.color}12`, borderColor: `${areaMeta.color}30` }}>
                            {areaMeta.label.split(" ").slice(0, 2).join(" ")}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white leading-snug mb-1">
                        {item.title}
                      </p>

                      {/* Impact / affects */}
                      {(item.impact || item.affects) && (
                        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {item.impact || item.affects}
                        </p>
                      )}

                      {/* Date */}
                      {item.published_date && (
                        <p className="flex items-center gap-1 text-[10px] text-[var(--muted)] mt-1.5">
                          <Clock className="h-2.5 w-2.5" />
                          {timeAgo(item.published_date)}
                        </p>
                      )}
                    </div>

                    {/* Link */}
                    {item.source_url && item.source_url !== "#" && (
                      <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-colors"
                        title="View source">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MotionReveal>
  );
}