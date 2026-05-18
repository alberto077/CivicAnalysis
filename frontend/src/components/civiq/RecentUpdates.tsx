"use client";

import { useMemo } from "react";
import { ExternalLink, Newspaper, Clock, Tag } from "lucide-react";
import { type PolicyBriefing } from "@/lib/api";
import { MotionReveal } from "./MotionReveal";
import { srcColor, timeAgo } from "@/lib/policyMetadata";

type Props = {
  policies: PolicyBriefing[];
  policiesLoading: boolean;
  policiesError: string | null;
};

export function RecentUpdates({ policies, policiesLoading, policiesError }: Props) {
  const sorted = useMemo(
    () => [...policies]
      .sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
      .slice(0, 20),
    [policies],
  );

  return (
    <MotionReveal>
      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Newspaper className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <div>
              <p className="font-work-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Live feed</p>
              <h2 className="font-limelight text-lg font-semibold tracking-tight text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] leading-tight">
                Recent Updates
              </h2>
            </div>
          </div>
          {!policiesLoading && !policiesError && sorted.length > 0 && (
            <span className="text-[11px] font-bold text-[var(--muted)] tabular-nums">
              {sorted.length} record{sorted.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {policiesLoading && (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-700/50" />
                  <div className="h-3 w-10 rounded bg-slate-200/50 dark:bg-slate-700/30 ml-auto" />
                </div>
                <div className="h-4 w-4/5 rounded bg-slate-200/70 dark:bg-slate-700/50 mb-1.5" />
                <div className="h-3 w-3/5 rounded bg-slate-200/50 dark:bg-slate-700/30" />
              </div>
            ))}
          </div>
        )}

        {!policiesLoading && policiesError && (
          <div className="rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200" role="alert">
            <p className="font-semibold">Could not load recent updates.</p>
            <p className="mt-0.5 text-[13px] opacity-80">{policiesError}</p>
          </div>
        )}

        {!policiesLoading && !policiesError && !sorted.length && (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40">
            <Newspaper className="h-5 w-5 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-[13px] font-semibold text-[var(--foreground)]">No records yet</p>
            <p className="text-[11px] text-[var(--muted)] mt-1 max-w-[200px] leading-relaxed">
              Adjust the location or timeframe filters to see recent civic activity.
            </p>
          </div>
        )}

        {!policiesLoading && !policiesError && sorted.length > 0 && (
          <div className="space-y-2.5">
            {sorted.map((policy) => {
              const color = srcColor(policy.source_type);
              return (
                <div key={policy.id}
                  className="group relative rounded-2xl border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 backdrop-blur-md px-4 py-3.5 hover:bg-white/80 dark:hover:bg-[var(--surface-card)]/75 hover:shadow-sm transition-all">
                  <div className="absolute left-0 inset-y-3.5 w-[3px] rounded-full" style={{ background: color }} />
                  <div className="pl-3">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {policy.source_type && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border"
                          style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
                          <Tag className="h-2 w-2" />{policy.source_type}
                        </span>
                      )}
                      {policy.published_date && (
                        <span className="flex items-center gap-0.5 text-[9px] text-[var(--muted)] tabular-nums ml-auto">
                          <Clock className="h-2 w-2" />{timeAgo(policy.published_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2 mb-1">
                      {policy.title}
                    </p>
                    {policy.impact && (
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed line-clamp-1 mb-1.5 italic">
                        {policy.impact}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {(policy.topic_tags ?? []).slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[8px] font-bold uppercase tracking-wider text-[var(--muted)] bg-slate-100 dark:bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {policy.source_url && policy.source_url !== "#" && (
                        <a href={policy.source_url} target="_blank" rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-0.5 text-[9px] font-bold text-[var(--accent)] hover:underline">
                          View record <ExternalLink className="h-2 w-2" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </MotionReveal>
  );
}