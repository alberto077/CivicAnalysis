import { NextResponse } from "next/server";

import { getBackendOrigin } from "@/lib/backend-internal";

export async function GET() {
  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendOrigin()}/api/civic/health`, {
      cache: "no-store",
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
