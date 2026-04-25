"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

import {
  postFloatingChatOrchestrated,
  type FloatingChatTurn,
  type FloatingRetrievalSource,
} from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  text?: string;
  markdown?: string;
  retrieval_sources?: FloatingRetrievalSource[];
};

function buildFloatingApiMessages(
  prior: ChatMessage[],
  latestUserText: string,
): FloatingChatTurn[] {
  const out: FloatingChatTurn[] = [];
  for (const m of prior) {
    if (m.role === "user") {
      const t = m.text?.trim();
      if (t) out.push({ role: "user", content: t });
    } else {
      const c = (m.markdown ?? m.text)?.trim();
      if (c) out.push({ role: "assistant", content: c });
    }
  }
  out.push({ role: "user", content: latestUserText });
  return out;
}

const floatingMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-snug">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0 leading-snug">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0 leading-snug">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--accent)] underline underline-offset-2 decoration-[var(--accent)]/40"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = typeof className === "string" && className.includes("language-");
    if (isBlock) {
      return (
        <code className="my-1.5 block overflow-x-auto rounded-md bg-slate-100/90 p-1.5 text-[11px] leading-relaxed">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-slate-100 px-1 py-px text-[11px]">{children}</code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-slate-200/90 pl-2.5 text-slate-600 leading-snug">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-2 border-slate-200/80" />,
  h1: ({ children }) => (
    <h3 className="mb-1.5 mt-2 text-xs font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1.5 mt-2 text-xs font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-2 text-xs font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
};

export function FloatingChatBot() {
  const pathname = usePathname();

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
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : pathname || "/";

      const apiMessages = buildFloatingApiMessages(messages, question);

      const result = await postFloatingChatOrchestrated({
        messages: apiMessages,
        currentPath,
      });

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          markdown: result.markdown,
          retrieval_sources:
            result.retrieval_sources.length > 0 ? result.retrieval_sources : undefined,
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

  const hideFloatingChat = pathname === "/chat";

  if (hideFloatingChat) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <div
          className="mb-4 flex h-[min(560px,calc(100vh-5.5rem))] w-[calc(100vw-1.5rem)] max-w-[min(520px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] sm:w-[min(520px,calc(100vw-2.5rem))]"
          role="dialog"
          aria-label="Civic chat"
        >
          <div className="flex shrink-0 items-center justify-between bg-[var(--accent)] px-4 py-3 text-white">
            <div className="min-w-0 pr-2">
              <h2 className="text-sm font-semibold tracking-tight">Civic Chat</h2>
              <p className="mt-0.5 text-[11px] leading-tight text-white/85">
                NYC policy &amp; local government
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-lg leading-none text-white transition hover:bg-white/22"
              aria-label="Close chatbot"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/95 to-slate-50 px-3 py-3">
            <div className="space-y-2.5">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={index}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-3 py-2 text-[13px] leading-snug shadow-[0_1px_2px_rgba(15,23,42,0.06)] ${
                        isUser
                          ? "bg-[var(--accent)] text-white [&_a]:text-white [&_a]:underline-offset-2"
                          : "border border-slate-200/80 bg-white text-slate-800"
                      }`}
                    >
                      {message.text ? (
                        <p className="leading-snug">{message.text}</p>
                      ) : null}

                      {message.markdown ? (
                        <div className="break-words text-[13px] leading-snug [&_a]:font-medium [&_a]:text-[var(--accent)]">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={floatingMarkdownComponents}
                          >
                            {message.markdown}
                          </ReactMarkdown>
                        </div>
                      ) : null}

                      {message.retrieval_sources && message.retrieval_sources.length > 0 ? (
                        <div className="mt-2 border-t border-slate-200/80 pt-2">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Official sources
                          </p>
                          <ul className="space-y-1.5">
                            {message.retrieval_sources.map((src) => (
                              <li key={src.source_url} className="leading-snug">
                                <a
                                  href={src.source_url}
                                  className="text-[12px] font-medium text-[var(--accent)] underline decoration-[var(--accent)]/35 underline-offset-2 hover:decoration-[var(--accent)]"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {src.title}
                                </a>
                                {src.source_type ? (
                                  <span className="mt-0.5 block text-[10px] text-slate-500">
                                    {src.source_type}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {loading ? (
                <div className="flex justify-start">
                  <div className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12px] text-slate-500 shadow-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400"
                        aria-hidden
                      />
                      Thinking…
                    </span>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2 text-[12px] leading-snug text-red-800">
                  {error}
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200/90 bg-white p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSend();
                  }
                }}
                placeholder="Ask a civic question…"
                className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15"
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || !input.trim()}
                className="h-9 shrink-0 rounded-xl bg-[var(--accent)] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:opacity-92 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Send
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
