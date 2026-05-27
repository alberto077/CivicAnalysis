"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ThumbsUp, ThumbsDown, Minus, UserX,
    ChevronDown, ChevronUp, ExternalLink, Search,
    Filter, TrendingUp, Users, CheckCircle, XCircle,
    AlertTriangle, Clock, Sparkles, BarChart3,
    ArrowUpDown, RefreshCw,
} from "lucide-react";
import { type CivicProfile } from "@/lib/useProfile";
import { POLICY_AREAS, getPolicyAreaMetadata, timeAgo } from "@/lib/policyMetadata";
import { MotionReveal } from "./MotionReveal";



type VoteRecord = {
    politician_name: string;
    politician_id: number;
    district: string | null;
    borough: string | null;
    party: string | null;
    vote: "Yea" | "Nay" | "Abstain" | "Absent";
};

type VoteBreakdown = {
    Yea: number;
    Nay: number;
    Abstain: number;
    Absent: number;
};

type LegislationEvent = {
    id: number;
    title: string;
    description: string | null;
    jurisdiction: string;
    status: string | null;
    event_date: string | null;
    event_url: string | null;
    outcome: "Passed" | "Failed" | "Tied" | "Pending";
    vote_breakdown: VoteBreakdown;
    total_votes: number;
    votes: VoteRecord[];
};

type Props = {
    profile: CivicProfile | null;
    isPersonalized: boolean;
};


// Outcome config
const OUTCOME_CONFIG = {
    Passed: { icon: CheckCircle, color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800/40", text: "text-emerald-700 dark:text-emerald-400" },
    Failed: { icon: XCircle, color: "#ef4444", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800/40", text: "text-red-700 dark:text-red-400" },
    Tied: { icon: AlertTriangle, color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800/40", text: "text-amber-700 dark:text-amber-400" },
    Pending: { icon: Clock, color: "#64748b", bg: "bg-slate-50 dark:bg-slate-900/40", border: "border-slate-200 dark:border-slate-700", text: "text-slate-600 dark:text-slate-400" },
} as const;

const VOTE_CONFIG = {
    Yea: { icon: ThumbsUp, color: "#10b981", label: "Yea" },
    Nay: { icon: ThumbsDown, color: "#ef4444", label: "Nay" },
    Abstain: { icon: Minus, color: "#f59e0b", label: "Abstain" },
    Absent: { icon: UserX, color: "#94a3b8", label: "Absent" },
} as const;


// Personal impact scorer
function scorePersonalImpact(event: LegislationEvent, profile: CivicProfile | null): number {
    if (!profile) return 0;
    let score = 0;
    const haystack = `${event.title} ${event.description ?? ""}`.toLowerCase();

    if (profile.borough && haystack.includes(profile.borough.toLowerCase())) score += 3;

    for (const issue of profile.issues ?? []) {
        const kws = getPolicyAreaMetadata(issue).keywords;
        if (kws.some(k => haystack.includes(k))) score += 2;
    }

    const housing = ((profile as any).housing ?? "").toLowerCase();
    if (housing.includes("rent") || housing.includes("tenant")) {
        if (haystack.includes("tenant") || haystack.includes("rent") || haystack.includes("eviction")) score += 2;
    }
    if (housing.includes("own") || housing.includes("homeowner")) {
        if (haystack.includes("homeowner") || haystack.includes("property tax")) score += 2;
    }

    for (const demo of (profile as any).demographics ?? []) {
        if (haystack.includes(demo.toLowerCase())) score += 1;
    }

    return Math.min(score, 10);
}

function impactLabel(score: number): { label: string; color: string; bg: string } {
    if (score >= 7) return { label: "High impact for you", color: "#ef4444", bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40" };
    if (score >= 4) return { label: "Moderate impact for you", color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40" };
    if (score >= 2) return { label: "May affect you", color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40" };
    return { label: "General interest", color: "#64748b", bg: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700" };
}


// Vote bar
function VoteBar({ breakdown, total }: { breakdown: VoteBreakdown; total: number }) {
    if (total === 0) return null;
    const yPct = Math.round((breakdown.Yea / total) * 100);
    const nPct = Math.round((breakdown.Nay / total) * 100);
    const aPct = Math.round((breakdown.Abstain / total) * 100);
    const abPct = 100 - yPct - nPct - aPct;

    return (
        <div className="space-y-1">
            <div className="flex h-2 w-full rounded-full overflow-hidden gap-px">
                {yPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${yPct}%`, background: "#10b981" }} />}
                {nPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${nPct}%`, background: "#ef4444" }} />}
                {aPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${aPct}%`, background: "#f59e0b" }} />}
                {abPct > 0 && <div className="h-full transition-all duration-500" style={{ width: `${abPct}%`, background: "#94a3b8" }} />}
            </div>
            <div className="flex gap-3 flex-wrap">
                {(["Yea", "Nay", "Abstain", "Absent"] as const).map(v => {
                    const count = breakdown[v];
                    if (!count) return null;
                    const cfg = VOTE_CONFIG[v];
                    return (
                        <span key={v} className="flex items-center gap-1 text-[9px] font-bold" style={{ color: cfg.color }}>
                            <cfg.icon className="h-2.5 w-2.5" />
                            {count} {cfg.label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}


// My rep's vote indicator
function MyRepVote({
    votes,
    profile,
}: {
    votes: VoteRecord[];
    profile: CivicProfile | null;
}) {
    if (!profile?.borough) return null;

    const myRep = votes.find(v =>
        v.borough && v.borough.toLowerCase().includes(profile.borough!.toLowerCase())
    );
    if (!myRep) return null;

    const cfg = VOTE_CONFIG[myRep.vote as keyof typeof VOTE_CONFIG] ?? VOTE_CONFIG.Abstain;

    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold"
            style={{ color: cfg.color, background: `${cfg.color}10`, borderColor: `${cfg.color}30` }}
        >
            <cfg.icon className="h-3 w-3" />
            Your rep ({myRep.politician_name.split(" ").pop()}): {myRep.vote}
        </div>
    );
}


// Vote detail table
function VoteTable({ votes, userBorough }: { votes: VoteRecord[]; userBorough?: string }) {
    const [filter, setFilter] = useState<"all" | "Yea" | "Nay" | "Abstain" | "Absent">("all");

    const sorted = useMemo(() => {
        const filtered = filter === "all" ? votes : votes.filter(v => v.vote === filter);
        return [...filtered].sort((a, b) => {
            // User's borough first
            if (userBorough) {
                const aMatch = a.borough?.toLowerCase().includes(userBorough.toLowerCase()) ? 0 : 1;
                const bMatch = b.borough?.toLowerCase().includes(userBorough.toLowerCase()) ? 0 : 1;
                if (aMatch !== bMatch) return aMatch - bMatch;
            }
            const order = { Yea: 0, Nay: 1, Abstain: 2, Absent: 3 };
            return (order[a.vote] ?? 4) - (order[b.vote] ?? 4);
        });
    }, [votes, filter, userBorough]);

    return (
        <div className="space-y-2">
            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {(["all", "Yea", "Nay", "Abstain", "Absent"] as const).map(f => {
                    const count = f === "all" ? votes.length : votes.filter(v => v.vote === f).length;
                    if (f !== "all" && !count) return null;
                    const cfg = f !== "all" ? VOTE_CONFIG[f] : null;
                    return (
                        <button key={f} type="button"
                            onClick={() => setFilter(f)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all border ${filter === f
                                ? "text-white shadow-sm border-transparent"
                                : "bg-white dark:bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                            style={filter === f ? { background: cfg?.color ?? "#64748b" } : undefined}
                        >
                            {cfg && <cfg.icon className="h-2.5 w-2.5" />}
                            {f === "all" ? "All" : f} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-[var(--surface-elevated)] z-10">
                            <tr>
                                <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-[var(--muted)]">Member</th>
                                <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-[var(--muted)]">District</th>
                                <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-[var(--muted)]">Party</th>
                                <th className="text-left px-3 py-2 font-bold text-slate-500 dark:text-[var(--muted)]">Vote</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {sorted.map((vr, i) => {
                                const cfg = VOTE_CONFIG[vr.vote as keyof typeof VOTE_CONFIG] ?? VOTE_CONFIG.Abstain;
                                const isMyBorough = userBorough && vr.borough?.toLowerCase().includes(userBorough.toLowerCase());
                                return (
                                    <tr key={i}
                                        className={`transition-colors ${isMyBorough ? "bg-[var(--accent)]/5" : "hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)]/40"}`}
                                    >
                                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">
                                            {isMyBorough && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1.5 mb-0.5" />}
                                            {vr.politician_name}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400 tabular-nums">
                                            {vr.district ? `D${vr.district}` : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{vr.party ?? "—"}</td>
                                        <td className="px-3 py-2">
                                            <span className="flex items-center gap-1 font-bold w-fit" style={{ color: cfg.color }}>
                                                <cfg.icon className="h-3 w-3" />
                                                {vr.vote}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


// Bill card
function BillCard({
    event,
    profile,
    isPersonalized,
}: {
    event: LegislationEvent;
    profile: CivicProfile | null;
    isPersonalized: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const outcome = OUTCOME_CONFIG[event.outcome] ?? OUTCOME_CONFIG.Pending;
    const OutcomeIcon = outcome.icon;
    const impact = isPersonalized && profile ? scorePersonalImpact(event, profile) : 0;
    const impactInfo = impactLabel(impact);

    return (
        <motion.div
            layout
            className="rounded-2xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 backdrop-blur-sm overflow-hidden hover:shadow-sm transition-shadow"
        >
            {/* Bill header */}
            <button
                type="button"
                className="w-full text-left px-4 py-3.5"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-start gap-3">
                    {/* Outcome badge */}
                    <div className={`flex shrink-0 items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold mt-0.5 ${outcome.bg} ${outcome.border} ${outcome.text}`}>
                        <OutcomeIcon className="h-3 w-3" />
                        {event.outcome}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1">
                            {event.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            {event.event_date && (
                                <span className="text-[9px] text-[var(--muted)] tabular-nums flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {timeAgo(event.event_date)}
                                </span>
                            )}
                            <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">
                                {event.jurisdiction}
                            </span>
                            {isPersonalized && impact >= 2 && (
                                <span
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border ${impactInfo.bg}`}
                                    style={{ color: impactInfo.color }}
                                >
                                    <Sparkles className="h-2 w-2" />
                                    {impactInfo.label}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-1">
                        {isPersonalized && profile && (
                            <MyRepVote votes={event.votes} profile={profile} />
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                </div>

                {/* Vote bar preview */}
                {event.total_votes > 0 && (
                    <div className="mt-2.5 pl-0">
                        <VoteBar breakdown={event.vote_breakdown} total={event.total_votes} />
                    </div>
                )}
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden border-t border-[var(--border)]"
                    >
                        <div className="px-4 py-4 space-y-4">
                            {/* Description */}
                            {event.description && (
                                <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                                    {event.description}
                                </p>
                            )}

                            {/* Vote breakdown detail */}
                            {event.total_votes > 0 ? (
                                <div>
                                    <p className="font-work-sans text-[9px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                                        Vote breakdown · {event.total_votes} votes cast
                                    </p>
                                    <VoteTable votes={event.votes} userBorough={profile?.borough} />
                                </div>
                            ) : (
                                <p className="text-[11px] text-[var(--muted)] italic">
                                    No vote records available yet for this bill.
                                </p>
                            )}

                            {/* Source link */}
                            {event.event_url && (
                                <a
                                    href={event.event_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)] hover:underline"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    View on NYC Council Legistar
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


// Main VoteTracker
export function VoteTracker({ profile, isPersonalized }: Props) {
    const [events, setEvents] = useState<LegislationEvent[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [outcomeFilter, setOutcomeFilter] = useState<"all" | "Passed" | "Failed" | "Pending">("all");
    const [areaFilter, setAreaFilter] = useState("All");
    const [sortBy, setSortBy] = useState<"date" | "impact">("date");

    const LIMIT = 20;

    const fetchEvents = useCallback(async (newOffset = 0, append = false) => {
        const isFirst = newOffset === 0;
        if (isFirst) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        try {
            const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
            if (areaFilter !== "All") params.set("area", areaFilter);

            const res = await fetch(`/api/civic/votes?${params}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { events: LegislationEvent[]; total: number };

            setTotal(data.total);
            setEvents(prev => append ? [...prev, ...data.events] : data.events);
            setOffset(newOffset + data.events.length);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load vote records");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [areaFilter]);

    useEffect(() => {
        setOffset(0);
        fetchEvents(0, false);
    }, [areaFilter]); // eslint-disable-line

    // Client-side filtering + sorting
    const filtered = useMemo(() => {
        let list = events;

        if (outcomeFilter !== "all") {
            list = list.filter(e => e.outcome === outcomeFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.title.toLowerCase().includes(q) ||
                (e.description ?? "").toLowerCase().includes(q)
            );
        }

        if (sortBy === "impact" && isPersonalized && profile) {
            list = [...list].sort((a, b) =>
                scorePersonalImpact(b, profile) - scorePersonalImpact(a, profile)
            );
        }

        return list;
    }, [events, outcomeFilter, search, sortBy, isPersonalized, profile]);

    // Summary stats
    const stats = useMemo(() => ({
        passed: events.filter(e => e.outcome === "Passed").length,
        failed: events.filter(e => e.outcome === "Failed").length,
        pending: events.filter(e => e.outcome === "Pending").length,
    }), [events]);

    const hasVoteData = events.some(e => e.total_votes > 0);

    return (
        <MotionReveal>
            <div className="space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10">
                            <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                        </span>
                        <div>
                            <p className="font-work-sans text-[9px] font-black uppercase tracking-[0.2em] text-[var(--muted)] leading-none">
                                NYC Council
                            </p>
                            <h2 className="font-limelight text-lg font-semibold tracking-tight text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] leading-tight">
                                Vote Tracker
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchEvents(0, false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] transition-all shadow-sm"
                    >
                        <RefreshCw className="h-3 w-3" />Refresh
                    </button>
                </div>

                {/* No vote data notice */}
                {!loading && !hasVoteData && events.length > 0 && (
                    <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3">
                        <p className="text-[11.5px] font-semibold text-amber-800 dark:text-amber-200">
                            Per-member vote breakdowns unavailable.
                        </p>
                        <p className="text-[10.5px] text-amber-700/80 dark:text-amber-300/70 mt-0.5 leading-relaxed">
                            The NYC Council Legistar API does not expose individual member votes.
                            Bill outcomes (Passed / Failed) are shown below.
                        </p>
                    </div>
                )}

                {/* Stats bar */}
                {!loading && events.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: "Passed", count: stats.passed, color: "#10b981", icon: CheckCircle },
                            { label: "Failed", count: stats.failed, color: "#ef4444", icon: XCircle },
                            { label: "Pending", count: stats.pending, color: "#64748b", icon: Clock },
                        ].map(({ label, count, color, icon: Icon }) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => setOutcomeFilter(prev => prev === label ? "all" : label as any)}
                                className={`flex flex-col items-center gap-1 rounded-xl border p-3 transition-all ${outcomeFilter === label
                                    ? "shadow-sm"
                                    : "border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 hover:bg-white/80"
                                    }`}
                                style={outcomeFilter === label
                                    ? { borderColor: `${color}50`, background: `${color}10` }
                                    : undefined
                                }
                            >
                                <Icon className="h-4 w-4" style={{ color }} />
                                <span className="text-[15px] font-black tabular-nums" style={{ color }}>{count}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search bills…"
                            className="font-work-sans w-full rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 pl-9 pr-3 py-2 text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent)]/15"
                        />
                    </div>

                    {/* Area filter */}
                    <select
                        value={areaFilter}
                        onChange={e => setAreaFilter(e.target.value)}
                        className="font-work-sans rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] outline-none transition hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)] cursor-pointer"
                    >
                        <option value="All">All issues</option>
                        {POLICY_AREAS.filter(a => a.id !== "All").map(a => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    {isPersonalized && profile && (
                        <button
                            type="button"
                            onClick={() => setSortBy(v => v === "date" ? "impact" : "date")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all ${sortBy === "impact"
                                ? "bg-[var(--accent)] text-white border-transparent shadow-sm"
                                : "border-[var(--border)] bg-white/80 dark:bg-[var(--surface-elevated)]/80 text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                        >
                            <ArrowUpDown className="h-3 w-3" />
                            {sortBy === "impact" ? "By impact" : "By date"}
                        </button>
                    )}
                </div>

                {/* Results */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="h-6 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
                                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 text-[12px] text-red-800 dark:text-red-200" role="alert">
                        <p className="font-semibold">Could not load vote records.</p>
                        <p className="mt-0.5 opacity-80">{error}</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 text-center">
                        <BarChart3 className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">
                            {events.length === 0 ? "No vote records yet" : "No results match your filters"}
                        </p>
                        <p className="text-[11px] text-[var(--muted)] max-w-[220px] leading-relaxed">
                            {events.length === 0
                                ? "No legislation records yet. The pipeline will populate these nightly."
                                : "Try adjusting the search or filters above."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <p className="font-work-sans text-[10px] font-bold text-[var(--muted)] px-0.5">
                            {filtered.length} bill{filtered.length !== 1 ? "s" : ""}
                            {outcomeFilter !== "all" ? ` · ${outcomeFilter}` : ""}
                            {areaFilter !== "All" ? ` · ${areaFilter}` : ""}
                            {sortBy === "impact" ? " · sorted by personal impact" : ""}
                        </p>

                        {filtered.map(event => (
                            <BillCard
                                key={event.id}
                                event={event}
                                profile={profile}
                                isPersonalized={isPersonalized}
                            />
                        ))}

                        {/* Load more */}
                        {offset < total && (
                            <button
                                type="button"
                                onClick={() => fetchEvents(offset, true)}
                                disabled={loadingMore}
                                className="w-full py-3 rounded-xl border border-[var(--border)] bg-white/80 dark:bg-[var(--surface-card)]/80 text-[12px] font-bold text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-[var(--surface-elevated)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingMore
                                    ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />Loading…</>
                                    : <>Load more · {total - offset} remaining</>
                                }
                            </button>
                        )}
                    </div>
                )}

            </div>
        </MotionReveal>
    );
}