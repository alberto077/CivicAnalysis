"use client";

import {
  Building2,
  CalendarClock,
  FileText,
  Globe2,
  Lightbulb,
  ListChecks,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import type { PolicyResponse } from "@/lib/api";

const placeholderSections = [
  {
    title: "Tracking Status",
    body: "Hearing Scheduled",
    Icon: CalendarClock,
  },
  {
    title: "Key Zone",
    body: "District 26 (Astoria)",
    Icon: Building2,
  },
  {
    title: "Vocal Stakeholders",
    body: "CB3, DOT, Tenant Adv.",
    Icon: Users,
  },
  {
    title: "Impact Focus",
    body: "Infrastructure, Housing",
    Icon: FileText,
  },
] as const;

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
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {error ? (
        <div
          className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-[0_4px_20px_-8px_rgba(180,40,40,0.12)] backdrop-blur-sm"
          role="alert"
        >
          <span className="font-semibold">Policy data unavailable. </span>
          <span className="font-normal">{error}</span>
          {process.env.NODE_ENV === "development" ? (
            <p className="mt-2 text-xs font-normal text-red-800/90">
              Tip: start FastAPI{" "}
              <code className="rounded bg-red-100 px-1">python -m uvicorn main:app --reload</code>{" "}
              in <code className="rounded bg-red-100 px-1">backend/</code> (port 8000). Set{" "}
              <code className="rounded bg-red-100 px-1">API_INTERNAL_BASE_URL</code> (or{" "}
              <code className="rounded bg-red-100 px-1">NEXT_PUBLIC_API_BASE_URL</code>) in{" "}
              <code className="rounded bg-red-100 px-1">frontend/.env.local</code> for the proxy.
            </p>
          ) : null}
        </div>
      ) : null}

      <MotionReveal>
        <h2 className="font-display text-2xl font-semibold tracking-[1.5px] text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
          {showBriefing ? "Policy Briefing" : "Policy briefing panel"}
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          {showBriefing ? (
            <>
              Based on your question:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {briefingQuery}
              </span>
            </>
          ) : (
            <>Main feature panel—your briefing appears here after you ask a question.</>
          )}
        </p>
      </MotionReveal>

      <MotionReveal className="mt-10">
        <div className="glass-card-strong lift-card rounded-3xl p-6 sm:p-10 md:rounded-[1.75rem]">
          {loading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="font-display text-lg font-semibold text-[var(--foreground)]">
                Generating your policy briefing...
              </p>
              <p className="max-w-md text-sm text-[var(--muted)]">
                Gathering relevant policy context and local insights.
              </p>
            </div>
          ) : showBriefing ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-6">
                <span className="rounded-full bg-[linear-gradient(135deg,rgba(91,127,163,0.18)_0%,rgba(167,139,250,0.12)_100%)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] ring-1 ring-white/50">
                  Briefing ready
                </span>
              </div>

              <div className="mt-8 border-b border-[var(--border)] pb-10">
                <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
                  At a glance
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)] sm:text-[15px]">
                  {safe.at_a_glance.map((item, index) => (
                    <li key={`glance-${index}`} className="flex gap-2 leading-relaxed">
                      <span className="mt-1 text-[var(--accent)]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {safe.sources.length > 0 ? (
                <div className="mt-10 border-b border-[var(--border)] pb-10">
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold text-[var(--foreground)]">
                    <Globe2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    Sources
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
                    {safe.sources.map((source, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-[var(--accent)]/25 pl-3"
                      >
                        <p className="font-semibold text-[var(--foreground)]">{source.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                          {source.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <motion.div
                className="mt-10 grid gap-10 sm:gap-12"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                variants={staggerContainer}
              >
                {structuredSections.map((s, i) => (
                    <motion.div key={s.title} variants={staggerItem}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-[var(--accent)] shadow-[0_2px_12px_-4px_rgba(91,127,163,0.2)] ring-1 ring-white/80">
                          <s.Icon
                            className="h-[1.125rem] w-[1.125rem]"
                            strokeWidth={1.65}
                            aria-hidden
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-lg font-semibold text-[var(--foreground)]">
                            {s.title}
                          </h3>
                          <ul className="mt-3 max-w-3xl space-y-2 text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
                            {s.items.map((item, itemIndex) => (
                              <li key={`${s.key}-${itemIndex}`} className="flex gap-2">
                                <span className="text-[var(--accent)]">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      {i < structuredSections.length - 1 ? (
                        <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                      ) : null}
                    </motion.div>
                ))}
              </motion.div>
            </>
          ) : (
            <motion.div
              className="mt-0 grid gap-6"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
            >
              <div className="flex flex-wrap items-center justify-between border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[11px] font-bold text-white uppercase tracking-widest shadow-sm">
                    Sample Dashboard
                  </span>
                  <span className="text-sm font-semibold text-[var(--muted)]">
                    Local Zone · 2026-04-01
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {placeholderSections.map((s, i) => (
                  <motion.div key={s.title} variants={staggerItem} className="p-5 rounded-2xl border border-[var(--border)] bg-gray-50/50 flex flex-col justify-center transition hover:bg-white hover:shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                       <s.Icon className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.75} />
                       <h3 className="font-condensed text-[13px] font-bold tracking-widest text-[var(--muted)] uppercase">
                         {s.title}
                       </h3>
                    </div>
                    <p className="font-sans text-lg font-semibold text-[var(--foreground)] leading-tight pl-8">
                      {s.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </MotionReveal>
    </section>
  );
}
