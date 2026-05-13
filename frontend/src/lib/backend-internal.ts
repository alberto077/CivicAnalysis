/** Keep below the route segment `maxDuration` (seconds) on each BFF proxy. */
export const BACKEND_CHAT_FETCH_TIMEOUT_MS = 115_000;

/** Health checks should tolerate cold DB / slow first connection without false failures. */
export const BACKEND_HEALTH_FETCH_TIMEOUT_MS = 90_000;

export function getBackendOrigin(): string {
  const url = process.env.API_INTERNAL_BASE_URL?.trim() || "http://127.0.0.1:8000";
  return url.replace(/\/$/, "");
}