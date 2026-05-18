"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import {
  ExternalLink, Globe2, Sparkles, ChevronDown,
  ChevronRight, ArrowRight, Lightbulb, Users,
  Newspaper, Hash, Share2, Download, X,
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

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ headline, caption }: { headline: string; caption?: string }) {
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-3 shadow-sm dark:border-[var(--border)] dark:from-[var(--surface-elevated)] dark:to-[var(--surface-card)]">
      <div className="pointer-events-none absolute left-0 inset-y-2.5 w-[3px] rounded-full bg-[var(--accent)]/50" aria-hidden />
      <div className="pl-2">
        <p className="font-work-sans text-[1.125rem] font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums dark:text-[var(--foreground)]">
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

// ─── inline bullet ────────────────────────────────────────────────────────────
function Bullet({ text, accent = "var(--accent)" }: { text: string; accent?: string }) {
  return (
    <li className="flex gap-2.5 rounded-xl border border-slate-100/80 bg-white/50 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/40 dark:text-[#d8e6f2]">
      <span className="mt-0.5 shrink-0 text-[10px] font-black" style={{ color: accent }}>▸</span>
      <span><BriefingInline text={text} /></span>
    </li>
  );
}

// ─── source card ─────────────────────────────────────────────────────────────
function SourceCard({ card }: { card: BriefingSourceCard }) {
  const host = card.url ? sourceHostname(card.url) : "";
  const color = srcColor(card.source_type ?? "");
  return (
    <div className="group flex min-h-0 flex-col rounded-xl border border-slate-100 bg-white/70 p-3 transition hover:shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/60">
      <div className="flex items-start gap-2 justify-between mb-1">
        <p className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-slate-900 dark:text-[var(--foreground)] line-clamp-2">
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
      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-[#c8d8ea] line-clamp-2 flex-1 mb-2">
        <BriefingInline text={card.description} />
      </p>
      {card.url ? (
        <a href={card.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] font-bold hover:underline"
          style={{ color }}>
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
  const showGeneralized = !showLive && generalizedBriefing !== null && hasPolicyBriefingContent(generalizedBriefing) && !snapshotLoading && !snapshotError;
  const showSnapLoading = !showLive && !loading && snapshotLoading;
  const showSnapError = !showLive && !loading && !snapshotLoading && Boolean(snapshotError);
  const showBody = showLive || showGeneralized;

  const EMPTY: PolicyResponse = { tldr: [], topic_tags: [], what_happened: [], why_it_matters: [], whos_affected: [], key_numbers: [], what_happens_next: [], read_more: [], at_a_glance: [], key_takeaways: [], what_this_means: [], relevant_actions: [], sources: [], retrieval_sources: [], sources_used: 0 };
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
          <span><span className="font-semibold">Policy data unavailable. </span>{error}</span>
        </div>
      )}

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <MotionReveal>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0">

          </div>
          {showLive && (
            <div className="flex shrink-0 gap-1.5">
              <button type="button" aria-label="Share Briefing" className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] shadow-sm transition hover:bg-[var(--surface-card)]">
                <Share2 className="h-3 w-3" />
              </button>
              <button type="button" className="font-work-sans flex h-7 items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[10px] font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-[var(--accent-mid)]/90">
                <Download className="h-3 w-3" /><span>Export</span>
              </button>
            </div>
          )}
        </div>
      </MotionReveal>

      {/* ── Main card ───────────────────────────────────────────────────────── */}
      <MotionReveal>
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/90 bg-white shadow-md dark:border-[var(--border)] dark:bg-[var(--surface-card)]">
          <AnimatePresence mode="wait">

            {/* Loading */}
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex min-h-[380px] flex-col items-center justify-center gap-4 px-4 py-10 text-center">
                {isDark ? (
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--accent)]/30 border-t-[var(--accent)]" aria-hidden />
                ) : (
                  <div className="relative h-48 w-48 max-w-[min(92vw,12rem)] overflow-hidden rounded-2xl">
                    <Image src="/maggla.gif" alt="" fill sizes="192px" className="object-contain" priority unoptimized />
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
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7"
              >
                <div className="mx-auto max-w-4xl space-y-6">

                  {/* Generalized notice */}
                  {showGeneralized && (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/30">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200">Snapshot view</p>
                      <p className="text-[10.5px] leading-snug text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                        Showing recent indexed records for your current filters. Click a district on the map above or type a question to generate a targeted briefing.
                      </p>
                    </div>
                  )}

                  {/* TL;DR */}
                  {tldr.length > 0 && (
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/40">
                      <div className="flex gap-2.5">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/10">
                          <Sparkles className="h-3 w-3 text-[var(--accent)]" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0">
                          <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.26em] text-[var(--muted)] mb-1">TL;DR</p>
                          {tldr.map((line, i) => (
                            <p key={i} className="text-[13.5px] font-bold leading-normal text-slate-900 dark:text-white mb-0.5 last:mb-0">
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
                        <span key={tag} className="rounded border border-slate-200/80 bg-white/80 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-slate-500 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/70 dark:text-[#c8d8ea]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* KPI strip */}
                  {kpiItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-[var(--muted)] flex items-center gap-1.5">
                        <Hash className="h-2.5 w-2.5" />Key figures
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {kpiItems.map((item, i) => {
                          const { headline, caption } = parseKpi(item);
                          return <KpiCard key={i} headline={headline} caption={caption} />;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Story & Impact side-by-side grid */}
                  {(safe.what_happened.length > 0 || safe.why_it_matters.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {safe.what_happened.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              <Newspaper className="h-3 w-3" strokeWidth={2} />
                            </span>
                            <div>
                              <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-[var(--muted)] leading-none">Story</p>
                              <h3 className="font-work-sans text-xs font-extrabold text-slate-900 dark:text-white leading-tight">What happened</h3>
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {safe.what_happened.map((item, i) => <Bullet key={i} text={item} accent="#3b82f6" />)}
                          </ul>
                        </div>
                      )}

                      {safe.why_it_matters.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <Lightbulb className="h-3 w-3" strokeWidth={2} />
                            </span>
                            <div>
                              <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-[var(--muted)] leading-none">Impact</p>
                              <h3 className="font-work-sans text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Why it matters</h3>
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {safe.why_it_matters.map((item, i) => <Bullet key={i} text={item} accent="#f59e0b" />)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* People & Forward side-by-side grid */}
                  {(safe.whos_affected.length > 0 || safe.what_happens_next.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                      {safe.whos_affected.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Users className="h-3 w-3" strokeWidth={2} />
                            </span>
                            <div>
                              <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-[var(--muted)] leading-none">People</p>
                              <h3 className="font-work-sans text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Who&apos;s affected</h3>
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {safe.whos_affected.map((item, i) => <Bullet key={i} text={item} accent="#10b981" />)}
                          </ul>
                        </div>
                      )}

                      {safe.what_happens_next.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                              <ArrowRight className="h-3 w-3" strokeWidth={2} />
                            </span>
                            <div>
                              <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-[var(--muted)] leading-none">Forward</p>
                              <h3 className="font-work-sans text-xs font-extrabold text-slate-900 dark:text-white leading-tight">What happens next</h3>
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {safe.what_happens_next.map((item, i) => <Bullet key={i} text={item} accent="#8b5cf6" />)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Read more */}
                  {safe.read_more.length > 0 && (
                    <details className="group rounded-xl border border-slate-200/80 bg-slate-50/50 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/30">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[11.5px] font-bold text-slate-700 outline-none hover:bg-slate-100/50 dark:text-[var(--foreground)] dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                        <span>Read more details</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-open:rotate-180 dark:text-[var(--icon-cyan)]" />
                      </summary>
                      <ul className="space-y-1 border-t border-slate-200/70 px-3 pb-3 pt-2 dark:border-[var(--border)]">
                        {safe.read_more.map((item, i) => (
                          <li key={i} className="text-[11.5px] leading-relaxed text-slate-600 dark:text-[#c8d4e0]">
                            <BriefingInline text={item} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Official sources */}
                  {sourceCards.length > 0 && (
                    <div className="border-t border-slate-200/80 pt-5 dark:border-[var(--border)]">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Globe2 className="h-3 w-3" />
                          </span>
                          <div>
                            <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-[var(--muted)] leading-none">Evidence</p>
                            <h3 className="font-work-sans text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Official sources</h3>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--muted)] tabular-nums">
                          {sourceCards.length} {sourceCards.length === 1 ? "source" : "sources"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {visibleSources.map((card, i) => (
                          <SourceCard key={`src-${card.url ?? "nourl"}-${i}`} card={card} />
                        ))}
                      </div>
                      {sourceCards.length > 4 && (
                        <button
                          type="button"
                          onClick={() => setSourcesExpanded((v) => !v)}
                          className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline"
                        >
                          {sourcesExpanded ? (
                            <><ChevronDown className="h-3 w-3 rotate-180" />Show fewer</>
                          ) : (
                            <><ChevronRight className="h-3 w-3" />Show {sourceCards.length - 4} more sources</>
                          )}
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
                className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]" aria-hidden />
                <p className="text-[13px] font-medium text-[var(--muted)]">Loading records for your filters…</p>
              </motion.div>
            )}

            {/* Snapshot error */}
            {!loading && showSnapError && (
              <motion.div key="snap-err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-6 py-10 text-center" role="alert">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-[var(--foreground)]">Snapshot unavailable</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">{snapshotError}</p>
              </motion.div>
            )}

            {/* Empty */}
            {!loading && !showBody && !showSnapLoading && !showSnapError && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)]/10 mb-4">
                  <Sparkles className="h-5 w-5 text-[var(--accent)]/50" strokeWidth={1.5} />
                </span>
                <p className="text-[14px] font-semibold text-[var(--foreground)] mb-1">
                  No records match yet
                </p>
                <p className="max-w-sm text-[12px] text-[var(--muted)] leading-relaxed">
                  Click any district on the map above to instantly generate an AI briefing, or type a question in the search bar.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </MotionReveal>
    </section>
  );
}