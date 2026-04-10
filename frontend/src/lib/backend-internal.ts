/**
 * Backend origin for Next.js server proxy routes only (app/api/civic/*).
 * Never import this from Client Components.
 *
 * Set API_INTERNAL_BASE_URL in Vercel dashboard to point at the Render API.
 * Falls back to localhost:8000 for local dev.
 */
export function getBackendOrigin(): string {
  const u = process.env.API_INTERNAL_BASE_URL?.trim();
  const base = u ? u.replace(/\/$/, "") : "http://127.0.0.1:8000";

  if (process.env.VERCEL === "1" && /127\.0\.0\.1|localhost/.test(base)) {
    console.warn(
      "[civic proxy] Set API_INTERNAL_BASE_URL on Vercel to your public FastAPI URL (not localhost).",
    );
  }

  return base;
}