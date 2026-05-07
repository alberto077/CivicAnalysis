"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
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
  p: ({ children }) => (
    <p className="mb-2.5 last:mb-0 text-[15px] leading-relaxed text-[var(--foreground)]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2.5 list-disc space-y-1 pl-4 text-[15px] leading-relaxed text-[var(--foreground)] last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2.5 list-decimal space-y-1 pl-4 text-[15px] leading-relaxed text-[var(--foreground)] last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--foreground)]">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/35 underline-offset-2"
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
        <code className="my-2 block overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]/90 p-3 font-mono text-[13px] leading-relaxed text-[var(--foreground)]">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded border border-slate-200/70 bg-slate-100/90 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">
        {children}
      </code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--border)] pl-3 text-[15px] leading-relaxed text-[var(--foreground-secondary)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 font-work-sans text-[11px] font-bold uppercase tracking-widest text-slate-500 first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-3 font-work-sans text-[11px] font-bold uppercase tracking-widest text-slate-500 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-3 font-work-sans text-[11px] font-bold uppercase tracking-widest text-slate-500 first:mt-0">
      {children}
    </h3>
  ),
};

const panelEase = [0.22, 1, 0.36, 1] as const;

/** Scales with viewport height (min 600px, up to ~86vh, cap 920px) so large screens feel balanced, never past the screen. */
const askSpiegelPanelHeight = "min(calc(100dvh - 2rem), min(920px, max(600px, 86vh)))";

export function FloatingChatBot() {
  const pathname = usePathname();

  /** Avoid FAB SSR/client DOM mismatch (e.g. motion/compiler wrappers vs native button). */
  const [launcherMounted, setLauncherMounted] = useState(false);
  useEffect(() => {
    setLauncherMounted(true);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
    return () => window.clearTimeout(t);
  }, [isOpen]);

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
    <>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <>
            <motion.button
              key="ask-spiegel-backdrop"
              type="button"
              aria-label="Close Ask Spiegel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[190] bg-slate-900/[0.22] backdrop-blur-[3px] dark:bg-black/55"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              key="ask-spiegel-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Ask Spiegel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: panelEase }}
              style={{
                height: askSpiegelPanelHeight,
                top: `calc((100dvh - ${askSpiegelPanelHeight}) / 2)`,
              }}
              className="fixed right-2 z-[200] flex w-[min(100%,max(19rem,38vw))] max-w-[calc(100vw_-_0.5rem)] flex-col overflow-hidden rounded-2xl border border-white/45 bg-gradient-to-b from-white/[0.52] via-white/[0.38] to-white/[0.28] shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45),inset_0_1px_0_0_rgba(255,255,255,0.65)] backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-300 sm:right-4 sm:rounded-3xl dark:border-[var(--border)] dark:from-[#151b22] dark:via-[#121820] dark:to-[#0b0f14] dark:shadow-[0_24px_80px_-28px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.06)]"
            >
              <header className="relative flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-5 sm:gap-6 sm:px-7 sm:pb-4 sm:pt-6">
                <div className="min-w-0 pr-12">
                  <h2 className="font-limelight text-2xl font-medium tracking-tight text-slate-900 sm:text-[1.65rem] dark:text-[var(--foreground)]">
                    Ask Spiegel
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-4 z-[22] flex h-10 w-10 items-center justify-center rounded-xl border border-white/50 bg-white/55 text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white/75 hover:text-slate-900 sm:right-5 sm:top-5 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground-secondary)] dark:hover:bg-[var(--surface-card)] dark:hover:text-[var(--foreground)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="space-y-7">
                  {messages.map((message, index) => {
                    const isUser = message.role === "user";

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, ease: panelEase }}
                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={
                            isUser
                              ? "max-w-[min(92%,24rem)] rounded-xl border border-white/55 bg-white/80 px-5 py-3 text-right shadow-[0_2px_12px_-4px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/95 dark:shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]"
                              : "max-w-[min(96%,100%)] rounded-[14px] border border-white/35 bg-white/35 px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] backdrop-blur-sm dark:border-[var(--border)] dark:bg-[var(--surface-card)]/90 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                          }
                        >
                          <div
                            className={`text-[15px] leading-relaxed text-slate-900 dark:text-[var(--foreground)] ${isUser ? "text-right" : "text-left"}`}
                          >
                            {message.text ? (
                              <p className={`whitespace-pre-wrap ${isUser ? "text-right" : ""}`}>{message.text}</p>
                            ) : null}

                            {message.markdown ? (
                              <div
                                className={`break-words [&_a]:font-medium [&_a]:text-[var(--accent)] ${isUser ? "text-right" : "text-left"}`}
                              >
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={floatingMarkdownComponents}
                                >
                                  {message.markdown}
                                </ReactMarkdown>
                              </div>
                            ) : null}

                            {message.retrieval_sources && message.retrieval_sources.length > 0 ? (
                              <div className="mt-4 border-t border-slate-200/60 pt-4 text-left dark:border-[var(--border)]">
                                <p className="font-work-sans mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[var(--muted)]">
                                  References
                                </p>
                                <ul className="space-y-2">
                                  {message.retrieval_sources.map((src) => (
                                    <li key={src.source_url} className="leading-snug">
                                      <a
                                        href={src.source_url}
                                        className="text-[12px] font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-2 hover:decoration-[var(--accent)]"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {src.title}
                                      </a>
                                      {src.source_type ? (
                                        <span className="font-work-sans mt-0.5 block text-[10px] uppercase tracking-wide text-slate-500 dark:text-[var(--muted)]">
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
                      </motion.div>
                    );
                  })}

                  {loading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex w-full justify-start"
                    >
                      <div className="max-w-[min(96%,100%)] rounded-[14px] border border-white/35 bg-white/35 px-4 py-3 backdrop-blur-sm dark:border-[var(--border)] dark:bg-[var(--surface-card)]/80">
                        <span
                          className="inline-block h-1 w-12 animate-pulse rounded-full bg-slate-300/90"
                          aria-hidden
                        />
                      </div>
                    </motion.div>
                  ) : null}

                  {error ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-200/80 bg-red-50/95 px-5 py-3 text-[13px] leading-relaxed text-red-900 dark:border-red-900/45 dark:bg-red-950/45 dark:text-red-100"
                    >
                      {error}
                    </motion.div>
                  ) : null}

                  <div ref={bottomRef} />
                </div>
              </div>

              <footer className="shrink-0 border-t border-white/25 bg-white/[0.08] px-5 py-5 backdrop-blur-md sm:px-7 sm:py-6">
                <form
                  className="mx-auto w-full min-w-0"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSend();
                  }}
                >
                  <label htmlFor="ask-spiegel-input" className="font-work-sans sr-only">
                    Ask Spiegel — ask about NYC policy...
                  </label>
                  <div className="glass-card search-shell command-shell group mx-auto flex h-14 w-full min-w-0 max-w-full items-center gap-2 rounded-[23px] border border-white/40 bg-gradient-to-br from-white/70 to-white/45 py-0 pl-[clamp(0.75rem,2vw,1.125rem)] pr-[clamp(0.85rem,2.3vw,1.25rem)] leading-[25px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75),0_12px_36px_-18px_rgba(15,23,42,0.2)] backdrop-blur-md transition-colors duration-300 sm:h-[3.625rem] sm:gap-3 md:h-[61px] md:gap-[clamp(0.5rem,1.5vw,0.75rem)] dark:border-[var(--border)] dark:from-[var(--surface-elevated)] dark:to-[var(--surface-card)] dark:shadow-[inset_0_2px_6px_rgba(0,0,0,0.35),0_12px_36px_-18px_rgba(0,0,0,0.45)]">
                    <span className="flex shrink-0 text-[var(--muted)]" aria-hidden>
                      <Sparkles
                        className="h-[clamp(1.05rem,min(1.35rem,38cqh),1.5rem)] w-[clamp(1.05rem,min(1.35rem,38cqh),1.5rem)] shrink-0 opacity-75 transition-transform duration-300 group-focus-within:scale-105"
                        strokeWidth={1.65}
                      />
                    </span>
                    <input
                      ref={inputRef}
                      id="ask-spiegel-input"
                      type="search"
                      name="ask-spiegel"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      autoComplete="off"
                      placeholder="Ask about NYC policy..."
                      disabled={loading}
                      className="font-work-sans min-w-0 flex-1 border-0 bg-transparent pb-0 pt-0 text-[clamp(15px,2.8cqw,18px)] font-medium tracking-[0.04em] text-slate-900 placeholder:text-[0.95rem] placeholder:text-slate-500/90 placeholder:font-normal focus:outline-none focus:ring-0 enabled:cursor-text disabled:opacity-60 dark:text-[var(--foreground)] dark:placeholder:text-[var(--muted)]"
                    />
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      aria-label={loading ? "Sending" : "Run query"}
                      className="command-submit box-border flex aspect-square h-[clamp(2rem,calc(100cqh-22px),2.75rem)] w-[clamp(2rem,calc(100cqh-22px),2.75rem)] shrink-0 items-center justify-center rounded-[1.05rem] bg-[var(--accent-mid)] p-1 text-slate-50 shadow-[0_14px_24px_-14px_rgba(230,57,70,0.7)] transition-all duration-300 ease-out hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/85 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--accent-mid)] disabled:pointer-events-none disabled:opacity-50 sm:p-1.5 sm:rounded-[1.1rem] md:rounded-[1.15rem]"
                    >
                      <span className="sr-only">{loading ? "Sending…" : "Run query"}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="block h-[clamp(0.8rem,calc(0.26 * 100cqh - 4px),1.05rem)] w-[clamp(0.8rem,calc(0.26 * 100cqh - 4px),1.05rem)] shrink-0"
                        aria-hidden
                      >
                        <path d="M5 12h13" strokeLinecap="round" />
                        <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </form>
              </footer>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {launcherMounted && !isOpen ? (
        <div className="fixed bottom-6 right-5 z-[120] sm:bottom-8 sm:right-8">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 rounded-full border border-white/45 bg-[linear-gradient(135deg,rgba(26,54,93,0.96)_0%,#1a3f6d_48%,#163a66_100%)] py-3 pl-5 pr-5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset,0_6px_28px_-10px_rgba(26,54,93,0.55),0_18px_48px_-16px_rgba(168,218,220,0.38)] transition-[padding,box-shadow,transform] duration-300 ease-out hover:scale-[1.045] hover:px-7 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.22)_inset,0_10px_36px_-12px_rgba(26,54,93,0.62),0_22px_56px_-18px_rgba(168,218,220,0.42)] active:scale-[0.98] dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,#1c2530_0%,#141a22_48%,#0f141a_100%)] dark:text-[var(--foreground)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_40px_-16px_rgba(0,0,0,0.55)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_48px_-12px_rgba(0,0,0,0.6)]"
            aria-label="Open Ask Spiegel"
          >
            <Sparkles className="h-5 w-5 shrink-0 opacity-95" strokeWidth={1.75} aria-hidden />
            <span className="font-work-sans text-sm font-semibold tracking-wide">Ask Spiegel</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
