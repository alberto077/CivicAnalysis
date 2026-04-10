/**
 * Backend origin for server-side proxy routes only (not exposed to the browser).
 */
export function getBackendOrigin(): string {
  const u =
    process.env.API_INTERNAL_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "http://127.0.0.1:8000";
}
