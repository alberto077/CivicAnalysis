import { NextResponse, NextRequest } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const upstreamUrl = new URL(`${getBackendOrigin()}/api/votes`);

    // forward query params (area, limit, offset, borough, issues)
    searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
    });

    let upstream: Response;
    try {
        upstream = await fetch(upstreamUrl.toString(), {
            cache: "no-store",
            signal: AbortSignal.timeout(55_000),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isTimeout = /timeout|aborted/i.test(msg);
        return NextResponse.json(
            {
                error: isTimeout ? "Votes request timed out" : "Backend unreachable",
                detail: isTimeout
                    ? "The backend took too long to respond."
                    : `${msg}. Checklist: (1) Is main.py deployed with /api/votes? (2) Has populate_votes.py been run? (3) Is API_INTERNAL_BASE_URL set correctly?`,
                events: [],
                total: 0,
            },
            { status: isTimeout ? 504 : 502 },
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