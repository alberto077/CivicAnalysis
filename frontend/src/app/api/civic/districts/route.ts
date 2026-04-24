import { NextResponse, NextRequest } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const upstreamUrl = new URL(`${getBackendOrigin()}/api/districts`);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Backend unreachable", detail: msg },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
