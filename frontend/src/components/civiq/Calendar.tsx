"use client";

import { useState } from "react";
import { MotionReveal } from "./MotionReveal";


type Source = {
    id: string;
    tier: "city" | "borough" | "state";
    label: string;
    shortLabel: string;
    url: string;
    embedUrl?: string; // most pages don't have iframe embedding though
    description: string;
    badge: string;
};

const SOURCES: Source[] = [
    // NYC / City
    {
        id: "nycc-livestream",
        tier: "city",
        label: "NYC Council – Livestreams & Hearings",
        shortLabel: "Council Livestream",
        url: "https://council.nyc.gov/livestream/",
        description:
            "Live and archived video of NYC Council sessions, committee hearings, and oversight meetings streamed directly from the Council chambers.",
        badge: "NYC Council",
    },
    {
        id: "legistar",
        tier: "city",
        label: "Legistar – NYC Council Meeting Calendar",
        shortLabel: "Council Calendar",
        url: "https://legistar.council.nyc.gov/Calendar.aspx",
        description:
            "Official legislative calendar listing all upcoming Council and committee meetings, agendas, minutes, and vote records managed through the Legistar system.",
        badge: "NYC Council",
    },
    {
        id: "nyc-public-meetings",
        tier: "city",
        label: "NYC Civic Engagement – Public Meetings",
        shortLabel: "Public Meetings",
        url: "https://www.nyc.gov/site/civicengagement/meetings/public-meetings.page",
        description:
            "Citywide public meetings across all agencies and offices, curated by the Mayor's Office of Civic Engagement to encourage resident participation.",
        badge: "NYC Gov",
    },
    {
        id: "nyc-your-government",
        tier: "city",
        label: "NYC.gov – Your Government",
        shortLabel: "NYC Government Hub",
        url: "https://www.nyc.gov/main/your-government",
        description:
            "Central hub for navigating all NYC government agencies, elected officials, and civic services — a starting point for finding the right body or meeting.",
        badge: "NYC Gov",
    },
    {
        id: "community-boards",
        tier: "borough",
        label: "NYC Community Boards",
        shortLabel: "Community Boards",
        url: "https://www.nyc.gov/site/cau/community-boards/community-boards.page",
        description:
            "Directory and meeting schedules for all 59 NYC Community Boards — the hyperlocal advisory bodies that weigh in on land use, budgets, and neighborhood concerns.",
        badge: "NYC Gov",
    },
    {
        id: "cb6",
        tier: "borough",
        label: "Community Board 6 – Meetings & Calendar",
        shortLabel: "CB6 Calendar",
        url: "https://cbsix.org/meetings-calendar/",
        description:
            "Meeting calendar for Manhattan Community Board 6 (Murray Hill, Kips Bay, Tudor City, Stuyvesant Town), including full board and committee sessions.",
        badge: "CB6",
    },
    // NYS / State
    {
        id: "nys-assembly-hearings",
        tier: "state",
        label: "NY State Assembly – Hearing Schedule",
        shortLabel: "Assembly Hearings",
        url: "https://nyassembly.gov/leg/?sh=hear",
        description:
            "Upcoming public hearings of the New York State Assembly, searchable by committee, date, and topic — with witness lists and bill references.",
        badge: "NYS Assembly",
    },
    {
        id: "nys-assembly-av",
        tier: "state",
        label: "NY State Assembly – Hearing Video Archive",
        shortLabel: "Assembly Video",
        url: "https://nyassembly.gov/av/hearings/",
        description:
            "Recorded video of past and live Assembly committee hearings, accessible for public review and research.",
        badge: "NYS Assembly",
    },
    {
        id: "nys-senate-events",
        tier: "state",
        label: "NY State Senate – Events & Hearings",
        shortLabel: "Senate Events",
        url: "https://www.nysenate.gov/events",
        description:
            "Comprehensive event listings for New York State Senate sessions, committee hearings, town halls, and constituent outreach events across the state.",
        badge: "NYS Senate",
    },
];

const TIER_META: Record<string, { label: string; color: string; dot: string }> = {
    city: {
        label: "New York City",
        color:
            "bg-[#1a3a5c]/10 text-[#1a3a5c] border-[#1a3a5c]/20 dark:bg-[#8db5f0]/10 dark:text-[#a9c5ee] dark:border-[#8db5f0]/30",
        dot: "bg-[#1a3a5c] dark:bg-[#a9c5ee]",
    },
    borough: {
        label: "Borough & Community",
        color:
            "bg-[#0a5c3a]/10 text-[#0a5c3a] border-[#0a5c3a]/20 dark:bg-[#5fcf9c]/10 dark:text-[#7ddcae] dark:border-[#5fcf9c]/30",
        dot: "bg-[#0a5c3a] dark:bg-[#7ddcae]",
    },
    state: {
        label: "New York State",
        color:
            "bg-[#5c1a1a]/10 text-[#5c1a1a] border-[#5c1a1a]/20 dark:bg-[#e88d8d]/10 dark:text-[#eaa1a1] dark:border-[#e88d8d]/30",
        dot: "bg-[#5c1a1a] dark:bg-[#eaa1a1]",
    },
};

const BADGE_COLORS: Record<string, string> = {
    "NYC Council":
        "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
    "NYC Gov":
        "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
    CB6: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    "NYS Assembly":
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
    "NYS Senate":
        "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20",
};



// ------------------------------------------------------------------------------------
export function Calendar() {
    const [filter, setFilter] = useState<"all" | "city" | "borough" | "state">("all");
    const [featured, setFeatured] = useState<Source | null>(null);

    const filtered = filter === "all" ? SOURCES : SOURCES.filter((s) => s.tier === filter);
    const tiers = ["all", "city", "borough", "state"] as const;

    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* heading/hero */}
            <MotionReveal>
                <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl mt-4">
                    Civic Calendar
                </h1>
                <p className="mt-3 max-w-2xl text-(--muted)">
                    All public meeting calendars, hearing schedules, and livestreams across City Council,
                    Community Boards, and New York State — in one place.
                </p>
            </MotionReveal>

            {/* filter tabs */}
            <MotionReveal className="mt-8">
                <div className="flex flex-wrap gap-2">
                    {tiers.map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                                filter === t
                                    ? "border-[rgba(20,31,45,0.85)] bg-[rgba(20,31,45,0.85)] text-white shadow-sm dark:border-foreground dark:bg-foreground dark:text-background"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-(--border) dark:bg-(--surface-card) dark:text-(--foreground-secondary) dark:hover:border-(--accent)/40 dark:hover:bg-(--surface-elevated) dark:hover:text-foreground"
                            }`}
                        >
                            {t === "all"
                                ? "All Sources"
                                : TIER_META[t].label}
                        </button>
                    ))}
                </div>
            </MotionReveal>

            {/* TODO: streamline cal data -- for now, embed/redirect urls */}
            {featured?.embedUrl && (
                <MotionReveal className="mt-8">
                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-(--border) dark:bg-(--surface-card)">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-(--border)">
                            <span className="text-sm font-semibold text-slate-700 dark:text-foreground">{featured.label}</span>
                            <div className="flex items-center gap-3">
                                <a
                                    href={featured.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 dark:text-(--foreground-secondary) dark:hover:text-foreground"
                                >
                                    Open in new tab ↗
                                </a>
                                <button
                                    onClick={() => setFeatured(null)}
                                    className="text-slate-400 hover:text-slate-600 text-lg leading-none dark:text-(--foreground-secondary) dark:hover:text-foreground"
                                    aria-label="Close embed"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <iframe
                            src={featured.embedUrl}
                            title={featured.label}
                            className="h-130 w-full"
                            loading="lazy"
                        />
                    </div>
                </MotionReveal>
            )}

            {/* source */}
            <MotionReveal className="mt-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((source) => {
                        const tier = TIER_META[source.tier];
                        const badgeColor = BADGE_COLORS[source.badge] ?? "bg-slate-50 text-slate-600 ring-slate-100";
                        return (
                            <div
                                key={source.id}
                                className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-(--border) dark:bg-(--surface-card) dark:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)] dark:hover:border-(--accent)/40 dark:hover:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.55)]"
                            >
                                {/* tier indication */}
                                <div className="mb-3 flex items-center justify-between">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tier.color}`}
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                                        {tier.label}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeColor}`}
                                    >
                                        {source.badge}
                                    </span>
                                </div>

                                {/* TITLE */}
                                <h3 className="text-sm font-semibold leading-snug text-slate-800 group-hover:text-[rgba(20,31,45,0.9)] dark:text-foreground dark:group-hover:text-white">
                                    {source.label}
                                </h3>

                                {/* DESCRIPTION */}
                                <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500 dark:text-(--foreground-secondary)">
                                    {source.description}
                                </p>

                                {/* VISIT link */}
                                <div className="mt-4 flex items-center gap-2">
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-lg bg-[rgba(20,31,45,0.85)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[rgba(20,31,45,1)] dark:bg-foreground dark:text-background dark:hover:bg-white"
                                    >
                                        Visit
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                    {source.embedUrl && (
                                        <button
                                            onClick={() => setFeatured(source)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-(--border) dark:text-(--foreground-secondary) dark:hover:bg-(--surface-elevated) dark:hover:text-foreground"
                                        >
                                            Preview
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </MotionReveal>

            {/* sources - footer */}
            <MotionReveal className="mt-16">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 dark:border-(--border) dark:bg-(--surface-card)">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-foreground">All Sources</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-(--foreground-secondary)">
                        Direct links to all civic calendars and public meeting resources used by Civic Spiegel.
                    </p>
                    <div className="mt-6 divide-y divide-slate-100 dark:divide-(--border)">
                        {SOURCES.map((s) => (
                            <div key={s.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                                <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-w-55 text-sm font-medium text-[rgba(20,31,45,0.85)] underline-offset-2 hover:underline dark:text-foreground"
                                >
                                    {s.shortLabel} ↗
                                </a>
                                <p className="text-xs text-slate-500 dark:text-(--foreground-secondary)">{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </MotionReveal>
        </section>
    );
}