"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, ExternalLink, ChevronRight } from "lucide-react";
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

// build API message history

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

const mdComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 text-[14px] leading-relaxed text-slate-800 dark:text-slate-200">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 space-y-1 pl-4 last:mb-0 text-[14px] leading-relaxed text-slate-800 dark:text-slate-200">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0 text-[14px] leading-relaxed text-slate-800 dark:text-slate-200">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed flex gap-2">
      <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]/60 inline-block" />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-2 hover:decoration-[var(--accent)]"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock =
      typeof className === "string" && className.includes("language-");
    if (isBlock) {
      return (
        <code className="my-2 block overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-3 font-mono text-[12px] leading-relaxed text-slate-800 dark:text-slate-200">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[12px] text-slate-800 dark:text-slate-200">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--accent)]/40 pl-3 text-[13px] italic text-slate-600 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-work-sans text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-work-sans text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 font-work-sans text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 first:mt-0">
      {children}
    </h3>
  ),
};

function SourceRow({ src }: { src: FloatingRetrievalSource }) {
  return (
    <a
      href={src.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 transition hover:border-[var(--accent)]/30 hover:bg-white dark:hover:bg-slate-800"
    >
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent)] opacity-60 group-hover:opacity-100" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-[var(--accent)] line-clamp-2">
          {src.title}
        </p>
        {src.source_type && (
          <p className="font-work-sans mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {src.source_type}
            {src.published_date
              ? ` · ${new Date(src.published_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
              : ""}
          </p>
        )}
      </div>
    </a>
  );
}

// default user suggested prompts
const SUGGESTED = [
  "What NYC bills passed this month?",
  "Explain the Good Cause Eviction law",
  "Any new transit funding from Albany?",
  "What federal housing aid affects NYC?",
];



export function FloatingChatBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // focus input when panel opens
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  // keyboard escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  async function handleSend(customPrompt?: string) {
    const question = (customPrompt ?? input).trim();
    if (!question || loading) return;

    setInput("");
    setError("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", text: question }]);

    try {
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : pathname || "/";

      const apiMessages = buildFloatingApiMessages(messages, question);
      const result = await postFloatingChatOrchestrated({
        messages: apiMessages,
        currentPath,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          markdown: result.markdown,
          retrieval_sources:
            result.retrieval_sources.length > 0
              ? result.retrieval_sources
              : undefined,
        },
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to get a response right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  // don't show on /chat page
  if (pathname === "/chat") return null;
  if (!mounted) return null;

  const panelEase = [0.22, 1, 0.36, 1] as const;

  return (
    <>
      {/* PERSISTENT side panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="spiegel-panel"
            role="complementary"
            aria-label="Ask Spiegel — NYC policy assistant"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: panelEase }}
            className="fixed right-0 top-0 bottom-0 z-[120] flex w-[min(100vw,380px)] flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[var(--surface-card)] shadow-2xl"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                  <Sparkles
                    className="h-3.5 w-3.5 text-[var(--accent)]"
                    strokeWidth={1.75}
                  />
                </span>
                <div>
                  <h2 className="font-limelight text-base font-medium tracking-tight text-slate-900 dark:text-white leading-none">
                    Ask Spiegel
                  </h2>
                  <p className="font-work-sans text-[9px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">
                    NYC · NY State · Federal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </header>

            {/* MESSAGES */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* empty state */}
              {messages.length === 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ask about NYC legislation, NY State bills, or federal policy affecting the city. I'll cite my sources.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void handleSend(prompt)}
                        className="group flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-left text-[12px] text-slate-600 dark:text-slate-400 transition hover:border-[var(--accent)]/30 hover:bg-white dark:hover:bg-slate-800 hover:text-[var(--accent)]"
                      >
                        <ChevronRight className="h-3 w-3 shrink-0 text-slate-300 group-hover:text-[var(--accent)] transition-colors" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* messages history */}
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={
                        isUser
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-[var(--accent)] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm"
                          : "w-full rounded-2xl rounded-bl-md border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3"
                      }
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      ) : (
                        <div className="min-w-0">
                          {msg.markdown && (
                            <div className="break-words">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={mdComponents}
                              >
                                {msg.markdown}
                              </ReactMarkdown>
                            </div>
                          )}

                          {/* sources/citations */}
                          {msg.retrieval_sources &&
                            msg.retrieval_sources.length > 0 && (
                              <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                                <p className="font-work-sans mb-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                  Sources
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  {msg.retrieval_sources.map((src, si) => (
                                    <SourceRow key={si} src={src} />
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* loading bubble */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-bl-md border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* error */}
              {error && (
                <div className="rounded-xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-[12px] text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* input footer */}
            <footer className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[var(--surface-card)] px-4 py-3">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about NYC or NY State policy…"
                  disabled={loading}
                  className="font-work-sans min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Send"
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm transition hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path d="M5 12h13" strokeLinecap="round" />
                      <path
                        d="m13 6 6 6-6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </form>
              <p className="mt-1.5 text-center font-work-sans text-[9px] text-slate-400">
                Covers NYC Council, NY State Legislature &amp; federal policy
              </p>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* FAB launcher (floating action button)*/}
      {!isOpen && (
        <div className="fixed bottom-6 right-5 z-[120] sm:right-8 sm:bottom-8">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)] py-3 pl-4 pr-5 text-white shadow-lg shadow-[var(--accent)]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[var(--accent)]/30 hover:scale-[1.04] active:scale-[0.97]"
            aria-label="Open Ask Spiegel"
          >
            <Sparkles
              className="h-4 w-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="font-work-sans text-[13px] font-semibold tracking-wide">
              Ask Spiegel
            </span>
          </button>
        </div>
      )}
    </>
  );
}