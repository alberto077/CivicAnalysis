import { NextResponse } from "next/server";

import { getBackendOrigin } from "@/lib/backend-internal";

/** Vercel: allow slow Render cold starts / first embedding download */
export const maxDuration = 60;

const UPSTREAM_TIMEOUT_MS = 55_000;

export async function GET() {
  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendOrigin()}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Backend unreachable",
        detail: msg,
      },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}
