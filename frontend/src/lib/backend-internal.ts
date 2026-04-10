/**
 * Backend origin for Next.js server proxy routes only (app/api/civic/*).
 * Never import this from Client Components.
 *
 * On Vercel, set one of: API_INTERNAL_BASE_URL (preferred), BACKEND_URL,
 * or NEXT_PUBLIC_API_BASE_URL — all must be the public HTTPS base of FastAPI (no trailing slash).
 */
export function getBackendOrigin(): string {
  const raw =
    process.env.API_INTERNAL_BASE_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = raw ? raw.replace(/\/$/, "") : "http://127.0.0.1:8000";

  if (process.env.VERCEL === "1" && /127\.0\.0\.1|localhost/.test(base)) {
    console.warn(
      "[civic proxy] Set API_INTERNAL_BASE_URL (or BACKEND_URL / NEXT_PUBLIC_API_BASE_URL) on Vercel to your public FastAPI URL — not localhost.",
    );
  }

  return base;
}