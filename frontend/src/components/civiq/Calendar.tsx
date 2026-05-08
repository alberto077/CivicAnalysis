"use client";

import { MotionReveal } from "./MotionReveal";

export function Calendar() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <MotionReveal>
        <h2 className="font-limelight text-2xl font-medium tracking-tight text-[rgba(20,31,45,0.9)] sm:text-3xl md:text-[2rem]">
          CALENDAR
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          CALENDAR
        </p>
      </MotionReveal>
      <MotionReveal className="mt-10">
        hello world
      </MotionReveal>
    </section>
  );
}
