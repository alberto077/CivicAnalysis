import { Suspense } from "react";

import { HomeShell } from "@/components/civiq/HomeShell";

/** Avoid static-only edge cases for a client-heavy dashboard on Vercel. */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <HomeShell />
    </Suspense>
  );
}
