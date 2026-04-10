"use client";

import {
  Building2,
  CalendarClock,
  FileText,
  Lightbulb,
  ListChecks,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import type { ChatResponse } from "@/lib/api";

const placeholderSections = [
  {
    title: "Policy Summary",
    body: "A proposed rezoning along the corridor would allow mid-rise housing where only light industrial uses exist today. The city is weighing affordable set-asides and infrastructure upgrades before a formal vote.",
    Icon: FileText,
  },
  {
    title: "Key Stakeholders",
    body: "Community Board 3, NYC Department of City Planning, local business improvement district, and tenant advocates have each submitted testimony. Council District 34’s office is hosting an additional listening session next month.",
    Icon: Users,
  },
  {
    title: "Potential Local Impacts",
    body: "Nearby blocks could see increased construction activity, updated streetscape treatments, and revised loading rules. School capacity and transit crowding are flagged for follow-up analysis in the environmental assessment.",
    Icon: Building2,
  },
  {
    title: "Timeline",
    body: "Scoping comments due · Public hearing (placeholder date) · Draft scope release · Expected land use vote window: late year (placeholder).",
    Icon: CalendarClock,
  },
] as const;

type PolicyBriefingPanelProps = {
  loading: boolean;
  error: string | null;
  response: ChatResponse | null;
  briefingQuery: string;
};

export function PolicyBriefingPanel({
  loading,
  error,
  response,
  briefingQuery,
}: PolicyBriefingPanelProps) {
  const showBriefing = Boolean(response && !loading);

  const reply = response?.reply ?? "";
  const sourcesCount =
    response?.sources_used != null ? response.sources_used : undefined;

  const futureSections = [
    {
      title: "Key takeaways",
      body: reply,
      Icon: Lightbulb,
    },
    {
      title: "What this means for you",
      body: reply,
      Icon: Users,
    },
    {
      title: "Relevant actions",
      body: reply,
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
          {process.env.NODE_ENV === "development" ? (
            <>
              <span className="font-semibold">Request failed · </span>
              {error}
              <p className="mt-2 text-xs font-normal text-red-800/90">
                Tip: start FastAPI{" "}
                <code className="rounded bg-red-100 px-1">python -m uvicorn main:app --reload</code>{" "}
                in <code className="rounded bg-red-100 px-1">backend/</code> (port 8000). Optional{" "}
                <code className="rounded bg-red-100 px-1">frontend/.env.local</code>{" "}
                <code className="rounded bg-red-100 px-1">NEXT_PUBLIC_API_BASE_URL</code> tells the
                Next proxy where to forward; default is <code className="rounded bg-red-100 px-1">127.0.0.1:8000</code>.
                Then restart <code className="rounded bg-red-100 px-1">npm run dev</code>.
              </p>
            </>
          ) : (
            "Policy data unavailable. Please try again."
          )}
        </div>
      ) : null}

      <MotionReveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
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
                <div className="prose-policy mt-4 max-w-none text-[15px] leading-relaxed text-[var(--foreground)] sm:text-base">
                  {reply}
                </div>
              </div>

              {sourcesCount != null ? (
                <div className="mt-10 border-b border-[var(--border)] pb-10">
                  <h3 className="font-display text-base font-semibold text-[var(--foreground)]">
                    Sources
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    This briefing drew on{" "}
                    <span className="font-medium text-[var(--foreground)]">
                      {sourcesCount}
                    </span>{" "}
                    excerpt{sourcesCount === 1 ? "" : "s"} from indexed policy
                    documents.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                    {Array.from({ length: sourcesCount }, (_, i) => (
                      <li
                        key={i}
                        className="flex gap-2 border-l-2 border-[var(--accent)]/25 pl-3"
                      >
                        <span className="text-[var(--accent)]">
                          {i + 1}.
                        </span>
                        <span>
                          Policy document excerpt {i + 1} (corpus match)
                        </span>
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
                {futureSections.map((s, i) => (
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
                          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
                            {s.body}
                          </p>
                        </div>
                      </div>
                      {i < futureSections.length - 1 ? (
                        <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                      ) : null}
                    </motion.div>
                ))}
              </motion.div>
            </>
          ) : (
            <motion.div
              className="mt-0 grid gap-10 sm:gap-12"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              variants={staggerContainer}
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-6">
                <span className="rounded-full bg-[linear-gradient(135deg,rgba(91,127,163,0.18)_0%,rgba(167,139,250,0.12)_100%)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] ring-1 ring-white/50">
                  Sample briefing
                </span>
                <span className="text-sm text-[var(--muted)]">
                  Astoria · ZIP 11103 · 2026-04-01
                </span>
              </div>
              {placeholderSections.map((s, i) => (
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
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted)] sm:text-[15px]">
                        {s.body}
                      </p>
                    </div>
                  </div>
                  {i < placeholderSections.length - 1 ? (
                    <div className="mt-10 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
                  ) : null}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </MotionReveal>
    </section>
  );
}
