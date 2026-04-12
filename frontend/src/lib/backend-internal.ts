export function getBackendOrigin(): string {
  const url = process.env.API_INTERNAL_BASE_URL?.trim() || "http://127.0.0.1:8000";
  return url.replace(/\/$/, "");
}