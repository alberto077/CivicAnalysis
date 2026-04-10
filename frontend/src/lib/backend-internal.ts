/**
 * Backend origin for Next.js server proxy routes only (app/api/civic/*).
 * Never import this from Client Components.
 *
 * On Vercel, set one of: API_INTERNAL_BASE_URL (preferred), BACKEND_URL,
 * or NEXT_PUBLIC_API_BASE_URL — the public HTTPS base of FastAPI (no trailing slash).
 * Use the API server's URL (e.g. Render), not your Vercel frontend URL.
 *
 * If the env value already ends with `/api` (some hosts document it that way),
 * paths are joined as `{base}/health` and `{base}/chat` instead of `{base}/api/...`.
 */

export type UpstreamRoute = "health" | "chat";

function getBackendBase(): { base: string } {
  const raw =
    process.env.API_INTERNAL_BASE_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "";
  const base = (raw || "http://127.0.0.1:8000").replace(/\/+$/, "");
  return { base };
}

/** Raw configured base (no path normalization). For logging and localhost warnings. */
export function getBackendOrigin(): string {
  const { base } = getBackendBase();

  if (process.env.VERCEL === "1" && /127\.0\.0\.1|localhost/.test(base)) {
    console.warn(
      "[civic proxy] Set API_INTERNAL_BASE_URL (or BACKEND_URL / NEXT_PUBLIC_API_BASE_URL) on Vercel to your public FastAPI URL — not localhost.",
    );
  }

  return base;
}

/** Full URL for FastAPI health or chat, accounting for optional `/api` suffix on the base. */
export function getUpstreamApiUrl(route: UpstreamRoute): string {
  const { base } = getBackendBase();
  const path = /\/api$/i.test(base)
    ? route === "health"
      ? "/health"
      : "/chat"
    : route === "health"
      ? "/api/health"
      : "/api/chat";
  return `${base}${path}`;
}

/**
 * On Vercel, avoid confusing "Not Found" responses when the backend env points at
 * localhost (the default) or at this same deployment's hostname.
 */
export function misconfiguredBackendResponse(): Response | null {
  if (process.env.VERCEL !== "1") return null;

  const raw =
    process.env.API_INTERNAL_BASE_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "";

  const effective =
    (raw || "http://127.0.0.1:8000").replace(/\/+$/, "");

  if (/127\.0\.0\.1|localhost/i.test(effective)) {
    return new Response(
      JSON.stringify({
        detail:
          "API_INTERNAL_BASE_URL is missing or still points at localhost. On Vercel, set API_INTERNAL_BASE_URL (or BACKEND_URL) to your public FastAPI origin, e.g. https://your-api.onrender.com — not 127.0.0.1.",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const backendHost = new URL(
      effective.startsWith("http") ? effective : `https://${effective}`,
    ).hostname.toLowerCase();
    const vercelHost = process.env.VERCEL_URL?.trim().toLowerCase();
    if (vercelHost && backendHost === vercelHost) {
      return new Response(
        JSON.stringify({
          detail:
            "API_INTERNAL_BASE_URL must be your FastAPI server URL (e.g. Render), not this site's Vercel URL. The frontend only exposes /api/civic/*; FastAPI serves /api/health and /api/chat on the backend host.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * When upstream returns 404, prefer a specific explanation (e.g. Render has no Web Service).
 * Call before consuming `upstream` body. Falls back to `upstream404Hint`.
 */
export function upstream404Detail(triedUrl: string, upstream: Response): string {
  const renderRouting =
    upstream.headers.get("x-render-routing")?.trim().toLowerCase() ?? "";
  if (renderRouting === "no-server") {
    try {
      const origin = new URL(triedUrl).origin;
      return [
        `Render reports no web service for ${origin} (HTTP 404, x-render-routing: no-server).`,
        "Open the Render dashboard: confirm this hostname matches your FastAPI Web Service, resume if suspended, and verify a recent deploy succeeded.",
        "This is not a missing /api/health route — the request did not reach your app process.",
      ].join(" ");
    } catch {
      /* fall through */
    }
  }
  return upstream404Hint(triedUrl);
}

/** Explains common 404s when the proxy reaches the wrong host or double-/api paths. */
export function upstream404Hint(triedUrl: string): string {
  const vercelHost = process.env.VERCEL_URL?.trim();
  let looksLikeFrontend = false;
  try {
    const host = new URL(triedUrl).hostname.toLowerCase();
    if (host.endsWith(".vercel.app")) looksLikeFrontend = true;
    if (vercelHost && host === vercelHost.toLowerCase()) looksLikeFrontend = true;
  } catch {
    /* ignore */
  }

  const parts = [
    `The policy API returned 404 for: ${triedUrl}.`,
    looksLikeFrontend
      ? "On Vercel, API_INTERNAL_BASE_URL must be your FastAPI server (e.g. https://….onrender.com), not this frontend's Vercel URL."
      : "Confirm API_INTERNAL_BASE_URL is the root of your FastAPI app.",
    "If your docs give a base URL that already ends with /api, keep that form — the proxy will call /health and /chat under it.",
  ];
  return parts.join(" ");
}
