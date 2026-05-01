import { HomeShell } from "@/components/civiq/HomeShell";

/** Avoid stale RSC HTML vs client bundle mismatches in dev (hydration warnings after UI edits). */
export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeShell />;
}
