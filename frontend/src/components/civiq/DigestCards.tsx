"use client";

import { motion } from "framer-motion";
import { ExternalLink, Clock, ArrowRight } from "lucide-react";
import { POLICY_AREAS, timeAgo } from "@/lib/policyMetadata";
import type { PolicyBriefing } from "@/lib/api";

type Props = {
    policies: PolicyBriefing[];
    loading: boolean;
    onCardClick: (policy: PolicyBriefing) => void;
};

function getAreaMeta(tags: string[] | undefined) {
    if (!tags?.length) return POLICY_AREAS[0];
    for (const tag of tags) {
        const found = POLICY_AREAS.find(a =>
            a.id.toLowerCase() === tag.toLowerCase() ||
            a.keywords.some(k => tag.toLowerCase().includes(k))
        );
        if (found && found.id !== "All") return found;
    }
    return POLICY_AREAS[0];
}

function sourceLabel(type: string): string {
    const map: Record<string, string> = {
        "NYC Council Legistar": "NYC Council",
        "NYS Legislation": "NY State",
        "NYS Senate Transcript": "NY Senate",
        "NYC Council Meeting Record": "NYC Meeting",
        "Land Use Application": "Land Use",
        "Oversight Hearing": "Hearing",
    };
    return map[type] ?? type ?? "Record";
}

export function DigestCards({ policies, loading, onCardClick }: Props) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-[var(--surface-card)]/50 p-4 h-32" />
                ))}
            </div>
        );
    }

    if (!policies.length) return null;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="font-work-sans text-[9px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">
                    Recently indexed · {policies.length} records
                </p>
                <p className="text-[10px] text-[var(--muted)]">Click any card to ask about it</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {policies.slice(0, 6).map((policy, i) => {
                    const area = getAreaMeta(policy.topic_tags);
                    const impact = policy.impact?.trim();
                    const affects = policy.affects?.trim();
                    const subtitle = impact || affects || "";

                    return (
                        <motion.button
                            key={policy.id}
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            onClick={() => onCardClick(policy)}
                            className="group text-left rounded-2xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 backdrop-blur-sm p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col gap-2.5"
                        >
                            {/* Area tag + source */}
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border"
                                    style={{
                                        color: area.color,
                                        background: `${area.color}12`,
                                        borderColor: `${area.color}30`,
                                    }}
                                >
                                    <area.Icon className="h-2.5 w-2.5" />
                                    {area.label.split(" ").slice(0, 2).join(" ")}
                                </span>
                                <span className="text-[8px] font-semibold text-[var(--muted)] shrink-0">
                                    {sourceLabel(policy.source_type)}
                                </span>
                            </div>

                            {/* Title */}
                            <p className="text-[13.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100 line-clamp-2 flex-1">
                                {policy.title}
                            </p>

                            {/* Impact line */}
                            {subtitle && (
                                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {subtitle}
                                </p>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-auto pt-1">
                                <span className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
                                    <Clock className="h-2.5 w-2.5" />
                                    {policy.published_date ? timeAgo(policy.published_date) : "—"}
                                </span>
                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ask about this <ArrowRight className="h-2.5 w-2.5" />
                                </span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}