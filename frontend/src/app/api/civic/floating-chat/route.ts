import { NextResponse } from "next/server";
import { getBackendOrigin } from "@/lib/backend-internal";
import {
  extractRagMarkdown,
  ragReplyHasError,
  type RetrievalTier,
} from "@/lib/policy-reply";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_CONVERSATION_MESSAGES = 32;

export type FloatingChatApiMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildFloatingSessionPreamble(currentPath: string): string {
  return `
You are the CivicAnalysis floating assistant.

Current page:
${currentPath}

Response rules:
- Stay focused on NYC civic topics: local representatives, boroughs, districts, city policy, housing, public services, legislation, budgets, hearings, community issues, and official sources.
- Format for readability: combine short paragraphs with markdown bullet lists—open with a brief paragraph (or two), then use bullets for multiple facts, steps, agencies, or options; avoid an all-bullet wall or one endless paragraph.
- Never use placeholder links like [website URL] or [URL]. Name agencies clearly (HPD, RGB, 311). Official links from the index are shown separately in the app—not in your prose.
- If the question is vague, ask one short clarifying question instead of guessing.
- If the question could refer to multiple things, explain what extra detail is needed, such as borough, district, policy topic, or representative name.
- Do not invent exact numbers, names, bills, or sources.
- Prefer facts supported by retrieved source context when available.
- If the user asks something unrelated to civic policy, politely redirect them back to NYC civic topics.
- When possible, end with a practical next step.
`.trim();
}

function isFloatingRole(value: unknown): value is "user" | "assistant" {
  return value === "user" || value === "assistant";
}

function parseConversationMessages(raw: unknown): FloatingChatApiMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: FloatingChatApiMessage[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (!isFloatingRole(rec.role)) continue;
    const content = typeof rec.content === "string" ? rec.content.trim() : "";
    if (!content) continue;
    out.push({ role: rec.role, content });
  }
  return out.length > 0 ? out : null;
}

function capConversationMessages(messages: FloatingChatApiMessage[]): FloatingChatApiMessage[] {
  if (messages.length <= MAX_CONVERSATION_MESSAGES) return messages;
  return messages.slice(-MAX_CONVERSATION_MESSAGES);
}

type RetrievalSourcePayload = {
  title: string;
  source_url: string;
  source_type: string;
};

function parseRetrievalSourcesFromBackend(data: unknown): RetrievalSourcePayload[] {
  if (typeof data !== "object" || data === null) return [];
  const raw = (data as Record<string, unknown>).retrieval_sources;
  if (!Array.isArray(raw)) return [];
  const out: RetrievalSourcePayload[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const source_url = typeof r.source_url === "string" ? r.source_url.trim() : "";
    const source_type = typeof r.source_type === "string" ? r.source_type.trim() : "";
    if (!source_url) continue;
    out.push({
      title: title || "Source",
      source_url,
      source_type,
    });
  }
  return out.slice(0, 8);
}

function shouldExposeRetrievalSources(args: {
  question: string;
  markdown: string;
  retrievalTier: RetrievalTier;
  retrievalSources: RetrievalSourcePayload[];
}): boolean {
  const question = args.question.toLowerCase().trim();
  const markdown = args.markdown.toLowerCase().trim();
  if (!args.retrievalSources.length) return false;
  if (args.retrievalTier === "none") return false;

  const asksForSources =
    /\b(source|sources|citation|citations|reference|references|resource|resources|link|links|where can i read)\b/.test(
      question,
    );
  if (asksForSources) return true;

  // Hide source panel for conversational/off-topic/simple utility prompts.
  const conversational =
    /^(hi|hello|hey|thanks|thank you|how are you|good morning|good afternoon|good evening)\b/.test(
      question,
    );
  const smallTalk =
    /\b(joke|fun fact|weather|recipe|movie|music|relationship|dating|travel tips)\b/.test(
      question,
    );
  const mostlyMath =
    /^\s*[\d\s+\-*/().%^=<>!]+\s*$/.test(question) ||
    /\b(solve|calculate|what is|compute)\b/.test(question);
  const civicIntent =
    /\b(nyc|new york city|borough|district|council|policy|law|legislation|budget|rent|housing|hpd|rgb|dhcr|hearing|zoning|service|agency|311)\b/.test(
      question,
    );

  // Hide when assistant is refusing/redirecting and didn't rely on evidence.
  const refusalLike =
    /\b(i can'?t help|cannot help|i’m unable|i am unable|not able to assist|outside (the )?scope|off-topic|i can only help)\b/.test(
      markdown,
    );

  if (conversational || smallTalk || mostlyMath || refusalLike || !civicIntent) {
    return false;
  }

  return true;
}

function readRetrievalTier(data: unknown, sourcesUsed: number): RetrievalTier {
  if (typeof data !== "object" || data === null) {
    return sourcesUsed > 0 ? "vector" : "none";
  }
  const rt = (data as Record<string, unknown>).retrieval_tier;
  if (rt === "vector" || rt === "lexical" || rt === "recent" || rt === "none") {
    return rt;
  }
  return sourcesUsed > 0 ? "vector" : "none";
}

function ragInsufficient(args: {
  retrieval_tier: RetrievalTier;
  reply: unknown;
  ragMarkdown: string;
}): boolean {
  if (args.retrieval_tier === "none") return true;
  if (ragReplyHasError(args.reply)) return true;
  if (!args.ragMarkdown) return true;
  return false;
}

function buildOpenAiFallbackSystem(args: {
  backendReplyJson: string;
  hadPriorRagFailure: boolean;
}): string {
  const prior = args.hadPriorRagFailure
    ? "Internal note: the first-pass answer was empty or failed; answer the user helpfully and avoid invented specifics."
    : "";

  return `You are the CivicAnalysis floating assistant for New York City residents.

Optional JSON from an earlier model step (may include a markdown field, an error field, or be empty):
${args.backendReplyJson}

${prior}

Write one concise markdown reply: answer the user's latest message using the full conversation they sent. Use a readable mix—start with a short paragraph (or two), then bullet lists where several distinct points, steps, or examples help scanning; do not use only bullets or only one long block of text.

Never use placeholders like [website URL] or [URL]. Do not paste raw URLs or markdown links in the reply. Name NYC agencies and programs; suggest 311 or NYC.gov search phrases when helpful.

Rules:
- Do not use rigid section titles such as "At a glance", "Key takeaways", "What this means", "Relevant actions", or a separate "Sources" block.
- Do not use section headings that name data sources, indexes, or "CivicAnalysis".
- Do not say the index or database had no results, lacked information, or returned nothing usable.
- Do not describe answers as "general knowledge", "not from the document index", or similar source disclaimers.
- Focus on NYC civic topics when relevant; if off-topic, redirect briefly.
- Do not invent exact bill numbers, ordinance text, or URLs you cannot verify; prefer cautious phrasing for dates and fine details.`.trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const bodyObj =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;

  const currentPathRaw =
    bodyObj && typeof bodyObj.currentPath === "string" ? bodyObj.currentPath.trim() : "/";
  const currentPath = currentPathRaw || "/";

  let messages = parseConversationMessages(bodyObj?.messages);
  const questionFallback =
    bodyObj && typeof bodyObj.question === "string" ? bodyObj.question.trim() : "";

  if (!messages && questionFallback) {
    messages = [{ role: "user", content: questionFallback }];
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json(
      { detail: "Provide a non-empty `messages` array (user/assistant turns), or `question` for a single turn." },
      { status: 400 },
    );
  }

  const capped = capConversationMessages(messages);
  if (capped[capped.length - 1]?.role !== "user") {
    return NextResponse.json(
      { detail: "The last message in `messages` must have role `user`." },
      { status: 400 },
    );
  }

  const lastUserContent = [...capped].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUserContent.trim()) {
    return NextResponse.json({ detail: "Last user message must not be empty." }, { status: 400 });
  }

  const sessionPreamble = buildFloatingSessionPreamble(currentPath);

  let upstream: Response;
  try {
    upstream = await fetch(`${getBackendOrigin()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: lastUserContent,
        demographics: {},
        response_style: "plain",
        messages: capped,
        session_preamble: sessionPreamble,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ detail: `Backend unreachable: ${msg}` }, { status: 502 });
  }

  const rawText = await upstream.text();
  let backendJson: unknown;
  try {
    backendJson = JSON.parse(rawText) as unknown;
  } catch {
    return NextResponse.json(
      { detail: "Backend returned non-JSON." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const detail =
      typeof backendJson === "object" &&
      backendJson !== null &&
      "detail" in backendJson &&
      typeof (backendJson as Record<string, unknown>).detail === "string"
        ? (backendJson as Record<string, unknown>).detail
        : `Backend error (${upstream.status})`;
    return NextResponse.json({ detail }, { status: upstream.status });
  }

  const reply =
    typeof backendJson === "object" &&
    backendJson !== null &&
    "reply" in (backendJson as Record<string, unknown>)
      ? (backendJson as Record<string, unknown>).reply
      : backendJson;

  const sources_used_raw = (backendJson as Record<string, unknown>)?.sources_used;
  const sources_used =
    typeof sources_used_raw === "number" && Number.isFinite(sources_used_raw)
      ? sources_used_raw
      : 0;

  const retrieval_tier = readRetrievalTier(backendJson, sources_used);
  const retrieval_sources = parseRetrievalSourcesFromBackend(backendJson);
  const ragMarkdown = extractRagMarkdown(reply);

  const insufficient = ragInsufficient({
    retrieval_tier,
    reply,
    ragMarkdown,
  });

  if (!insufficient) {
    const visibleSources = shouldExposeRetrievalSources({
      question: lastUserContent,
      markdown: ragMarkdown,
      retrievalTier: retrieval_tier,
      retrievalSources: retrieval_sources,
    })
      ? retrieval_sources
      : [];
    return NextResponse.json({
      mode: "rag",
      markdown: ragMarkdown,
      sources_used,
      retrieval_tier,
      retrieval_sources: visibleSources,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        detail:
          "A confident answer could not be produced from indexed sources, and OPENAI_API_KEY is not configured for fallback.",
      },
      { status: 503 },
    );
  }

  const hadPriorRagFailure = ragReplyHasError(reply) || !ragMarkdown;
  const systemContent = buildOpenAiFallbackSystem({
    backendReplyJson: JSON.stringify(reply, null, 2),
    hadPriorRagFailure,
  });

  try {
    const upstreamOpenAi = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: systemContent }, ...capped],
        temperature: 0.35,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });

    const data = (await upstreamOpenAi.json()) as unknown;
    if (!upstreamOpenAi.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "error" in (data as Record<string, unknown>)
          ? (data as { error?: { message?: string } }).error?.message
          : undefined;
      return NextResponse.json(
        { detail: detail || `OpenAI request failed (${upstreamOpenAi.status}).` },
        { status: upstreamOpenAi.status },
      );
    }

    const content =
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as Record<string, unknown>).choices) &&
      (data as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message
        ?.content;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { detail: "OpenAI returned an empty response." },
        { status: 502 },
      );
    }

    const fallbackMarkdown = content.trim();
    const visibleSources = shouldExposeRetrievalSources({
      question: lastUserContent,
      markdown: fallbackMarkdown,
      retrievalTier: retrieval_tier,
      retrievalSources: retrieval_sources,
    })
      ? retrieval_sources
      : [];

    return NextResponse.json({
      mode: "openai_fallback",
      markdown: fallbackMarkdown,
      sources_used,
      retrieval_tier,
      retrieval_sources: visibleSources,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ detail: `LLM request failed: ${msg}` }, { status: 502 });
  }
}
