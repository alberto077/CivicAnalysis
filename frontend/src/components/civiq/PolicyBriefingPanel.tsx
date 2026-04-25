"use client";
import Image from "next/image";

import {
  FileText,
  Globe2,
  Lightbulb,
  ListChecks,
  Users,
  Share2,
  Download
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MotionReveal } from "./MotionReveal";
import type { PolicyResponse } from "@/lib/api";

type PolicyBriefingPanelProps = {
  loading: boolean;
  error: string | null;
  response: PolicyResponse | null;
  briefingQuery: string;
};

export function PolicyBriefingPanel({
  loading,
  error,
  response,
  briefingQuery,
}: PolicyBriefingPanelProps) {
  const skylineGifSrc = "/skyline.gif";
  const emptyStateRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadSkyline, setShouldLoadSkyline] = useState(false);
  const showBriefing = Boolean(response && !loading);
  const safe = {
    at_a_glance: response?.at_a_glance ?? [],
    key_takeaways: response?.key_takeaways ?? [],
    what_this_means: response?.what_this_means ?? [],
    relevant_actions: response?.relevant_actions ?? [],
    sources: response?.sources ?? [],
  };

  const structuredSections = [
    {
      key: "key_takeaways",
      title: "Key takeaways",
      items: safe.key_takeaways,
      Icon: Lightbulb,
    },
    {
      key: "what_this_means",
      title: "What this means for you",
      items: safe.what_this_means,
      Icon: Users,
    },
    {
      key: "relevant_actions",
      title: "Relevant actions",
      items: safe.relevant_actions,
      Icon: ListChecks,
    },
  ] as const;

  useEffect(() => {
    if (loading || showBriefing || shouldLoadSkyline) return;
    const target = emptyStateRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoadSkyline(true);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, showBriefing, shouldLoadSkyline]);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {error ? (
        <div
          className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-[0_4px_20px_-8px_rgba(180,40,40,0.12)] backdrop-blur-sm"
          role="alert"
        >
          <span className="font-semibold">Policy data unavailable. </span>
          <span className="font-normal">{error}</span>
        </div>
      ) : null}

      <MotionReveal className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900">
            {showBriefing ? "Live Policy Briefing" : "Neighborhood Intel"}
          </h2>
          {showBriefing && (
            <p className="mt-3 max-w-2xl text-[15px] text-slate-500">
              Personalized analysis for: <span className="font-bold text-slate-900">&quot;{briefingQuery}&quot;</span>
            </p>
          )}
        </div>

        {showBriefing && (
          <div className="flex gap-2">
            <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm">
              <Share2 className="h-4 w-4" />
            </button>
            <button className="h-10 px-4 flex items-center gap-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition shadow-md">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        )}
      </MotionReveal>

      <MotionReveal className="mt-10">
        <div className="glass-card-strong lift-card rounded-[3rem] p-8 sm:p-12 border border-white/60 bg-white/40 shadow-2xl backdrop-blur-2xl">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-[400px] flex-col items-center justify-center gap-6 py-12 text-center"
              >
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent shadow-xl" />
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900">
                    Generating Intelligent Briefing...
                  </p>
                  <p className="mt-2 text-slate-500">
                    Scanning city records and cross-referencing neighborhood impacts.
                  </p>
                </div>
              </motion.div>
            ) : showBriefing ? (
              <motion.div
                key="briefing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-12"
              >
                <div className="border-b border-slate-200 pb-10">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg">
                      <FileText className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">
                      Policy Synthesis
                    </h3>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safe.at_a_glance.map((item, index) => (
                      <li key={`glance-${index}`} className="flex gap-3 bg-white/50 p-4 rounded-2xl border border-white shadow-sm transition hover:shadow-md">
                        <span className="shrink-0 text-[var(--accent)] font-bold">•</span>
                        <span className="text-[15px] leading-relaxed text-slate-800">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {structuredSections.map((s) => (
                    <div key={s.title} className="flex flex-col">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
                          <s.Icon className="h-[1.125rem] w-[1.125rem]" />
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                          {s.title}
                        </h3>
                      </div>
                      <ul className="space-y-4">
                        {s.items.map((item, itemIndex) => (
                          <li key={`${s.key}-${itemIndex}`} className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                            <span className="text-[var(--accent)] font-bold">»</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {safe.sources.length > 0 && (
                  <div className="border-t border-slate-200 pt-10">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <Globe2 className="h-5 w-5" />
                      </span>
                      <h3 className="text-[15px] font-bold uppercase tracking-widest text-slate-400">
                        Evidence & Sources
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {safe.sources.map((source, i) => (
                        <div key={i} className="rounded-2xl border border-slate-100 bg-white/50 p-4 transition hover:border-indigo-200">
                          <p className="font-bold text-slate-900 text-sm">{source.title}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-500 italic">
                            {source.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                ref={emptyStateRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-center py-12"
              >
                {shouldLoadSkyline ? (
                  <div className="relative h-[420px] w-full max-w-[1200px] md:h-[560px]">
                    <Image
                      src={skylineGifSrc}
                      alt="Animated NYC Skyline"
                      fill
                      sizes="(max-width: 768px) 100vw, 1200px"
                      className="rounded-[2.5rem] object-cover shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] transition duration-700"
                    />
                  </div>
                ) : (
                  <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem]">
                    <p className="text-2xl font-display font-bold text-slate-300">
                      Generating Intelligent Briefing...
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionReveal>
    </section>
  );
}
