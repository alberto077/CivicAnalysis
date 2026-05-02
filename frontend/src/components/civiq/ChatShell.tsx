"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Header } from "@/components/civiq/Header";
import { SiteFooter } from "@/components/civiq/SiteFooter";
import {
  sendOpenAiChat,
  type OpenAiChatMessage,
} from "@/lib/api";

const assistantMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--accent)] underline underline-offset-2"
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
        <code className="my-2 block overflow-x-auto rounded-lg bg-black/5 p-2 text-[0.9em]">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-black/10 px-1 py-0.5 text-[0.9em]">{children}</code>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--border)] pl-3 text-[var(--muted)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-[var(--border)]" />,
  h1: ({ children }) => (
    <h3 className="font-limelight mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="font-limelight mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="font-limelight mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
  ),
};

const SYSTEM_PROMPT =
  `
    You are a highly informed NYC housing policy assistant.

    Your job is to give clear, direct, and useful answers about NYC housing policies.

    Rules:
    - Do NOT say "I can't access latest data" or similar disclaimers
    - Do NOT redirect users to websites unless explicitly asked
    - Always provide the best possible answer using available knowledge
    - If the question is about recent changes, summarize the most likely or widely reported updates
    - Be specific, practical, and concise
    - Focus on what the policy means for real people (renters, homeowners, etc.)

    When unsure:
    - Give the most reasonable and relevant answer
    - Clearly say "As of recent updates" instead of refusing

    Tone:
    - Confident
    - Clear
    - No fluff
    Keep responses concise and scannable:

  - Max 4 bullet points
  - Each bullet = 1–2 sentences max
  - Add a short “What this means” line at the end (1 sentence)
  - No long paragraphs
  - No filler or disclaimers

  Always tailor answers to the user's situation if specified.

  If the user mentions a group (e.g., college student, renter, low-income, etc.):
  - Prioritize advice specifically relevant to that group
  - Avoid generic advice that applies to everyone
  - Focus on concrete ways they can benefit or take action

  Do not repeat general information unless it directly helps answer the question.
  `;

export function ChatShell() {
  const [messages, setMessages] = useState<OpenAiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInput = input.trim();
    if (!nextInput || isLoading) return;

    const userMessage: OpenAiChatMessage = { role: "user", content: nextInput };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const assistantReply = await sendOpenAiChat([
        { role: "system", content: SYSTEM_PROMPT },
        ...nextMessages,
      ]);

      setMessages((prev) => [...prev, assistantReply]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to get a response right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div
        className="ambient-orb -top-24 -left-20 h-72 w-72 bg-[rgba(168,218,220,0.28)]"
        aria-hidden
      />
      <div
        className="ambient-orb top-[28%] -right-24 h-80 w-80 bg-[rgba(230,57,70,0.12)]"
        aria-hidden
      />

      <Header />
      <main className="relative z-10 flex-1">
        <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="font-limelight text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Civic Chat
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Ask civic questions and follow up in the same conversation.
            </p>
          </div>

          <div className="glass-card flex min-h-[420px] flex-1 flex-col p-4 sm:p-6">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Start with a question like: What are the latest housing policy changes in NYC?
                </p>
              ) : (
                messages
                  .filter((msg) => msg.role !== "system")
                  .map((msg, idx) => (
                    <div
                      key={`${msg.role}-${idx}`}
                      className={`max-w-[90%] min-w-0 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "ml-auto bg-[var(--accent)] text-white"
                          : "bg-white/80 text-[var(--foreground)] [&_a]:text-[var(--accent)]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        msg.content
                      ) : (
                        <div className="break-words">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={assistantMarkdownComponents}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))
              )}

              {isLoading ? (
                <div className="max-w-[90%] rounded-xl bg-white/80 px-4 py-3 text-sm text-[var(--muted)]">
                  Thinking...
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your civic question..."
                className="min-h-12 flex-1 resize-y rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-0 transition focus:border-[var(--accent)]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="btn-premium h-fit disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
