import { NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const upstreamUrl = `${getBackendOrigin()}/api/politicians${qs ? `?${qs}` : ""}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { detail: `Backend unreachable: ${msg}` },
      { status: 502 }
    );
  }
}