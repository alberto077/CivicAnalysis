/**
 * Backend origin for Next.js **server** proxy routes only (`app/api/civic/*`).
 * Never import this from Client Components — it would bundle nothing useful.
 *
 * Prefer **API_INTERNAL_BASE_URL** (or **BACKEND_URL**) on Vercel: server-only,
 * no `NEXT_PUBLIC_` warning, and the browser never sees your API hostname.
 */
export function getBackendOrigin(): string {
  const u =
    process.env.API_INTERNAL_BASE_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  const base = u ? u.replace(/\/$/, "") : "http://127.0.0.1:8000";

  if (process.env.VERCEL === "1" && /127\.0\.0\.1|localhost/.test(base)) {
    console.warn(
      "[civic proxy] Set API_INTERNAL_BASE_URL on Vercel to your public FastAPI URL (not localhost).",
    );
  }

  return base;
}
