import { NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    let upstream: Response;
    try {
        upstream = await fetch(`${getBackendOrigin()}/api/calendar`, {
            cache: "no-store",
            signal: AbortSignal.timeout(55_000),
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