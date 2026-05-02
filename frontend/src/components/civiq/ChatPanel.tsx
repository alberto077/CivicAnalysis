"use client";

import { useState, useEffect } from "react";
import { sendChat, type PolicyResponse } from "@/lib/api";
import { Sparkles, Send, MessageSquare, UserCircle2, Globe2 } from "lucide-react";
import { useProfile } from "@/lib/useProfile";

type ChatPanelProps = {
  briefingQuery?: string;
  borough?: string;
  selectedArea?: string;
  selectedTime?: string;
  isStandalone?: boolean;
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
    <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-sm transition hover:shadow-md">
      <h3 className="font-limelight mb-4 text-xs font-bold tracking-[0.2em] text-[var(--accent)] uppercase">
        {title}
      </h3>
      <ul className="space-y-3 text-[15px] text-slate-800 leading-relaxed">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-3">
            <span className="shrink-0 text-[var(--accent)]">•</span>
            <span>{item}</span>
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

  const sources = Array.isArray(response?.sources)
    ? response.sources.map(normalizeSource)
    : [];

  const hasContent =
    !!response?.at_a_glance?.length ||
    !!response?.key_takeaways?.length ||
    !!response?.what_this_means?.length ||
    !!response?.relevant_actions?.length;

  return (
    <section className={`mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8 ${isStandalone ? "pt-12" : "mt-8"}`}>
      <div className="rounded-[40px] border border-white/60 bg-white/40 p-8 shadow-2xl backdrop-blur-xl md:p-12">
        <div className="flex items-center gap-3 mb-6">
           <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg">
             <MessageSquare className="h-5 w-5" />
           </div>
           <div>
              <h2 className="font-limelight text-3xl font-bold tracking-tight text-slate-900">
                {isStandalone ? "Policy AI Explorer" : "Briefing Assistant"}
              </h2>
              <p className="text-slate-600 text-sm">
                {isStandalone 
                  ? "Ask anything about NYC policy, legislation, or city services." 
                  : `Deeper insights for "${briefingQuery}"`}
              </p>
           </div>
        </div>

        {/* Personalization Toggle */}
        <div className="flex items-center gap-3 mb-6 bg-slate-50 border border-slate-100 p-2 rounded-2xl w-fit">
          <button
            onClick={() => setIsPersonalized(false)}
            className={`font-work-sans flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isPersonalized
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
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
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
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
              className="font-work-sans rounded-full border border-slate-200 bg-white shadow-sm px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-[var(--accent-soft)] hover:text-[var(--accent)] transition-all"
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
              className="w-full h-14 pl-5 pr-14 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-inner outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
            />
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${message.trim() ? "text-[var(--accent)]" : "text-slate-300"}`}>
               <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <button
            onClick={handleAsk}
            disabled={loading || !message.trim()}
            className="h-14 aspect-square flex items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-40"
          >
            {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-5 w-5" />}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 italic">
            {error}
          </div>
        )}

        {lastQuestion && !loading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <span className="font-work-sans font-semibold uppercase tracking-tighter text-[10px]">Previously:</span>
            <span className="font-medium italic">&quot;{lastQuestion}&quot;</span>
          </div>
        )}

        {response && (
          <div className="mt-12 space-y-6">
            {!hasContent ? (
              <div className="rounded-3xl border border-amber-100 bg-amber-50 p-8 text-center text-amber-900">
                 <p className="font-medium">No specific policy facts found for this query.</p>
                 <p className="mt-1 text-sm opacity-80">Try asking about recent legislation, borough programs, or city council actions.</p>
              </div>
            ) : (
              <>
                <Section title="Synthesis" items={response.at_a_glance} />
                <Section title="Strategic Analysis" items={response.key_takeaways} />
                <Section title="Your Local Impact" items={response.what_this_means} />
                <Section title="Recommended Steps" items={response.relevant_actions} />

                {sources.length > 0 && (
                  <div className="rounded-[32px] border border-white/60 bg-white/80 p-8 shadow-sm">
                    <h3 className="font-limelight mb-4 text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                      Evidence Library
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sources.map((source, index) => (
                        <div key={index} className="rounded-2xl border border-slate-100 bg-white p-5 transition hover:border-[var(--accent-soft)]">
                          <div className="font-bold text-slate-900 text-sm mb-1">{source.title}</div>
                          {source.description && (
                            <div className="text-[13px] text-slate-600 leading-relaxed italic">{source.description}</div>
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