"use client";

import { useState, useEffect, useMemo } from "react";
import { sendChat, type PolicyResponse } from "@/lib/api";
import { buildBriefingSourceCards } from "@/lib/policy-reply";
import { BriefingInline } from "./BriefingInline";
import { Sparkles, Send, MessageSquare, UserCircle2, Globe2, ExternalLink } from "lucide-react";
import { useProfile } from "@/lib/useProfile";

type ChatPanelProps = {
  briefingQuery?: string;
  borough?: string;
  selectedArea?: string;
  selectedTime?: string;
  isStandalone?: boolean;
};

function Section({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-sm transition hover:shadow-md dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]">
      <h3 className="font-limelight mb-4 text-xs font-bold tracking-[0.2em] text-[var(--accent)] uppercase">
        {title}
      </h3>
      <ul className="space-y-3 text-[15px] leading-relaxed text-slate-800 dark:text-[#d8e6f2]">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3">
            <span className="shrink-0 text-[var(--accent)]">•</span>
            <span>
              <BriefingInline text={item} />
            </span>
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
  isStandalone = false,
}: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PolicyResponse | null>(null);
  const { profile, isLoaded } = useProfile();
  const [isPersonalized, setIsPersonalized] = useState(true);

  // Default to false if no profile is found
  useEffect(() => {
    if (isLoaded && !profile) {
      setIsPersonalized(false);
    }
  }, [isLoaded, profile]);

  const handleAsk = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const lower = trimmed.toLowerCase();
      let fullQuery = "";

      if (isStandalone) {
          fullQuery = trimmed;
      } else {
          // Context-aware follow-up
          if (lower.includes("summarize")) {
            fullQuery = `Summarize current briefing on ${briefingQuery}. ${trimmed}`;
          } else if (lower.includes("sources")) {
            fullQuery = `Which sources support the briefing on ${briefingQuery}?`;
          } else {
            // Keep the query clean for vector search, only append the main topic
            fullQuery = `[Focus Topic: ${briefingQuery}] ${trimmed}`;
          }
      }

      // Extract ZIP for direct filter if present
      const zipMatch = trimmed.match(/\b\d{5}\b/);
      
      const effectiveBorough = borough && borough !== "All NYC" ? borough : (isPersonalized && profile?.borough ? profile.borough : undefined);

      const data = await sendChat(
        fullQuery,
        { 
          borough: effectiveBorough,
          zip: zipMatch ? zipMatch[0] : undefined,
          issue_area: selectedArea,
          timeframe: selectedTime,
          profile_active: isPersonalized ? "true" : "false"
        }
      );

      setLastQuestion(trimmed);
      setMessage("");
      setResponse(data);
    } catch (e) {
      console.error("Chat request failed:", e);
      setError(e instanceof Error ? e.message : "Unable to load chat response");
    } finally {
      setLoading(false);
    }
  };

  const sourceCards = useMemo(
    () =>
      response
        ? buildBriefingSourceCards(response.sources, response.retrieval_sources)
        : [],
    [response],
  );

  const hasContent =
    !!response?.tldr?.length ||
    !!response?.topic_tags?.length ||
    !!response?.what_happened?.length ||
    !!response?.why_it_matters?.length ||
    !!response?.whos_affected?.length ||
    !!response?.key_numbers?.length ||
    !!response?.what_happens_next?.length ||
    !!response?.read_more?.length ||
    !!response?.at_a_glance?.length ||
    !!response?.key_takeaways?.length ||
    !!response?.what_this_means?.length ||
    !!response?.relevant_actions?.length ||
    sourceCards.length > 0;

  return (
    <section className={`mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8 ${isStandalone ? "pt-12" : "mt-8"}`}>
      <div className="rounded-[40px] border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl dark:border-[var(--border)] dark:bg-[var(--surface-card)]/85 md:p-12">
        <div className="flex items-center gap-3 mb-6">
           <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
             <MessageSquare className="h-4 w-4" />
           </div>
           <div>
              <h2 className="font-limelight text-3xl font-bold tracking-tight text-slate-900 dark:text-[var(--foreground)]">
                {isStandalone ? "Policy AI Explorer" : "Briefing Assistant"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-[var(--foreground-secondary)]">
                {isStandalone 
                  ? "Ask anything about NYC policy, legislation, or city services." 
                  : `Deeper insights for "${briefingQuery}"`}
              </p>
           </div>
        </div>

        {/* Personalization Toggle */}
        <div className="mb-6 flex w-fit items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]">
          <button
            onClick={() => setIsPersonalized(false)}
            className={`font-work-sans flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isPersonalized
                ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[var(--foreground)]"
                : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-700 dark:text-[var(--foreground-secondary)] dark:hover:bg-[var(--surface-card)] dark:hover:text-[var(--foreground)]"
            }`}
          >
            <Globe2 className="h-4 w-4" />
            General Info
          </button>
          <button
            onClick={() => setIsPersonalized(true)}
            className={`font-work-sans flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isPersonalized
                ? "bg-[var(--accent)] text-white shadow-sm border border-[var(--accent-soft)]"
                : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-700 dark:text-[var(--foreground-secondary)] dark:hover:bg-[var(--surface-card)] dark:hover:text-[var(--foreground)]"
            }`}
          >
            <UserCircle2 className="h-4 w-4" />
            Personalized for You
            {profile?.borough && isPersonalized && (
               <span className="ml-1 opacity-70 font-normal">({profile.borough})</span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(isStandalone 
            ? ["What are the new rules for e-bikes?", "How to apply for affordable housing?", "Recent transit changes in Brooklyn?"]
            : ["Summarize in simple terms.", "What should I do next?", "Which sources support this?"]
          ).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setMessage(prompt)}
              className="font-work-sans rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-[var(--accent-soft)] hover:text-[var(--accent)] dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground-secondary)] dark:hover:text-[var(--accent-soft)]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
             <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleAsk()}
              placeholder={isStandalone ? "Ask a policy question..." : "Ask a follow-up..."}
              className="font-work-sans h-14 w-full rounded-2xl border border-slate-200 bg-white pl-5 pr-14 text-sm font-normal text-slate-900 shadow-inner outline-none transition-all focus:ring-2 focus:ring-[var(--accent-soft)] dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)]"
            />
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${message.trim() ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-slate-300 dark:text-[var(--muted)]"}`}>
               <Sparkles className="h-4 w-4" />
            </div>
          </div>

          <button
            onClick={handleAsk}
            disabled={loading || !message.trim()}
            className="flex aspect-square h-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40 dark:bg-[var(--accent-mid)] dark:hover:bg-[var(--accent)]"
          >
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm italic text-red-700 dark:border-red-900/35 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        )}

        {lastQuestion && !loading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400 dark:text-[var(--foreground-secondary)]">
            <span className="font-work-sans font-semibold uppercase tracking-tighter text-[10px]">Previously:</span>
            <span className="font-medium italic">&quot;{lastQuestion}&quot;</span>
          </div>
        )}

        {response && (
          <div className="mt-12 space-y-6">
            {!hasContent ? (
              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-8 text-center text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/35 dark:text-amber-100">
                 <p className="font-work-sans font-medium">No specific policy facts found for this query.</p>
                 <p className="font-work-sans mt-1 text-sm font-normal opacity-80">Try asking about recent legislation, borough programs, or city council actions.</p>
              </div>
            ) : (
              <>
                {response.tldr && response.tldr.length > 0 && (
                  <div className="rounded-3xl border border-white/60 bg-gradient-to-br from-white to-slate-50/90 p-6 shadow-sm dark:border-[var(--border)] dark:from-[var(--surface-elevated)] dark:to-[var(--surface-card)]">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[var(--foreground-secondary)]">
                      TL;DR
                    </p>
                    <div className="space-y-1.5 text-[15px] font-medium leading-snug text-slate-900 dark:text-white">
                      {response.tldr.map((line, i) => (
                        <p key={`chat-tldr-${i}`}>
                          <BriefingInline text={line} />
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {response.topic_tags && response.topic_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {response.topic_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[#b8c8dc]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <Section title="What happened" items={response.what_happened} />
                <Section title="Why it matters" items={response.why_it_matters} />
                <Section title="Who's affected" items={response.whos_affected} />
                <Section title="Key numbers" items={response.key_numbers} />
                <Section title="What happens next" items={response.what_happens_next} />

                {response.read_more && response.read_more.length > 0 && (
                  <details className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]/80">
                    <summary className="cursor-pointer font-work-sans text-sm font-semibold text-slate-800 outline-none dark:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
                      Read more
                    </summary>
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-[14px] leading-relaxed text-slate-700 dark:border-[var(--border)] dark:text-[#c8d4e0]">
                      {response.read_more.map((item, i) => (
                        <li key={`chat-rm-${i}`}>
                          <BriefingInline text={item} />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {sourceCards.length > 0 && (
                  <div className="rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-limelight text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-[var(--muted)]">
                        Evidence library
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[var(--foreground-secondary)]">
                        {sourceCards.length} {sourceCards.length === 1 ? "source" : "sources"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {sourceCards.map((card, index) => (
                        <div
                          key={`${card.url ?? "nourl"}-${card.title}-${index}`}
                          className="rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-[var(--accent-soft)] dark:border-[var(--border)] dark:bg-[var(--surface-card)]"
                        >
                          <div className="mb-1 text-sm font-bold text-slate-900 dark:text-[var(--foreground)]">
                            {card.title}
                          </div>
                          {card.source_type ? (
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[var(--muted)]">
                              {card.source_type}
                            </p>
                          ) : null}
                          <div className="text-[13px] leading-relaxed text-slate-600 dark:text-[#dce8f4]">
                            <BriefingInline text={card.description} />
                          </div>
                          {card.url ? (
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              Open official record
                            </a>
                          ) : (
                            <p className="mt-3 text-[11px] text-slate-400 dark:text-[var(--foreground-secondary)]">
                              No indexed URL for this item.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}