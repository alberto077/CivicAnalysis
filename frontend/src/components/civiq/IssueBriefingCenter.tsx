"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, ChevronDown, ChevronRight, ExternalLink,
    RefreshCw, Clock, AlertCircle, Globe2, Newspaper,
} from "lucide-react";
import { type CivicProfile } from "@/lib/useProfile";
import { POLICY_AREAS, getPolicyAreaMetadata, srcColor, timeAgo } from "@/lib/policyMetadata";
import { normalizePolicyReply, parseRetrievalSourcesEnvelope, type PolicyResponse } from "@/lib/policy-reply";
import { BriefingInline } from "./BriefingInline";


type AreaCard = {
    id: string;
    label: string;
    slug: string;
    color: string;
    Icon: any;
    isPersonalized: boolean;
    briefing: PolicyResponse | null;
    loading: boolean;
    error: string | null;
};

type Props = {
    profile: CivicProfile | null;
    isPersonalized: boolean;
    selectedArea: string;
    setSelectedArea: (v: string) => void;
};


const AREA_SLUG_MAP: Record<string, string> = {
    "Housing and Community Development": "housing",
    "Education": "education",
    "Transportation and Public Works": "transit",
    "Environmental Protection": "environment",
    "Health": "health",
    "Crime and Law Enforcement": "policing",
    "Immigration": "immigration",
    "Economics and Public Finance": "budget",
    "Labor and Employment": "labor",
    "Government Operations and Politics": "government",
    "Civil Rights and Liberties, Minority Issues": "civil-rights",
    "Families": "families",
    "Science, Technology, Communications": "technology",
    "Social Welfare": "social-welfare",
    "Taxation": "taxation",
    "Commerce": "commerce",
    "Arts, Culture, Religion": "arts-culture-religion",
    "Energy": "energy",
    "International Affairs": "international-affairs",
    "Emergency Management": "emergency-management",
    "Public Lands and Natural Resources": "public-lands-and-natural-resources",
    "Agriculture and Food": "agriculture-and-food",
    "Armed Forces and National Security": "armed-forces-and-national-security",
};

// Priority areas shown first when no profile
const PRIORITY_AREA_IDS = [
    "Housing and Community Development",
    "Transportation and Public Works",
    "Health",
    "Crime and Law Enforcement",
    "Education",
    "Environmental Protection",
    "Economics and Public Finance",
    "Immigration",
];

function buildBriefingQuery(areaId: string, profile: CivicProfile | null, personalized: boolean): string {
    const area = areaId === "All" ? "all NYC policy areas" : areaId;
    let q = `What are the most important recent developments in ${area} for NYC residents? Summarize what happened, why it matters, who is affected, and what comes next.`;
    if (personalized && profile) {
        const parts: string[] = [];
        if (profile.borough) parts.push(`living in ${profile.borough}`);
        const housing = (profile as any).housing;
        if (housing) parts.push(housing.toLowerCase());
        const demos = (profile as any).demographics as string[] | undefined;
        if (demos?.length) parts.push(demos.join(", ").toLowerCase());
        if (parts.length) q += ` Focus on how this affects residents who are ${parts.join(", ")}.`;
    }
    return q;
}

function buildDemographics(profile: CivicProfile | null, personalized: boolean): Record<string, string> {
    if (!personalized || !profile) return {};
    const d: Record<string, string> = {};
    if (profile.borough?.trim()) d.borough = profile.borough.trim();
    if ((profile as any).housing?.trim()) d.housing = (profile as any).housing.trim();
    const issues = profile.issues?.map((s) => s.trim()).filter(Boolean) ?? [];
    if (issues.length) d.issues = issues.join(",");
    const tags = ((profile as any).demographics as string[] | undefined)?.map((s) => s.trim()).filter(Boolean) ?? [];
    if (tags.length) d.demographics = tags.join(",");
    if (Object.keys(d).length) d.profile_active = "true";
    return d;
}



async function fetchBriefingViaChat(
    areaId: string,
    profile: CivicProfile | null,
    personalized: boolean,
): Promise<PolicyResponse> {
    const query = buildBriefingQuery(areaId, profile, personalized);
    const demographics = buildDemographics(profile, personalized);

    const res = await fetch("/api/civic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, demographics, response_style: "structured" }),
        cache: "no-store",
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err.detail || err.error || `HTTP ${res.status}`);
    }

    const envelope = await res.json() as Record<string, unknown>;
    // envelope shape: { reply: {...}, retrieval_sources: [...], sources_used: N }
    const payload = "reply" in envelope ? envelope.reply : envelope;
    const normalized = normalizePolicyReply(payload);
    const retrieval_sources = parseRetrievalSourcesEnvelope(envelope, 12);
    const su = envelope.sources_used;
    return {
        ...normalized,
        retrieval_sources,
        sources_used: typeof su === "number" ? su : retrieval_sources.length,
    };
}

const SECTIONS = [
    { key: "what_happened" as const, label: "What happened", accent: "#3b82f6", bg: "bg-blue-50/50 dark:bg-blue-950/20", border: "border-blue-100 dark:border-blue-900/30" },
    { key: "why_it_matters" as const, label: "Why it matters", accent: "#f59e0b", bg: "bg-amber-50/50 dark:bg-amber-950/20", border: "border-amber-100 dark:border-amber-900/30" },
    { key: "whos_affected" as const, label: "Who's affected", accent: "#10b981", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/30" },
    { key: "what_happens_next" as const, label: "Take action", accent: "#8b5cf6", bg: "bg-violet-50/50 dark:bg-violet-950/20", border: "border-violet-100 dark:border-violet-900/30" },
];


function BriefingBody({ briefing, color }: { briefing: PolicyResponse; color: string }) {
    const [sourcesExpanded, setSourcesExpanded] = useState(false);
    const allSources = (() => {
        const seen = new Set<string>();
        const out: Array<{ title: string; url?: string; type?: string; date?: string; description?: string }> = [];

        for (const rs of briefing.retrieval_sources ?? []) {
            if (!rs.source_url || seen.has(rs.source_url)) continue;
            seen.add(rs.source_url);
            out.push({ title: rs.title, url: rs.source_url, type: rs.source_type, date: rs.published_date });
        }
        for (const s of briefing.sources ?? []) {
            const url = s.url;
            if (url && seen.has(url)) continue;
            if (url) seen.add(url);
            out.push({ title: s.title, url, type: s.source_type, date: s.published_date, description: s.description });
        }
        return out;
    })();

    const visibleSources = sourcesExpanded ? allSources : allSources.slice(0, 4);

    return (
        <div className="space-y-4 pt-2">
            {/* TL;DR */}
            {briefing.tldr?.length > 0 && (
                <div className="rounded-xl border border-slate-100 dark:border-[var(--border)] bg-slate-50/60 dark:bg-[var(--surface-elevated)]/40 p-4">
                    <p className="font-work-sans text-[8px] font-black uppercase tracking-[0.24em] text-[var(--muted)] mb-1.5">TL;DR</p>
                    {briefing.tldr.slice(0, 2).map((line, i) => (
                        <p key={i} className="text-[13px] font-bold leading-snug text-slate-900 dark:text-white mb-0.5 last:mb-0">
                            <BriefingInline text={line} />
                        </p>
                    ))}
                </div>
            )}

            {/* Topic tags */}
            {briefing.topic_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {briefing.topic_tags.map((tag) => (
                        <span key={tag} className="rounded border border-slate-200/80 dark:border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/70 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#c8d8ea]">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Key numbers */}
            {briefing.key_numbers?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {briefing.key_numbers.slice(0, 4).map((item, i) => {
                        const bold = item.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
                        const stat = item.match(/^((?:\$|€|£)?[\d,.]+(?:%|[KMB])?)\s*[—:–\-]\s+(.+)$/i);
                        const headline = bold ? bold[1] : stat ? stat[1] : item;
                        const caption = bold ? bold[2] : stat ? stat[2] : undefined;
                        return (
                            <div key={i} className="relative flex-1 min-w-[120px] rounded-xl border border-slate-200/80 dark:border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)] p-3 shadow-sm">
                                <div className="pointer-events-none absolute left-0 inset-y-2.5 w-[3px] rounded-full" style={{ background: color }} />
                                <div className="pl-2.5">
                                    <p className="text-[1rem] font-extrabold leading-tight tabular-nums text-slate-900 dark:text-white">{headline}</p>
                                    {caption && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-[#b8c8dc] line-clamp-2">{caption}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 2×2 section grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SECTIONS.map((sec) => {
                    const items = (briefing[sec.key] as string[] | undefined) ?? [];
                    if (!items.length) return null;
                    return (
                        <div key={sec.key} className={`rounded-xl border ${sec.border} ${sec.bg} p-3.5`}>
                            <p className="font-work-sans text-[7.5px] font-black uppercase tracking-[0.24em] mb-2 leading-none" style={{ color: sec.accent }}>
                                {sec.label}
                            </p>
                            <ul className="space-y-1.5">
                                {items.slice(0, 4).map((item, i) => (
                                    <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-slate-700 dark:text-[#d8e6f2]">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sec.accent }} />
                                        <span><BriefingInline text={item} /></span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {/* Sources */}
            {allSources.length > 0 && (
                <div className="border-t border-slate-100 dark:border-[var(--border)] pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Globe2 className="h-3.5 w-3.5 text-violet-500" />
                            <p className="font-work-sans text-[10px] font-bold text-slate-700 dark:text-white">Official sources</p>
                        </div>
                        <span className="text-[9px] font-bold text-[var(--muted)]">{allSources.length} source{allSources.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {visibleSources.map((src, i) => {
                            const c = srcColor(src.type ?? "");
                            return (
                                <div key={i} className="rounded-xl border border-slate-100 dark:border-[var(--border)] bg-white/70 dark:bg-[var(--surface-elevated)]/60 p-3">
                                    <div className="flex items-start gap-2 mb-1">
                                        <p className="flex-1 text-[11px] font-semibold leading-snug text-slate-900 dark:text-[var(--foreground)] line-clamp-2">{src.title}</p>
                                        {src.type && (
                                            <span className="shrink-0 rounded px-1 py-0.5 text-[7px] font-bold uppercase border"
                                                style={{ color: c, background: `${c}12`, borderColor: `${c}30` }}>
                                                {src.type}
                                            </span>
                                        )}
                                    </div>
                                    {src.date && <p className="text-[9px] text-slate-400 mb-1">{src.date}</p>}
                                    {src.description && (
                                        <p className="text-[10.5px] text-slate-600 dark:text-[#c8d8ea] line-clamp-2 mb-2">
                                            <BriefingInline text={src.description} />
                                        </p>
                                    )}
                                    {src.url ? (
                                        <a href={src.url} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[9.5px] font-bold hover:underline" style={{ color: c }}>
                                            <ExternalLink className="h-2.5 w-2.5" />
                                            {new URL(src.url).hostname.replace("www.", "")}
                                        </a>
                                    ) : (
                                        <p className="text-[9px] text-slate-400">No URL available</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {allSources.length > 4 && (
                        <button onClick={() => setSourcesExpanded(v => !v)}
                            className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline">
                            {sourcesExpanded
                                ? <><ChevronDown className="h-3 w-3 rotate-180" />Show fewer</>
                                : <><ChevronRight className="h-3 w-3" />Show {allSources.length - 4} more</>}
                        </button>
                    )}
                </div>
            )}

            {/* Sources count footer */}
            {briefing.sources_used > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                    <Clock className="h-2.5 w-2.5 text-slate-400" />
                    <p className="text-[9px] text-slate-400">
                        Generated from {briefing.sources_used} indexed record{briefing.sources_used !== 1 ? "s" : ""}
                    </p>
                </div>
            )}
        </div>
    );
}


// Individual area card

function AreaCard({ card, isExpanded, onToggle, onRefresh }: {
    card: AreaCard;
    isExpanded: boolean;
    onToggle: () => void;
    onRefresh: () => void;
}) {
    const { label, color, Icon, briefing, loading, error, isPersonalized } = card;
    const tldr = briefing?.tldr?.[0] ?? "";

    return (
        <motion.div layout
            className={`rounded-2xl border bg-white/80 dark:bg-[var(--surface-card)]/80 backdrop-blur-sm shadow-sm overflow-hidden transition-shadow hover:shadow-md ${isExpanded ? "border-2 col-span-full" : "border-[var(--border)]"
                }`}
            style={isExpanded ? { borderColor: `${color}60` } : undefined}
        >
            <button type="button" className="w-full text-left" onClick={onToggle}>
                <div className="h-1 w-full" style={{ background: color }} />
                <div className="flex items-start gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
                        style={{ background: `${color}15` }}>
                        <Icon className="h-4.5 w-4.5" style={{ color }} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-work-sans text-[13px] font-bold text-slate-900 dark:text-white leading-tight truncate">
                                {label}
                            </h3>
                            {isPersonalized && (
                                <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40">
                                    <Sparkles className="h-2 w-2" />For Me
                                </span>
                            )}
                        </div>

                        {/* Preview — tldr when not expanded */}
                        {!isExpanded && (
                            <div className="mt-0.5">
                                {loading ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: color }} />
                                        <span className="text-[11px] text-[var(--muted)]">Generating briefing…</span>
                                    </div>
                                ) : error ? (
                                    <p className="text-[11px] text-red-500 dark:text-red-400 line-clamp-1">
                                        {error.includes("busy") ? "AI busy — click to retry" : error}
                                    </p>
                                ) : tldr ? (
                                    <p className="text-[11.5px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                        <BriefingInline text={tldr} />
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-[var(--muted)]">Click to generate briefing</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2 mt-0.5">
                        {briefing && !loading && (
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                                className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Refresh briefing">
                                <RefreshCw className="h-3 w-3" />
                            </button>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                </div>
            </button>

            {/* Expanded body */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div key="body"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden">
                        <div className="px-4 pb-5 border-t border-slate-100 dark:border-[var(--border)]">
                            {loading ? (
                                <div className="py-8 flex flex-col items-center gap-3">
                                    <div className="h-7 w-7 rounded-full border-2 animate-spin"
                                        style={{ borderColor: `${color}30`, borderTopColor: color }} />
                                    <p className="text-[12px] text-[var(--muted)] animate-pulse">Generating briefing…</p>
                                </div>
                            ) : error ? (
                                <div className="py-6 flex flex-col items-center gap-2 text-center">
                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                    <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
                                        {error.includes("busy") ? "AI service is busy — try again in a moment." : error}
                                    </p>
                                    <button onClick={onRefresh}
                                        className="mt-1 text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" />Retry
                                    </button>
                                </div>
                            ) : briefing ? (
                                <BriefingBody briefing={briefing} color={color} />
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="text-[12px] text-[var(--muted)]">No briefing data available.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


// Main IssueBriefingCenter
export function IssueBriefingCenter({ profile, isPersonalized, selectedArea, setSelectedArea }: Props) {
    const [cards, setCards] = useState<AreaCard[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);
    const hasAutoExpanded = useRef(false);
    const autoLoadTarget = useRef<string | null>(null);

    // build card list
    useEffect(() => {
        const profileIssueIds = new Set<string>(
            isPersonalized && profile?.issues ? profile.issues : []
        );

        const sorted = [...POLICY_AREAS]
            .filter(a => a.id !== "All")
            .sort((a, b) => {
                const aP = profileIssueIds.has(a.id) ? 0 : 1;
                const bP = profileIssueIds.has(b.id) ? 0 : 1;
                if (aP !== bP) return aP - bP;
                const ai = PRIORITY_AREA_IDS.indexOf(a.id);
                const bi = PRIORITY_AREA_IDS.indexOf(b.id);
                if (ai !== bi) {
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                }
                return a.label.localeCompare(b.label);
            });

        setCards(sorted.map(area => ({
            id: area.id,
            label: area.label,
            slug: AREA_SLUG_MAP[area.id] ?? area.id.toLowerCase().replace(/[\s,]+/g, "-"),
            color: area.color,
            Icon: area.Icon,
            isPersonalized: isPersonalized && profileIssueIds.has(area.id),
            briefing: null,
            loading: false,
            error: null,
        })));
        hasAutoExpanded.current = false;
    }, [isPersonalized, profile]);

    // auto-expand top card once cards are ready
    useEffect(() => {
        if (hasAutoExpanded.current || cards.length === 0) return;
        const targetId =
            selectedArea && selectedArea !== "All" && cards.some(c => c.id === selectedArea)
                ? selectedArea
                : cards[0].id;

        hasAutoExpanded.current = true;
        setExpandedId(targetId);
        if (targetId !== selectedArea) setSelectedArea(targetId);
        autoLoadTarget.current = targetId;
    }, [cards]); // eslint-disable-line react-hooks/exhaustive-deps

    // When sidebar selectedArea changes, expand + load that card
    useEffect(() => {
        if (selectedArea === "All") return;
        const card = cards.find(c => c.id === selectedArea);
        if (!card) return;
        setExpandedId(selectedArea);
        if (!card.briefing && !card.loading) loadBriefing(selectedArea);
    }, [selectedArea]); // eslint-disable-line

    const loadBriefing = useCallback(async (areaId: string) => {
        if (autoLoadTarget.current === areaId) autoLoadTarget.current = null;

        const card = cards.find(c => c.id === areaId);
        if (!card) return;

        setCards(prev => prev.map(c =>
            c.id === areaId ? { ...c, loading: true, error: null } : c
        ));

        try {
            const data = await fetchBriefingViaChat(areaId, profile, isPersonalized);
            setCards(prev => prev.map(c =>
                c.id === areaId ? { ...c, briefing: data, loading: false, error: null } : c
            ));
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Failed to load briefing";
            setCards(prev => prev.map(c =>
                c.id === areaId ? { ...c, loading: false, error: msg } : c
            ));
        }
    }, [cards, profile, isPersonalized]);

    // auto-load once loadBriefing is stable
    useEffect(() => {
        const target = autoLoadTarget.current;
        if (!target) return;
        const card = cards.find(c => c.id === target);
        if (card && !card.briefing && !card.loading) loadBriefing(target);
    }, [loadBriefing]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggle = useCallback((areaId: string) => {
        const isOpening = expandedId !== areaId;
        setExpandedId(isOpening ? areaId : null);
        if (isOpening) {
            setSelectedArea(areaId);
            const card = cards.find(c => c.id === areaId);
            if (card && !card.briefing && !card.loading) loadBriefing(areaId);
        }
    }, [expandedId, cards, loadBriefing, setSelectedArea]);

    const handleRefresh = useCallback((areaId: string) => {
        setCards(prev => prev.map(c => c.id === areaId ? { ...c, briefing: null } : c));
        loadBriefing(areaId);
    }, [loadBriefing]);

    const visibleCards = showAll ? cards : cards.slice(0, 8);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                        <Newspaper className="h-4 w-4 text-[var(--accent)]" strokeWidth={2} />
                    </span>
                    <div>
                        <p className="font-work-sans text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] leading-none">
                            {isPersonalized && profile ? "Personalized for You" : "City-wide"}
                        </p>
                        <h2 className="font-limelight text-lg font-semibold tracking-tight text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] leading-tight">
                            Issue Briefings
                        </h2>
                    </div>
                </div>
                {isPersonalized && profile && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            {profile.borough || "Personalized"}
                        </span>
                    </div>
                )}
            </div>

            {/* Description */}
            <p className="text-[12px] text-[var(--muted)] leading-relaxed">
                AI-generated briefings for each issue area, grounded in indexed NYC Council, NY State, and federal records.
                Click any area to expand. Your profile interests load first.
            </p>

            {/* Cards grid */}
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleCards.map(card => (
                    <AreaCard
                        key={card.id}
                        card={card}
                        isExpanded={expandedId === card.id}
                        onToggle={() => handleToggle(card.id)}
                        onRefresh={() => handleRefresh(card.id)}
                    />
                ))}
            </motion.div>

            {/* Show more */}
            {cards.length > 8 && (
                <div className="flex justify-center pt-2">
                    <button type="button" onClick={() => setShowAll(v => !v)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[12px] font-bold text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)] transition-all shadow-sm">
                        {showAll
                            ? <><ChevronDown className="h-3.5 w-3.5 rotate-180" />Show fewer areas</>
                            : <><ChevronDown className="h-3.5 w-3.5" />{cards.length - 8} more issue areas</>}
                    </button>
                </div>
            )}
        </div>
    );
}