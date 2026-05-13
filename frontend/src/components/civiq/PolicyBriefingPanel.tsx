"use client";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import {
  ArrowRight,
  ChevronDown,
  Download,
  ExternalLink,
  Globe2,
  Hash,
  Lightbulb,
  Newspaper,
  Share2,
  Sparkles,
  Users,
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

type PolicyBriefingPanelProps = {
  loading: boolean;
  error: string | null;
  response: PolicyResponse | null;
  briefingQuery: string;
  snapshotLoading?: boolean;
  snapshotError?: string | null;
  generalizedBriefing?: PolicyResponse | null;
  filterSummary?: string;
};

/** Remove a stray leading colon (model often emits `**…** : context`). */
function trimCaptionLead(s: string): string {
  return s.replace(/^[:：]\s*/, "").trim();
}

/** Strip wrapping `( … )` from KPI captions (model often adds parenthetical gloss). */
function stripOuterParentheses(s: string): string {
  let t = s.trim();
  while (t.length >= 2 && t.startsWith("(") && t.endsWith(")")) {
    const inner = t.slice(1, -1).trim();
    if (!inner) break;
    t = inner;
  }
  return t;
}

function normalizeKeyNumberCaption(raw: string): string | null {
  const cap = stripOuterParentheses(trimCaptionLead(raw.trim()));
  return cap || null;
}

/** Split model lines like `**$2.4M** late fee cap` into KPI headline + caption. */
function parseKeyNumberParts(text: string): { headline: string; caption: string | null } {
  const t = text.trim();
  const boldLead = t.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
  if (boldLead) {
    const cap = normalizeKeyNumberCaption(boldLead[2]);
    return {
      headline: boldLead[1].trim(),
      caption: cap,
    };
  }
  // Leading figure then delimiter (em dash, colon, hyphen, en dash)
  const statLead = t.match(
    /^((?:\$|€|£)?[\d,.]+(?:%|[KMB])?|\d+\s*[-–/]\s*\d+)\s*[—:–\-]\s+(.+)$/i,
  );
  if (statLead && statLead[1].length <= 28) {
    const cap = normalizeKeyNumberCaption(statLead[2]);
    return { headline: statLead[1].trim(), caption: cap };
  }
  return { headline: t, caption: null };
}

function KeyNumberKpiCard({ text, compact = false }: { text: string; compact?: boolean }) {
  const { headline, caption } = parseKeyNumberParts(text);
  const headlineHasMarkup = /\*\*/.test(headline);
  const useHeroStat =
    Boolean(caption) || (headline.length <= 40 && !headlineHasMarkup);

  return (
    <div
      className={`relative min-w-0 w-full overflow-hidden border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/95 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_12px_32px_-20px_rgba(15,23,42,0.12)] dark:border-[var(--border)] dark:from-[var(--surface-elevated)] dark:to-[var(--surface-card)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_-24px_rgba(0,0,0,0.45)] ${
        compact ? "max-w-[11.5rem] rounded-xl p-3.5" : "rounded-2xl p-5"
      }`}
    >
      <div
        className={`pointer-events-none absolute left-0 w-1 rounded-full bg-[var(--accent)]/55 dark:bg-[var(--accent)]/40 ${
          compact ? "inset-y-2" : "inset-y-3"
        }`}
        aria-hidden
      />
      <div className={compact ? "min-w-0 pl-3" : "min-w-0 pl-4"}>
        {useHeroStat ? (
          <>
            <div className={compact ? "min-h-[2rem] min-w-0" : "min-h-[2.5rem] min-w-0"}>
              {headlineHasMarkup ? (
                <p
                  className={`min-w-0 break-words font-work-sans font-bold leading-tight tracking-tight text-slate-900 dark:text-[var(--foreground)] ${
                    compact ? "text-[1.05rem] sm:text-[1.12rem]" : "text-[1.35rem] sm:text-[1.5rem]"
                  }`}
                >
                  <BriefingInline text={headline} />
                </p>
              ) : (
                <p
                  className={`min-w-0 break-words font-work-sans font-bold leading-none tracking-tight text-slate-900 tabular-nums dark:text-[var(--foreground)] ${
                    compact ? "text-[1.12rem] sm:text-[1.2rem]" : "text-[1.45rem] sm:text-[1.6rem]"
                  }`}
                >
                  {headline}
                </p>
              )}
            </div>
            {caption ? (
              <p
                className={`min-w-0 break-words font-medium leading-snug text-slate-600 dark:text-[#b8c8dc] ${
                  compact ? "mt-1.5 line-clamp-2 text-[10.5px]" : "mt-3 text-[13px]"
                }`}
              >
                <BriefingInline text={caption} />
              </p>
            ) : null}
          </>
        ) : (
          <p
            className={`font-semibold leading-snug text-slate-800 dark:text-[#e8f0fa] ${
              compact ? "line-clamp-3 text-[11px]" : "text-[15px]"
            }`}
          >
            <BriefingInline text={text.trim()} />
          </p>
        )}
      </div>
    </div>
  );
}

const SOURCES_VISIBLE_INITIAL = 3;

function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function SourceEvidenceCard({ card }: { card: BriefingSourceCard }) {
  const host = card.url ? sourceHostname(card.url) : "";

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm transition hover:border-indigo-200/80 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/75 dark:hover:border-[var(--accent)]/35 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-[var(--foreground)]">
          {card.title}
        </p>
        {card.source_type ? (
          <span className="shrink-0 rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[#b8c8dc]">
            {card.source_type}
          </span>
        ) : null}
      </div>
      {card.published_date ? (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-[var(--foreground-secondary)]">
          Record date: {card.published_date}
        </p>
      ) : null}
      <p className="mt-2 min-w-0 flex-1 text-[13px] leading-relaxed text-slate-600 dark:text-[#dce8f4]">
        <BriefingInline text={card.description} />
      </p>
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-[var(--border)]">
        {card.url ? (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full flex-wrap items-center gap-2 break-all text-sm font-semibold text-indigo-700 hover:underline dark:text-[var(--accent-soft)]"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            <span>Open official record</span>
            {host ? (
              <span className="font-normal text-slate-500 dark:text-[var(--muted)]">({host})</span>
            ) : null}
          </a>
        ) : (
          <p className="text-[12px] leading-snug text-slate-400 dark:text-[var(--foreground-secondary)]">
            No indexed URL matched this citation. Confirm on the agency&apos;s official site.
          </p>
        )}
      </div>
    </div>
  );
}

function FeedSection({
  eyebrow,
  title,
  items,
  icon: Icon,
  variant = "bullets",
}: {
  eyebrow: string;
  title: string;
  items: string[];
  icon: typeof Newspaper;
  variant?: "bullets" | "stats";
}) {
  if (!items.length) return null;

  return (
    <section className="scroll-mt-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-slate-800 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)]">
          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
        </span>
        <div>
          <p className="font-work-sans text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-[var(--foreground-secondary)]">
            {eyebrow}
          </p>
          <h3 className="font-work-sans text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>
      </div>
      {variant === "stats" ? (
        <div
          className="grid min-w-0 gap-4 sm:gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
          }}
        >
          {items.map((item, i) => (
            <KeyNumberKpiCard key={`stat-${i}`} text={item} />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item, i) => (
            <li
              key={`b-${i}`}
              className="flex gap-3 rounded-2xl border border-slate-100/90 bg-white/60 px-4 py-3.5 text-[15px] leading-[1.58] text-slate-800 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/55 dark:text-[#d8e6f2]"
            >
              <span className="mt-0.5 shrink-0 font-bold text-[var(--accent)]">•</span>
              <span>
                <BriefingInline text={item} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PolicyBriefingPanel({
  loading,
  error,
  response,
  briefingQuery,
  snapshotLoading = false,
  snapshotError = null,
  generalizedBriefing = null,
  filterSummary = "",
}: PolicyBriefingPanelProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const showLive = Boolean(response && !loading);
  const showGeneralized =
    !showLive &&
    generalizedBriefing !== null &&
    hasPolicyBriefingContent(generalizedBriefing) &&
    !snapshotLoading &&
    !snapshotError;
  const showSnapshotLoading = !showLive && !loading && snapshotLoading;
  const showSnapshotError = !showLive && !loading && !snapshotLoading && Boolean(snapshotError);
  const showBriefingBody = showLive || showGeneralized;

  const safe = showLive
    ? response!
    : showGeneralized && generalizedBriefing
      ? generalizedBriefing
      : ({
          tldr: [],
          topic_tags: [],
          what_happened: [],
          why_it_matters: [],
          whos_affected: [],
          key_numbers: [],
          what_happens_next: [],
          read_more: [],
          at_a_glance: [],
          key_takeaways: [],
          what_this_means: [],
          relevant_actions: [],
          sources: [],
          retrieval_sources: [],
          sources_used: 0,
        } satisfies PolicyResponse);

  const sourceCards = useMemo(
    () => buildBriefingSourceCards(safe.sources, safe.retrieval_sources),
    [safe.sources, safe.retrieval_sources],
  );
  const displayKeyNumbers = useMemo(
    () => buildDisplayKeyNumbers(safe),
    [
      safe.key_numbers,
      safe.tldr,
      safe.what_happened,
      safe.why_it_matters,
      safe.whos_affected,
      safe.what_happens_next,
      safe.read_more,
    ],
  );
  const visibleSources = sourceCards.slice(0, SOURCES_VISIBLE_INITIAL);
  const extraSources = sourceCards.slice(SOURCES_VISIBLE_INITIAL);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {error ? (
        <div
          className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-[0_4px_20px_-8px_rgba(180,40,40,0.12)] backdrop-blur-sm dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-100"
          role="alert"
        >
          <span className="font-semibold">Policy data unavailable. </span>
          <span className="font-work-sans font-normal">{error}</span>
        </div>
      ) : null}

      <MotionReveal className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-work-sans text-4xl font-bold tracking-tight text-[rgba(20,31,45,0.92)] sm:text-5xl dark:text-[var(--foreground)]">
            {showLive ? "Live Policy Briefing" : "Neighborhood Intel"}
          </h2>
          {showLive && (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-[var(--foreground-secondary)]">
              Personalized analysis for:{" "}
              <span className="font-semibold text-slate-900 dark:text-[var(--foreground)]">
                &quot;{briefingQuery}&quot;
              </span>
            </p>
          )}
          {showGeneralized && filterSummary ? (
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500 dark:text-[var(--foreground-secondary)]">
              Recent records snapshot for{" "}
              <span className="font-semibold text-slate-900 dark:text-[var(--foreground)]">
                {filterSummary}
              </span>
            </p>
          ) : null}
        </div>

        {showLive && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-secondary)] shadow-sm transition hover:bg-[var(--surface-card)] dark:hover:text-[var(--foreground)]"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="font-work-sans flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 dark:bg-[var(--accent-mid)]/90 dark:hover:bg-[var(--accent-mid)]"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        )}
      </MotionReveal>

      <MotionReveal className="mt-10">
        <div className="lift-card feature-border-glow feature-border-glow-briefing overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-xl transition-[border-color,box-shadow] duration-300 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] sm:rounded-[2.5rem]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-[480px] flex-col items-center justify-center gap-6 px-6 py-12 text-center sm:min-h-[520px]"
              >
                {isDarkMode ? (
                  <div className="flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
                    <div
                      className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--accent)]/30 border-t-[var(--accent)] shadow-[0_0_24px_rgba(110,185,255,0.35)]"
                      aria-hidden
                    />
                  </div>
                ) : (
                  <div className="relative h-72 w-72 max-w-[min(92vw,18rem)] overflow-hidden rounded-2xl sm:h-80 sm:w-80 sm:max-w-[min(92vw,20rem)]">
                    <Image
                      src="/maggla.gif"
                      alt="Loading briefing animation"
                      fill
                      sizes="(max-width: 640px) 92vw, 320px"
                      className="object-contain"
                      priority
                      unoptimized
                    />
                  </div>
                )}
                <p className="font-work-sans text-2xl font-bold tracking-tight text-[rgba(20,31,45,0.92)] dark:text-[var(--foreground)]">
                  Generating briefing…
                </p>
              </motion.div>
            ) : showBriefingBody ? (
              <motion.div
                key={showLive ? "briefing-live" : "briefing-generalized"}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.38 }}
                className="px-5 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14"
              >
                <div className="mx-auto w-full max-w-3xl space-y-12 lg:max-w-4xl xl:max-w-5xl">
                  {showGeneralized ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-left shadow-sm dark:border-amber-900/45 dark:bg-amber-950/35"
                    >
                      <p className="font-work-sans text-sm font-bold text-amber-950 dark:text-amber-100">
                        Generalized snapshot
                      </p>
                      <p className="mt-1 font-work-sans text-[13px] leading-snug text-amber-900/90 dark:text-amber-50/90">
                        Built from your dashboard filters and recently indexed civic records—not from a specific
                        question yet. Use the search box above for a tailored briefing.
                      </p>
                    </div>
                  ) : null}
                  {safe.tldr.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-[var(--border)] dark:from-[var(--surface-elevated)] dark:to-[var(--surface-card)] sm:p-6">
                      <div className="flex gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] dark:bg-white/10 dark:text-white">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 space-y-2">
                          <p className="font-work-sans text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-[var(--foreground-secondary)]">
                            TL;DR
                          </p>
                          {safe.tldr.map((line, i) => (
                            <p
                              key={`tldr-${i}`}
                              className="text-[17px] font-medium leading-snug tracking-tight text-slate-900 dark:text-white"
                            >
                              <BriefingInline text={line} />
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {safe.topic_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {safe.topic_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200/90 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/80 dark:text-[#c8d8ea]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-14">
                    <FeedSection
                      eyebrow="Story"
                      title="What happened"
                      items={safe.what_happened}
                      icon={Newspaper}
                    />
                    <FeedSection
                      eyebrow="Impact"
                      title="Why it matters"
                      items={safe.why_it_matters}
                      icon={Lightbulb}
                    />
                    <FeedSection
                      eyebrow="People & place"
                      title="Who's affected"
                      items={safe.whos_affected}
                      icon={Users}
                    />
                    <FeedSection
                      eyebrow="Forward view"
                      title="What happens next"
                      items={safe.what_happens_next}
                      icon={ArrowRight}
                    />
                  </div>

                  {safe.read_more.length > 0 && (
                    <details className="group rounded-2xl border border-slate-200/90 bg-slate-50/50 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-work-sans text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100/60 dark:text-[var(--foreground)] dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                        <span>Read more</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-[var(--foreground-secondary)]" />
                      </summary>
                      <ul className="space-y-2 border-t border-slate-200/80 px-5 pb-5 pt-3 dark:border-[var(--border)]">
                        {safe.read_more.map((item, i) => (
                          <li
                            key={`more-${i}`}
                            className="text-[14px] leading-relaxed text-slate-700 dark:text-[#c8d4e0]"
                          >
                            <BriefingInline text={item} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {displayKeyNumbers.length > 0 ? (
                    <section
                      className="mt-12 border-t border-slate-200 pt-10 dark:border-[var(--border)]"
                      aria-labelledby="briefing-key-numbers-heading"
                    >
                      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-slate-800 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)]">
                            <Hash className="h-5 w-5" strokeWidth={2} aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="font-work-sans text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-[var(--foreground-secondary)]">
                              By the numbers
                            </p>
                            <h3
                              id="briefing-key-numbers-heading"
                              className="font-work-sans text-lg font-bold tracking-tight text-slate-900 dark:text-white"
                            >
                              Key figures
                            </h3>
                          </div>
                        </div>
                      </div>
                      <div
                        className="grid min-w-0 justify-items-start gap-3 sm:gap-4"
                        style={{
                          gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))",
                        }}
                      >
                        {displayKeyNumbers.map((item, i) => (
                          <KeyNumberKpiCard key={`stat-above-src-${i}`} compact text={item} />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {sourceCards.length > 0 && (
                    <div
                      className={
                        displayKeyNumbers.length > 0
                          ? "mt-10 border-t border-slate-200 pt-10 dark:border-[var(--border)]"
                          : "border-t border-slate-200 pt-12 dark:border-[var(--border)]"
                      }
                    >
                      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent)]">
                            <Globe2 className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-work-sans text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                              Official sources
                            </h3>
                            <p className="mt-1 max-w-xl text-[12px] leading-snug text-slate-500 dark:text-[var(--foreground-secondary)]">
                              Each card ties the briefing to an indexed document where possible. Links open the
                              official record in a new tab.
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-work-sans text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[var(--muted)]">
                            {sourceCards.length} {sourceCards.length === 1 ? "source" : "sources"} found
                          </p>
                        </div>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 [-webkit-tap-highlight-color:transparent] [&_p::selection]:bg-indigo-100 [&_p::selection]:text-slate-900 dark:[&_p::selection]:bg-white/20 dark:[&_p::selection]:text-[var(--foreground)]">
                        {visibleSources.map((card, i) => (
                          <SourceEvidenceCard
                            key={`src-v-${card.url ?? "nourl"}-${card.title}-${i}`}
                            card={card}
                          />
                        ))}
                      </div>
                      {extraSources.length > 0 ? (
                        <details className="group mt-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/30">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-work-sans text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100/70 dark:text-[var(--foreground)] dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">
                            <span>
                              Show {extraSources.length} more{" "}
                              {extraSources.length === 1 ? "source" : "sources"}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180 dark:text-[var(--foreground-secondary)]" />
                          </summary>
                          <div className="grid min-w-0 grid-cols-1 gap-3 border-t border-slate-200/80 p-4 pt-4 md:grid-cols-2 dark:border-[var(--border)]">
                            {extraSources.map((card, i) => (
                              <SourceEvidenceCard
                                key={`src-x-${card.url ?? "nourl"}-${card.title}-${i}`}
                                card={card}
                              />
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : showSnapshotLoading ? (
              <motion.div
                key="snapshot-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-14 text-center"
              >
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]"
                  aria-hidden
                />
                <p className="font-work-sans text-sm font-semibold text-slate-600 dark:text-[var(--foreground-secondary)]">
                  Loading recent records for your filters…
                </p>
              </motion.div>
            ) : showSnapshotError ? (
              <motion.div
                key="snapshot-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 py-14 sm:px-10"
                role="alert"
              >
                <p className="font-work-sans text-sm font-semibold text-slate-900 dark:text-[var(--foreground)]">
                  Could not load the snapshot feed
                </p>
                <p className="mt-2 font-work-sans text-[13px] leading-relaxed text-slate-600 dark:text-[var(--foreground-secondary)]">
                  {snapshotError}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mx-auto flex min-h-[260px] w-full max-w-2xl flex-col items-center justify-center px-6 py-14 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50 text-slate-700 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)]">
                  <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>
                <p className="mt-5 font-work-sans text-lg font-semibold text-slate-900 dark:text-[var(--foreground)]">
                  No indexed records match these filters yet
                </p>
                <p className="mt-2 max-w-md font-work-sans text-sm leading-relaxed text-slate-600 dark:text-[var(--foreground-secondary)]">
                  Try a wider timeframe or all policy areas, or type a question in the search box to generate a
                  tailored briefing from the library.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionReveal>
    </section>
  );
}
