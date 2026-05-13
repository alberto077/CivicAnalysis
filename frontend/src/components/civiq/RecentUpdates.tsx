"use client";

import { Rss } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";
import { PolicyTitleSplit } from "./PolicyTitleSplit";
import type { PolicyBriefing } from "@/lib/api";

type RecentUpdatesProps = {
  policies: PolicyBriefing[];
  policiesLoading: boolean;
  policiesError: string | null;
};

export function RecentUpdates({ policies, policiesLoading, policiesError }: RecentUpdatesProps) {
  return (
    <section className="w-full py-16 sm:py-24">
      <MotionReveal>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 text-[var(--accent)] shadow-[0_4px_14px_-6px_rgba(91,127,163,0.25)] ring-1 ring-white/70 transition-colors dark:bg-[var(--surface-elevated)] dark:ring-[var(--border)]">
            <Rss className="h-4 w-4" strokeWidth={1.65} aria-hidden />
          </span>
          <h2 className="font-work-sans text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
            Recent policy updates
          </h2>
        </div>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Live feed of official legislation, meeting transcripts, and city decisions.
        </p>
      </MotionReveal>

      <MotionReveal className="mt-10">
        <div className="glass-card feature-border-glow feature-border-glow-updates overflow-hidden rounded-2xl md:rounded-3xl">
          <AnimatePresence mode="wait">
            {policiesLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-20"
              >
                <p className="text-sm text-[var(--muted)] animate-pulse">Loading updates...</p>
              </motion.div>
            ) : policiesError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center px-6 py-16 text-center"
                role="alert"
              >
                <p className="font-work-sans text-sm font-semibold text-[var(--foreground)]">
                  Could not load recent updates
                </p>
                <p className="font-work-sans mt-1 max-w-md text-xs font-normal text-[var(--muted)]">
                  {policiesError}
                </p>
              </motion.div>
            ) : policies.length > 0 ? (
              <motion.ul
                key="list"
                className="divide-y divide-[var(--border)]"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-40px" }}
                variants={staggerContainer}
              >
                {policies.map((p) => (
                  <motion.li
                    key={p.id}
                    variants={staggerItem}
                    className="lift-row flex flex-col gap-2 px-6 py-6 transition-colors hover:bg-white/45 sm:flex-row sm:items-start sm:gap-8 md:px-8 dark:hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    <div className="min-w-0 flex-1">
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-work-sans text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
                      >
                        <PolicyTitleSplit title={p.title} />
                      </a>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="font-work-sans text-xs font-semibold uppercase tracking-wider text-[var(--accent)] bg-[var(--accent-soft)]/20 px-2 py-0.5 rounded">
                          {p.source_type}
                        </span>
                        {p.published_date && (
                          <span className="font-work-sans text-xs font-normal text-[var(--muted)]">
                            {new Date(p.published_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center px-6"
              >
                <p className="font-work-sans text-sm font-medium text-[var(--foreground)]">No recent updates found</p>
                <p className="font-work-sans mt-1 text-xs font-normal text-[var(--muted)]">
                  Try adjusting your filters or search keywords.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionReveal>
    </section>
  );
}
