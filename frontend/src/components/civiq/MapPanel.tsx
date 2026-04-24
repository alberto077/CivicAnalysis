"use client";

import { CivicMap } from "./CivicMap";
import { MotionReveal } from "./MotionReveal";

export function MapPanel() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <MotionReveal>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl md:text-[2rem]">
          Interactive District Intelligence
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Explore policies and representatives by district across New York City.
        </p>
      </MotionReveal>
      <MotionReveal className="mt-10">
        <CivicMap hideHeader={true} />
      </MotionReveal>
    </section>
  );
}
