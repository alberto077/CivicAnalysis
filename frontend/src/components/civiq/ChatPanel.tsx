"use client";

import { useState } from "react";
import { sendChat, type PolicyResponse } from "@/lib/api";

type ChatPanelProps = {
  briefingQuery?: string;
  borough?: string;
  selectedArea?: string;
  selectedTime?: string;
};

function normalizeSource(
  source: unknown,
): { title: string; description?: string } {
  if (Array.isArray(source)) {
    const [title, description] = source;
    return {
      title: String(title ?? "Source"),
      description: description ? String(description) : "",
    };
  }

  if (source && typeof source === "object") {
    const s = source as {
      title?: unknown;
      description?: unknown;
      summary?: unknown;
    };

    return {
      title: String(s.title ?? "Source"),
      description: s.description
        ? String(s.description)
        : s.summary
          ? String(s.summary)
          : "",
    };
  }

  return {
    title: String(source ?? "Source"),
    description: "",
  };
}

function Section({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">{title}</h3>
      <ul className="space-y-2 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="ml-5 list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChatPanel({
  briefingQuery,
  borough,
  selectedArea,
  selectedTime,
}: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PolicyResponse | null>(null);

  const handleAsk = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const lower = trimmed.toLowerCase();

      let fullQuery = "";

      if (lower.includes("summarize")) {
        fullQuery = `
Current briefing topic: ${briefingQuery || "Unknown"}.
Selected issue area: ${selectedArea && selectedArea !== "All" ? selectedArea : "General"}.
Selected borough: ${borough && borough !== "All NYC" ? borough : "All NYC"}.
Selected timeframe: ${selectedTime && selectedTime !== "All Time" ? selectedTime : "Last 30 Days"}.

User request:
Summarize the current briefing in simple terms.

Instructions:
- Give a short plain-English summary.
- Focus only on the current briefing topic and selected borough.
- Do not add unrelated facts.
- Do not repeat the full briefing word-for-word.
- If the evidence is limited, say that briefly.
        `.trim();
      } else if (lower.includes("sources")) {
        fullQuery = `
Current briefing topic: ${briefingQuery || "Unknown"}.
Selected issue area: ${selectedArea && selectedArea !== "All" ? selectedArea : "General"}.
Selected borough: ${borough && borough !== "All NYC" ? borough : "All NYC"}.
Selected timeframe: ${selectedTime && selectedTime !== "All Time" ? selectedTime : "Last 30 Days"}.

User request:
Identify which sources support the current briefing.

Instructions:
- Focus on the most relevant supporting sources.
- Briefly explain why each source matters.
- Do not restate the entire briefing.
- Keep the answer concise and evidence-based.
        `.trim();
      } else {
        fullQuery = `
Current briefing topic: ${briefingQuery || "Unknown"}.
Selected issue area: ${selectedArea && selectedArea !== "All" ? selectedArea : "General"}.
Selected borough: ${borough && borough !== "All NYC" ? borough : "All NYC"}.
Selected timeframe: ${selectedTime && selectedTime !== "All Time" ? selectedTime : "Last 30 Days"}.

User follow-up question:
${trimmed}

Instructions:
- Answer the follow-up question directly.
- Keep the response focused on the selected issue area, borough, and timeframe.
- Do not repeat the full briefing unless the user explicitly asks for a summary.
- Avoid unrelated facts.
- If evidence is limited, say so briefly and then provide the most relevant answer available.
- Keep recommendations practical and specific.
        `.trim();
      }

      const data = await sendChat(
        fullQuery,
        borough && borough !== "All NYC" ? { borough } : undefined,
      );

      console.log("CHAT PANEL RESPONSE", data);

      setLastQuestion(trimmed);
      setMessage("");
      setResponse(data);
    } catch (e) {
      console.error("Chat request failed:", e);
      setError(
        e instanceof Error ? e.message : "Unable to load chat response",
      );
    } finally {
      setLoading(false);
    }
  };

  const sources = Array.isArray(response?.sources)
    ? response.sources.map(normalizeSource)
    : [];

  const hasContent =
    !!response?.at_a_glance?.length ||
    !!response?.key_takeaways?.length ||
    !!response?.what_this_means?.length ||
    !!response?.relevant_actions?.length;

  return (
    <section className="mx-auto mt-8 w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Follow-up Chat
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          Ask a follow-up question about the current briefing.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Summarize the current briefing in simple terms.",
            "What should residents do next?",
            "Which sources support this briefing?",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setMessage(prompt)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <input
            id="followup-chat"
            name="followup-chat"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleAsk();
              }
            }}
            placeholder="What should residents do next?"
            className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none"
          />

          <button
            type="button"
            onClick={handleAsk}
            disabled={loading || !message.trim()}
            className="h-12 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Generating..." : "Ask"}
          </button>
        </div>

        {loading && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Generating follow-up response...
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {lastQuestion && !loading && (
          <div className="mt-4 text-sm text-slate-500">
            Last question:{" "}
            <span className="font-medium text-slate-700">{lastQuestion}</span>
          </div>
        )}

        {response && !hasContent && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No relevant follow-up insights are available for this question at the
            moment. Please try a more specific query or explore the main
            briefing content for more information.
          </div>
        )}

        {response && (
          <div className="mt-6 space-y-4">
            <Section title="At a glance" items={response.at_a_glance} />
            <Section title="Key takeaways" items={response.key_takeaways} />
            <Section title="What this means" items={response.what_this_means} />
            <Section
              title="Relevant actions"
              items={response.relevant_actions}
            />

            {sources.length > 0 && (
              <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  Sources
                </h3>

                <div className="space-y-3 text-sm text-slate-700">
                  {sources.map((source, index) => (
                    <div
                      key={`${source.title}-${index}`}
                      className="rounded-2xl border border-slate-200 p-3"
                    >
                      <div className="font-medium text-slate-900">
                        {source.title}
                      </div>

                      {source.description && (
                        <div className="mt-1 text-slate-600">
                          {source.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}