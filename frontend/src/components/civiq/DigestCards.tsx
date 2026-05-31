"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Clock, ArrowRight } from "lucide-react";
import { POLICY_AREAS, timeAgo } from "@/lib/policyMetadata";
import { checkHealth, type PolicyBriefing } from "@/lib/api";

type Props = {
    policies: PolicyBriefing[];
    loading: boolean;
    onCardClick: (policy: PolicyBriefing) => void;
};

// match POLICY_AREAS for records from topic_tags and title/impact text
export function getAreaMetas(policy: PolicyBriefing) {
    const tags = policy.topic_tags ?? [];
    const haystack = [
        ...tags,
        policy.title ?? "",
        policy.impact ?? "",
        policy.affects ?? "",
    ].map(s => s.toLowerCase());

    const matches = POLICY_AREAS.filter(a => {
        if (a.id === "All") return false;
        return a.keywords.some(k => haystack.some(h => h.includes(k.toLowerCase())));
    });

    // deduplicate by id and cap at 3 to keep cards compact
    const seen = new Set<string>();
    const out = matches.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
    return out.length ? out.slice(0, 3) : [];
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
    const [totalRecords, setTotalRecords] = useState<number | null>(null);

    useEffect(() => {
        checkHealth().then(res => {
            if (res.total_records) setTotalRecords(res.total_records);
        }).catch(console.error);
    }, []);

    if (loading) {
        return (
            <div className="flex overflow-x-auto gap-3 pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="animate-pulse flex-none w-[280px] sm:w-[320px] rounded-2xl border border-[var(--border)] bg-white/50 dark:bg-[var(--surface-card)]/50 p-4 h-36 snap-start" />
                ))}
            </div>
        );
    }

    if (!policies.length) return null;

    // always show up to 6 most recent cards
    const displayPolicies = policies.slice(0, 6);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="font-work-sans text-[9px] font-black uppercase tracking-[0.22em] text-[var(--muted)]">
                    Recently indexed · {policies.length} records {totalRecords ? `· ${totalRecords.toLocaleString()} total` : ""}
                </p>
                <p className="text-[10px] text-[var(--muted)]">Click any card to ask about it</p>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-4 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {displayPolicies.map((policy, i) => {
                    const areas = getAreaMetas(policy);
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
                            className="group flex-none w-[280px] sm:w-[320px] snap-start text-left rounded-2xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 backdrop-blur-sm p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 flex flex-col gap-2"
                        >
                            {/* Area tag + source */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                    {areas.length > 0 ? areas.map(area => (
                                        <span
                                            key={area.id}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border flex-shrink-0"
                                            style={{
                                                color: area.color,
                                                background: `${area.color}12`,
                                                borderColor: `${area.color}30`,
                                            }}
                                        >
                                            <area.Icon className="h-2.5 w-2.5" />
                                            {area.label.split(" ").slice(0, 2).join(" ")}
                                        </span>
                                    )) : (
                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/4">
                                            Policy
                                        </span>
                                    )}
                                </div>
                                <span className="text-[8px] font-semibold text-[var(--muted)] shrink-0 pt-0.5">
                                    {sourceLabel(policy.source_type)}
                                </span>
                            </div>

                            {/* Title */}
                            <p className="text-[13.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100 line-clamp-2 flex-1">
                                {policy.title}
                            </p>

                            {/* Impact line */}
                            {subtitle && (
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
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