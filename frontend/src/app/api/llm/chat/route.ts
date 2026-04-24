import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type InputMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function isInputMessage(value: unknown): value is InputMessage {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  const validRole =
    obj.role === "system" || obj.role === "user" || obj.role === "assistant";
  return validRole && typeof obj.content === "string";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { detail: "Missing OPENAI_API_KEY on server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const rawMessages =
    typeof body === "object" && body !== null && "messages" in body
      ? (body as { messages: unknown }).messages
      : null;

  if (!Array.isArray(rawMessages)) {
    return NextResponse.json(
      { detail: "Expected `messages` array in request body." },
      { status: 400 },
    );
  }

  const messages = rawMessages.filter(isInputMessage).map((msg) => ({
    role: msg.role,
    content: msg.content.trim(),
  }));

  if (messages.length === 0) {
    return NextResponse.json(
      { detail: "At least one valid message is required." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.4,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });

    const data = (await upstream.json()) as unknown;
    if (!upstream.ok) {
      const detail =
        typeof data === "object" &&
        data !== null &&
        "error" in (data as Record<string, unknown>)
          ? (data as { error?: { message?: string } }).error?.message
          : undefined;
      return NextResponse.json(
        { detail: detail || `OpenAI request failed (${upstream.status}).` },
        { status: upstream.status },
      );
    }

    const content =
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as Record<string, unknown>).choices) &&
      (data as { choices: Array<{ message?: { content?: string } }> }).choices[0]
        ?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { detail: "OpenAI returned an empty response." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content: content.trim(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ detail: `LLM request failed: ${msg}` }, { status: 502 });
  }
}
