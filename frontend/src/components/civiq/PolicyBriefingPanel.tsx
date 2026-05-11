"use client";
import Image from "next/image";
import { useTheme } from "next-themes";

import {
  FileText,
  Globe2,
  Lightbulb,
  ListChecks,
  Users,
  Share2,
  Download
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { MotionReveal } from "./MotionReveal";
import type { PolicyResponse } from "@/lib/api";

type PolicyBriefingPanelProps = {
  loading: boolean;
  error: string | null;
  response: PolicyResponse | null;
  briefingQuery: string;
};

export function PolicyBriefingPanel({
  loading,
  error,
  response,
  briefingQuery,
}: PolicyBriefingPanelProps) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const showBriefing = Boolean(response && !loading);
  const safe = {
    at_a_glance: response?.at_a_glance ?? [],
    key_takeaways: response?.key_takeaways ?? [],
    what_this_means: response?.what_this_means ?? [],
    relevant_actions: response?.relevant_actions ?? [],
    sources: response?.sources ?? [],
  };

  const structuredSections = [
    {
      key: "key_takeaways",
      title: "Key takeaways",
      items: safe.key_takeaways,
      Icon: Lightbulb,
    },
    {
      key: "what_this_means",
      title: "What this means for you",
      items: safe.what_this_means,
      Icon: Users,
    },
    {
      key: "relevant_actions",
      title: "Relevant actions",
      items: safe.relevant_actions,
      Icon: ListChecks,
    },
  ] as const;

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

      <MotionReveal className="flex items-center justify-between">
        <div>
          <h2 className="font-limelight text-4xl font-medium tracking-tight text-[rgba(20,31,45,0.92)] dark:text-[var(--foreground)]">
            {showBriefing ? "Live Policy Briefing" : "Neighborhood Intel"}
          </h2>
          {showBriefing && (
            <p className="mt-3 max-w-2xl text-[15px] text-slate-500 dark:text-[var(--foreground-secondary)]">
              Personalized analysis for:{" "}
              <span className="font-bold text-slate-900 dark:text-[var(--foreground)]">&quot;{briefingQuery}&quot;</span>
            </p>
          )}
        </div>

        {showBriefing && (
          <div className="flex gap-2">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-secondary)] shadow-sm transition hover:bg-[var(--surface-card)] dark:hover:text-[var(--foreground)]">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="font-work-sans flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slate-800 dark:bg-[var(--accent-mid)]/90 dark:hover:bg-[var(--accent-mid)]">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        )}
      </MotionReveal>

      <MotionReveal className="mt-10">
        <div className="lift-card feature-border-glow feature-border-glow-briefing overflow-hidden rounded-[3rem] border border-slate-200/90 bg-white p-8 shadow-xl transition-[border-color,box-shadow] duration-300 sm:p-12 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)]">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-[520px] flex-col items-center justify-center gap-6 py-12 text-center sm:min-h-[560px]"
              >
                {isDarkMode ? (
                  <div className="flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
                    <div
                      className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent)]/30 border-t-[var(--accent)] shadow-[0_0_24px_rgba(110,185,255,0.35)]"
                      aria-hidden
                    />
                  </div>
                ) : (
                  <div className="relative h-80 w-80 max-w-[min(92vw,20rem)] overflow-hidden rounded-2xl sm:h-96 sm:w-96 sm:max-w-[min(92vw,24rem)] lg:h-[28rem] lg:w-[28rem] lg:max-w-[min(92vw,28rem)]">
                    <Image
                      src="/maggla.gif"
                      alt="Loading briefing animation"
                      fill
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 384px, 448px"
                      className="object-contain"
                      priority
                      unoptimized
                    />
                  </div>
                )}
                <div>
                  <p className="font-limelight text-2xl font-medium text-[rgba(20,31,45,0.92)] dark:text-[var(--foreground)]">
                    Generating Intelligent Briefing...
                  </p>
                  <p className="mt-2 text-slate-500 dark:text-[var(--foreground-secondary)]">
                    Scanning city records and cross-referencing neighborhood impacts.
                  </p>
                </div>
              </motion.div>
            ) : showBriefing ? (
              <motion.div
                key="briefing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-12"
              >
                <div className="border-b border-slate-200 pb-10 dark:border-[var(--border)]">
                  <div className="mb-6 flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg dark:bg-[var(--accent)]/40 dark:text-[var(--foreground)]">
                      <FileText className="h-5 w-5" />
                    </span>
                    <h3 className="font-limelight text-xl font-medium text-[rgba(20,31,45,0.92)] dark:text-[var(--foreground)]">
                      Policy Synthesis
                    </h3>
                  </div>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {safe.at_a_glance.map((item, index) => (
                      <li
                        key={`glance-${index}`}
                        className="flex gap-3 rounded-2xl border border-white bg-white/50 p-4 shadow-sm transition hover:shadow-md dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/80"
                      >
                        <span className="shrink-0 font-bold text-[var(--accent)]">•</span>
                        <span className="text-[15px] leading-relaxed text-slate-800 dark:text-[var(--foreground)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {structuredSections.map((s) => (
                    <div key={s.title} className="flex flex-col">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)]">
                          <s.Icon className="h-[1.125rem] w-[1.125rem]" />
                        </span>
                        <h3 className="font-limelight text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-[var(--muted)]">
                          {s.title}
                        </h3>
                      </div>
                      <ul className="space-y-4">
                        {s.items.map((item, itemIndex) => (
                          <li key={`${s.key}-${itemIndex}`} className="flex gap-3 text-[14px] leading-relaxed text-slate-700 dark:text-[var(--foreground-secondary)]">
                            <span className="text-[var(--accent)] font-bold">»</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {safe.sources.length > 0 && (
                  <div className="border-t border-slate-200 pt-10 dark:border-[var(--border)]">
                    <div className="mb-6 flex items-center gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent)]">
                        <Globe2 className="h-5 w-5" />
                      </span>
                      <h3 className="font-limelight text-[15px] font-bold uppercase tracking-widest text-slate-400 dark:text-[var(--muted)]">
                        Evidence & Sources
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {safe.sources.map((source, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-slate-100 bg-white/50 p-4 transition hover:border-indigo-200 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/70 dark:hover:border-[var(--accent)]/30"
                        >
                          <p className="text-sm font-bold text-slate-900 dark:text-[var(--foreground)]">{source.title}</p>
                          <p className="mt-1 text-[13px] italic leading-relaxed text-slate-500 dark:text-[var(--foreground-secondary)]">
                            {source.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mx-auto min-h-[240px] w-full max-w-[1200px] py-12"
                aria-hidden
              />
            )}
          </AnimatePresence>
        </div>
      </MotionReveal>
    </section>
  );
}
