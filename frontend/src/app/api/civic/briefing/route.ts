import { NextResponse } from "next/server";

import {
  getUpstreamApiUrl,
  misconfiguredBackendResponse,
  upstream404Detail,
} from "@/lib/backend-internal";

/** Vercel: allow slow Render cold starts / HuggingFace + RAG latency */
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_TIMEOUT_MS = 55_000;

export async function POST(request: Request) {
  
  const mis = misconfiguredBackendResponse();
  if (mis) return mis;

  const body = await request.text();
  const url = getUpstreamApiUrl("chat");
  console.log("Upstream URL:", url);
  
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { detail: `Backend unreachable: ${msg}` },
      { status: 502 },
    );
  }

  if (upstream.status === 404) {
    return NextResponse.json(
      { detail: upstream404Detail(url, upstream) },
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
