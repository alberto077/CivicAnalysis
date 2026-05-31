import { NextResponse, NextRequest } from "next/server";
import { getBackendOrigin, BACKEND_CHAT_FETCH_TIMEOUT_MS } from "@/lib/backend-internal";

export const maxDuration = 180;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;

    if (!slug) {
        return NextResponse.json({ error: "Area slug required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const upstreamUrl = new URL(
        `${getBackendOrigin()}/api/briefings/${encodeURIComponent(slug)}`,
    );

    // forward all query params (borough, issues, housing, demographics, personalized)
    searchParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
    });

    let upstream: Response;
    try {
        upstream = await fetch(upstreamUrl.toString(), {
            cache: "no-store",
            signal: AbortSignal.timeout(BACKEND_CHAT_FETCH_TIMEOUT_MS),
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const isTimeout = /timeout|aborted/i.test(msg);
        return NextResponse.json(
            {
                error: isTimeout ? "Briefing timed out" : "Backend unreachable",
                detail: isTimeout
                    ? "The AI took too long to respond. Try again in a moment."
                    : msg,
            },
            { status: isTimeout ? 504 : 502 },
        );
    }

    const text = await upstream.text();

    const headers: Record<string, string> = {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
    };
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) headers["Cache-Control"] = cacheControl;

    return new NextResponse(text, { status: upstream.status, headers });
}