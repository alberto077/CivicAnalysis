"use client";

import { Building2, Bus, Home, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";

const insights = [
  {
    title: "Zoning Changes",
    body: "Track text amendments, special districts, and ULURP milestones with plain-language deltas.",
    Icon: Landmark,
    accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    title: "Housing Policy",
    body: "Affordable housing lotteries, MIH tweaks, and tenant protection notices surfaced for your area.",
    Icon: Home,
    accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Transit Updates",
    body: "Bus redesigns, station access work, and street allocation pilots that touch your commute.",
    Icon: Bus,
    accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    title: "Budget Decisions",
    body: "Capital commitments, council discretionary funds, and agency spending shifts with local fingerprints.",
    Icon: Building2,
    accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
] as const;

export function NeighborhoodInsights() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <MotionReveal>
        <h2 className="font-limelight text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
          Neighborhood insights
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Explore categories we watch—each card links out to deeper views later.
        </p>
      </MotionReveal>
      <motion.div
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerContainer}
      >
        {insights.map((item) => (
          <motion.article
            key={item.title}
            variants={staggerItem}
            className="group glass-card lift-card flex h-full flex-col rounded-2xl p-6 md:rounded-3xl"
          >
            <span
              className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.accent}`}
            >
              <item.Icon className="h-4 w-4" strokeWidth={1.65} aria-hidden />
            </span>
            <h3 className="font-limelight mt-4 text-base font-semibold text-[var(--foreground)]">
              {item.title}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            <span className="font-work-sans mt-5 text-xs font-semibold text-[var(--accent)] transition group-hover:translate-x-0.5">
              Coming soon →
            </span>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}
