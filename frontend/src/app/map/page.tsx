"use client";

import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import { MotionReveal } from "@/components/civiq/MotionReveal";
import { CivicMap } from "@/components/civiq/CivicMap";

export default function MapPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[var(--background)]">
      <Header />
      <main className="relative z-10 flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <MotionReveal>
            <CivicMap />
          </MotionReveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
