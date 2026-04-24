"use client";

import { useEffect, useRef, useState } from "react";
import { sendChat, type PolicyResponse } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  text?: string;
  response?: PolicyResponse;
};

function ResponseSection({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function AssistantResponse({ response }: { response: PolicyResponse }) {
  const hasContent =
    response.at_a_glance.length > 0 ||
    response.key_takeaways.length > 0 ||
    response.what_this_means.length > 0 ||
    response.relevant_actions.length > 0 ||
    response.sources.length > 0;

  if (!hasContent) {
    return (
      <p className="text-sm text-slate-700">
        I could not find enough policy information for that question. Try asking
        about a specific borough, issue, bill, or representative.
      </p>
    );
  }

  return (
    <div>
      <ResponseSection title="At a glance" items={response.at_a_glance} />
      <ResponseSection title="Key takeaways" items={response.key_takeaways} />
      <ResponseSection title="What this means" items={response.what_this_means} />
      <ResponseSection title="Relevant actions" items={response.relevant_actions} />

      {response.sources.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sources
          </p>

          <div className="mt-2 space-y-2">
            {response.sources.map((source, index) => (
              <div
                key={`${source.title}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {source.title}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  {source.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FloatingChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi, I can help you understand NYC policies, representatives, sources, and what residents can do next.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = [
    "What should residents do next?",
    "Summarize this in simple terms.",
    "Who represents the Bronx?",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(customPrompt?: string) {
    const question = (customPrompt ?? input).trim();

    if (!question || loading) return;

    setInput("");
    setError("");
    setLoading(true);

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: question,
      },
    ]);

    try {
      const fullQuery = `
User is asking through the floating CivicAnalysis chatbot.

Question:
${question}

Instructions:
- Answer directly.
- Keep it useful for NYC residents.
- Mention sources when available.
- If the answer depends on borough or district and the user did not provide one, explain that briefly.
- Keep the answer concise.
`.trim();

      const response = await sendChat(fullQuery);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          response,
        },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to get a chatbot response right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div className="mb-4 flex h-[620px] max-h-[calc(100vh-7rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-2xl sm:w-[430px]">
          <div className="flex items-center justify-between bg-[var(--accent)] px-5 py-4 text-white">
            <div>
              <h2 className="text-base font-bold">Civic Chat</h2>
              <p className="text-xs text-white/80">
                Ask about policies, reps, and sources
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white transition hover:bg-white/25"
              aria-label="Close chatbot"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4">
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={index}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                        isUser
                          ? "bg-[var(--accent)] text-white"
                          : "border border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      {message.text ? (
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      ) : null}

                      {message.response ? (
                        <AssistantResponse response={message.response} />
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    Thinking...
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void handleSend(prompt)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSend();
                  }
                }}
                placeholder="Ask a civic question..."
                className="h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[var(--accent)]"
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || !input.trim()}
                className="h-12 rounded-2xl bg-[var(--accent)] px-5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-white shadow-2xl transition hover:-translate-y-1 hover:opacity-95"
        aria-label="Open chatbot"
      >
        💬
      </button>
    </div>
  );
}