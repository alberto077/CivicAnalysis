"use client";

import { Building2, Bus, Home, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { MotionReveal, staggerContainer, staggerItem } from "./MotionReveal";

const insights = [
  {
    title: "Zoning Changes",
    body: "Track text amendments, special districts, and ULURP milestones with plain-language deltas.",
    Icon: Landmark,
  },
  {
    title: "Housing Policy",
    body: "Affordable housing lotteries, MIH tweaks, and tenant protection notices surfaced for your area.",
    Icon: Home,
  },
  {
    title: "Transit Updates",
    body: "Bus redesigns, station access work, and street allocation pilots that touch your commute.",
    Icon: Bus,
  },
  {
    title: "Budget Decisions",
    body: "Capital commitments, council discretionary funds, and agency spending shifts with local fingerprints.",
    Icon: Building2,
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
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(232,121,166,0.1)_0%,rgba(91,127,163,0.1)_100%)] text-[var(--accent)] ring-1 ring-white/55">
              <item.Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden />
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
