"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import {
  ExternalLink, Globe2, Sparkles, ChevronDown,
  ChevronRight, Newspaper, Hash, X,
  Lightbulb, Users, ArrowRight, AlertCircle,
  BookOpen, Search,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionReveal } from "./MotionReveal";
import { BriefingInline } from "./BriefingInline";
import type { PolicyResponse } from "@/lib/api";
import {
  buildBriefingSourceCards,
  buildDisplayKeyNumbers,
  hasPolicyBriefingContent,
  type BriefingSourceCard,
} from "@/lib/policy-reply";
import { srcColor } from "@/lib/policyMetadata";

type Props = {
  loading: boolean;
  error: string | null;
  response: PolicyResponse | null;
  briefingQuery: string;
  snapshotLoading?: boolean;
  snapshotError?: string | null;
  generalizedBriefing?: PolicyResponse | null;
  filterSummary?: string;
};

function sourceHostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}


const SECTIONS = [
  {
    key: "what_happened" as const,
    label: "What happened", eyebrow: "Story", Icon: Newspaper,
    accent: "#3b82f6", bg: "bg-blue-50/60 dark:bg-blue-950/20",
    border: "border-blue-100 dark:border-blue-900/40",
    iconBg: "bg-blue-500/10", iconColor: "text-blue-600 dark:text-blue-400",
    bulletColor: "#3b82f6",
  },
  {
    key: "why_it_matters" as const,
    label: "Why it matters",
    eyebrow: "Impact",
    Icon: Lightbulb,
    accent: "#f59e0b",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/40",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    bulletColor: "#f59e0b",
  },
  {
    key: "whos_affected" as const,
    label: "Who's affected",
    eyebrow: "People",
    Icon: Users,
    accent: "#10b981",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/40",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bulletColor: "#10b981",
  },
  {
    key: "what_happens_next" as const,
    label: "Take action",
    eyebrow: "Next steps",
    Icon: ArrowRight,
    accent: "#8b5cf6",
    bg: "bg-violet-50/60 dark:bg-violet-950/20",
    border: "border-violet-100 dark:border-violet-900/40",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    bulletColor: "#8b5cf6",
  },
] as const;

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ headline, caption }: { headline: string; caption?: string }) {
  return (
    <div className="relative flex-1 min-w-[120px] overflow-hidden rounded-xl border border-slate-200/80 dark:border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)] p-3 shadow-sm">
      <div className="pointer-events-none absolute left-0 inset-y-2.5 w-[3px] rounded-full bg-[var(--accent)]/50" aria-hidden />
      <div className="pl-2.5">
        <p className="font-work-sans text-[1.05rem] font-extrabold leading-tight tracking-tight text-slate-900 dark:text-[var(--foreground)] tabular-nums">
          {headline}
        </p>
        {caption && (
          <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500 dark:text-[#b8c8dc] line-clamp-2">
            <BriefingInline text={caption} />
          </p>
        )}
      </div>
    </div>
  );
}


function SectionCard({
  eyebrow, label, Icon, items, bg, border, iconBg, iconColor, bulletColor,
}: {
  eyebrow: string; label: string; Icon: any; items: string[];
  accent: string; bg: string; border: string; iconBg: string; iconColor: string; bulletColor: string;
}) {
  if (!items.length) return null;
  return (
    <div className={`rounded-xl border ${border} ${bg} p-3.5`}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
          <Icon className="h-3 w-3" strokeWidth={2} />
        </span>
        <div>
          <p className="font-work-sans text-[7.5px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-[var(--muted)] leading-none">
            {eyebrow}
          </p>
          <h3 className="font-work-sans text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">
            {label}
          </h3>
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-700 dark:text-[#d8e6f2]">
            <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full" style={{ background: bulletColor }} />
            <span><BriefingInline text={item} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── source card ─────────────────────────────────────────────────────────────

function SourceChip({ card }: { card: BriefingSourceCard }) {
  const host = card.url ? sourceHostname(card.url) : "";
  const color = srcColor(card.source_type ?? "");
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-slate-100 dark:border-[var(--border)] bg-white/70 dark:bg-[var(--surface-elevated)]/60 p-3 transition hover:shadow-sm hover:border-slate-200 dark:hover:border-slate-700">
      <div className="flex items-start gap-2 justify-between mb-1">
        <p className="min-w-0 flex-1 text-[11.5px] font-semibold leading-snug text-slate-900 dark:text-[var(--foreground)] line-clamp-2">
          {card.title}
        </p>
        {card.source_type && (
          <span className="shrink-0 rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-widest border"
            style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
            {card.source_type}
          </span>
        )}
      </div>
      {card.published_date && (
        <p className="text-[9px] text-slate-400 dark:text-[var(--muted)] mb-1">{card.published_date}</p>
      )}
      <p className="text-[10.5px] leading-relaxed text-slate-600 dark:text-[#c8d8ea] line-clamp-2 flex-1 mb-2">
        <BriefingInline text={card.description} />
      </p>
      {card.url ? (
        <a href={card.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold hover:underline" style={{ color }}>
          <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2.5} />
          {host || "Open record"}
        </a>
      ) : (
        <p className="text-[10px] text-slate-400 dark:text-[var(--muted)]">No URL available</p>
      )}
    </div>
  );
}

// ─── parse KPI text into headline + caption ───────────────────────────────────
function parseKpi(text: string): { headline: string; caption?: string } {
  const bold = text.trim().match(/^\*\*([^*]+)\*\*\s*(.*)$/);
  if (bold) return { headline: bold[1].trim(), caption: bold[2].trim() || undefined };
  const stat = text.trim().match(/^((?:\$|€|£)?[\d,.]+(?:%|[KMB])?)\s*[—:–\-]\s+(.+)$/i);
  if (stat) return { headline: stat[1].trim(), caption: stat[2].trim() };
  return { headline: text.trim() };
}

// snapshot recent bills/docs as a scannable list before any LLM call
function SnapshotRecordList({ briefing }: { briefing: PolicyResponse }) {
  const items = briefing.what_happened.slice(0, 8);
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.22em] text-[var(--muted)] mb-2">
        Recent indexed records
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2.5 rounded-xl border border-slate-100 dark:border-[var(--border)] bg-white/60 dark:bg-[var(--surface-elevated)]/40 px-3 py-2.5 text-[12px] leading-relaxed text-slate-700 dark:text-[#d8e6f2]">
          <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-[var(--accent)]/40" />
          <span><BriefingInline text={item} /></span>
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export function PolicyBriefingPanel({
  loading, error, response, briefingQuery,
  snapshotLoading = false, snapshotError = null,
  generalizedBriefing = null, filterSummary = "",
}: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const showLive = Boolean(response && !loading);
  const showGeneralized =
    !showLive &&
    generalizedBriefing !== null &&
    hasPolicyBriefingContent(generalizedBriefing) &&
    !snapshotLoading &&
    !snapshotError;
  const showSnapLoading = !showLive && !loading && snapshotLoading;
  const showSnapError = !showLive && !loading && !snapshotLoading && Boolean(snapshotError);
  const showBody = showLive || showGeneralized;

  const EMPTY: PolicyResponse = {
    tldr: [], topic_tags: [], what_happened: [], why_it_matters: [],
    whos_affected: [], key_numbers: [], what_happens_next: [], read_more: [],
    at_a_glance: [], key_takeaways: [], what_this_means: [], relevant_actions: [],
    sources: [], retrieval_sources: [], sources_used: 0,
  };
  const safe = showLive ? response! : showGeneralized && generalizedBriefing ? generalizedBriefing : EMPTY;

  const sourceCards = useMemo(() => buildBriefingSourceCards(safe.sources, safe.retrieval_sources), [safe.sources, safe.retrieval_sources]);
  const kpiItems = useMemo(() => buildDisplayKeyNumbers(safe), [safe]);
  const visibleSources = sourcesExpanded ? sourceCards : sourceCards.slice(0, 4);

  // Deduplicate tldr lines that appear in what_happened
  const tldr = useMemo(() => safe.tldr.slice(0, 2), [safe.tldr]);

  return (
    <section>
      {/* Error banner */}
      {error && (
        <div className="mb-3 rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-2.5 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-100 flex items-start gap-2" role="alert">
          <X className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span><span className="font-semibold">Policy data not available. </span>{error}</span>
        </div>
      )}

      <MotionReveal>
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/90 dark:border-[var(--border)] bg-white dark:bg-[var(--surface-card)] shadow-md">
          <AnimatePresence mode="wait">

            {/* Loading */}
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
                {isDark ? (
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)]/30 border-t-[var(--accent)]" aria-hidden />
                ) : (
                  <div className="relative h-40 w-40 overflow-hidden rounded-2xl">
                    <Image src="/maggla.gif" alt="" fill sizes="160px" className="object-contain" priority unoptimized />
                  </div>
                )}
                <p className="font-work-sans text-sm font-bold text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] animate-pulse">
                  Generating briefing…
                </p>
              </motion.div>
            )}

            {/* Body */}
            {!loading && showBody && (
              <motion.div key={showLive ? "live" : "gen"}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}>
                {/* header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-[var(--border)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                      <Sparkles className="h-3 w-3 text-[var(--accent)]" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-work-sans text-[7.5px] font-black uppercase tracking-[0.22em] text-[var(--muted)] leading-none">
                        {showLive ? "AI Briefing" : "Recent Records"}
                      </p>
                      <p className="font-work-sans text-[11px] font-bold text-slate-800 dark:text-white truncate leading-tight">
                        {briefingQuery || filterSummary || "Current filters"}
                      </p>
                    </div>
                  </div>
                  {sourceCards.length > 0 && (
                    <span className="shrink-0 text-[9px] font-bold text-[var(--muted)] tabular-nums">
                      {sourceCards.length} source{sourceCards.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="px-4 py-4 space-y-4">

                  {/* snapshot notice */}
                  {showGeneralized && (
                    <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10 px-3.5 py-3">
                      <div className="flex items-start gap-2.5">
                        <Search className="h-4 w-4 shrink-0 mt-0.5 text-[var(--accent)]" />
                        <div>
                          <p className="text-[11.5px] font-bold text-slate-800 dark:text-white leading-snug mb-0.5">
                            Showing {safe.sources_used} indexed records for {filterSummary || "current filters"}
                          </p>
                          <p className="text-[10.5px] text-slate-500 dark:text-[var(--muted)] leading-relaxed">
                            Type a question above and press Enter for an AI-generated briefing — e.g. "How does the housing bill affect Brooklyn renters?"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TL;DR */}
                  {showLive && tldr.length > 0 && (
                    <div className="rounded-xl border border-slate-200/60 dark:border-[var(--border)] bg-slate-50/60 dark:bg-[var(--surface-elevated)]/40 p-3.5">
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/10">
                          <Sparkles className="h-2.5 w-2.5 text-[var(--accent)]" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-work-sans text-[7.5px] font-black uppercase tracking-[0.24em] text-[var(--muted)] mb-1">TL;DR</p>
                          {tldr.map((line, i) => (
                            <p key={i} className="text-[13px] font-bold leading-snug text-slate-900 dark:text-white mb-0.5 last:mb-0">
                              <BriefingInline text={line} />
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Topic tags */}
                  {safe.topic_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {safe.topic_tags.map((tag) => (
                        <span key={tag} className="rounded border border-slate-200/80 dark:border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#c8d8ea] shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* KPI strip */}
                  {showLive && kpiItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="font-work-sans text-[7.5px] font-black uppercase tracking-[0.22em] text-[var(--muted)] flex items-center gap-1.5">
                        <Hash className="h-2.5 w-2.5" />Key figures
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {kpiItems.map((item, i) => {
                          const { headline, caption } = parseKpi(item);
                          return <KpiCard key={i} headline={headline} caption={caption} />;
                        })}
                      </div>
                    </div>
                  )}

                  {/* snapshot: scannable record list */}
                  {showGeneralized && <SnapshotRecordList briefing={safe} />}

                  {/* LLM: 2×2 section grid */}
                  {showLive && SECTIONS.some(s => safe[s.key].length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SECTIONS.map((sec) => {
                        const { key, ...rest } = sec;
                        return <SectionCard key={key} {...rest} items={safe[key]} />;
                      })}
                    </div>
                  )}

                  {/* Read more */}
                  {showLive && safe.read_more.length > 0 && (
                    <details className="group rounded-xl border border-slate-200/80 dark:border-[var(--border)] bg-slate-50/50 dark:bg-[var(--surface-elevated)]/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-[var(--foreground)] outline-none hover:bg-slate-100/50 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-slate-400" />More detail
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-180 dark:text-[var(--icon-cyan)]" />
                      </summary>
                      <ul className="space-y-1 border-t border-slate-200/70 dark:border-[var(--border)] px-3 pb-3 pt-2">
                        {safe.read_more.map((item, i) => (
                          <li key={i} className="text-[11px] leading-relaxed text-slate-600 dark:text-[#c8d4e0]">
                            <BriefingInline text={item} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Official sources */}
                  {sourceCards.length > 0 && (
                    <div className="border-t border-slate-200/80 dark:border-[var(--border)] pt-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Globe2 className="h-3 w-3" />
                          </span>
                          <div>
                            <p className="font-work-sans text-[7.5px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-[var(--muted)] leading-none">Evidence</p>
                            <h3 className="font-work-sans text-[11px] font-extrabold text-slate-900 dark:text-white leading-tight">Official sources</h3>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--muted)] tabular-nums">
                          {sourceCards.length} {sourceCards.length === 1 ? "source" : "sources"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {visibleSources.map((card, i) => (
                          <SourceChip key={`src-${card.url ?? "nourl"}-${i}`} card={card} />
                        ))}
                      </div>
                      {sourceCards.length > 4 && (
                        <button type="button" onClick={() => setSourcesExpanded(v => !v)}
                          className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline">
                          {sourcesExpanded
                            ? <><ChevronDown className="h-3 w-3 rotate-180" />Show fewer</>
                            : <><ChevronRight className="h-3 w-3" />Show {sourceCards.length - 4} more</>}
                        </button>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            )}

            {/* Snapshot loading */}
            {!loading && showSnapLoading && (
              <motion.div key="snap-load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" />
                <p className="text-[12px] font-medium text-[var(--muted)]">Loading records…</p>
              </motion.div>
            )}

            {/* Snapshot error */}
            {!loading && showSnapError && (
              <motion.div key="snap-err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-6 py-8 text-center" role="alert">
                <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-[12px] font-semibold text-slate-700 dark:text-[var(--foreground)]">Could not load records</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{snapshotError}</p>
              </motion.div>
            )}

            {/* Empty */}
            {!loading && !showBody && !showSnapLoading && !showSnapError && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)]/10 mb-4">
                  <Search className="h-5 w-5 text-[var(--accent)]/50" strokeWidth={1.5} />
                </span>
                <p className="text-[13.5px] font-semibold text-[var(--foreground)] mb-1">
                  Search to generate a briefing
                </p>
                <p className="max-w-[260px] text-[11.5px] text-[var(--muted)] leading-relaxed">
                  Type a question or topic above — e.g. "rent stabilization in Brooklyn" or "school funding cuts".
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </MotionReveal>
    </section>
  );
}