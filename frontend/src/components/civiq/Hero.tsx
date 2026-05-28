"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, MapPin, Home, User, Calendar, Tag, Sparkles, Users, X, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { POLICY_AREAS } from "@/lib/policyMetadata";
import type { CivicProfile } from "@/lib/useProfile";


export type HeroContext = {
  location: string;
  housing: string;
  whoami: string[];
  timeframe: string;
  issue: string;
};

export const EMPTY_CONTEXT: HeroContext = {
  location: "", housing: "", whoami: [], timeframe: "", issue: "",
};

type HeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  onSearch: () => void | Promise<void>;
  context: HeroContext;
  onContextChange: (c: HeroContext) => void;
  isPersonalized: boolean;
  onPersonalizedChange: (v: boolean) => void;
  profile: CivicProfile | null;
};

type ChipId = "location" | "housing" | "whoami" | "timeframe" | "issue";


// options
const LOCATIONS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const HOUSING_OPTIONS = ["Renter", "Homeowner", "NYCHA resident", "Shared Housing", "Unhoused"];
const WHOAMI_OPTIONS = ["Senior (65+)", "Student", "Veteran", "Parent / Caregiver", "Small business owner", "Low-income", "Immigrant / Non-citizen", "Person with disability", "Working class"];
const TIMEFRAMES = ["Last 30 days", "Last 6 months", "Last year", "All time"];
const ISSUE_OPTIONS = POLICY_AREAS.filter(a => a.id !== "All");


const HEADLINE_LETTER_STAGGER = 0.14;
const HEADLINE_LETTER_DURATION = 1.05;
const ease: [number, number, number, number] = [0.16, 1, 0.32, 1];
const letterVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: HEADLINE_LETTER_DURATION, ease } },
};


function Pill({
  selected, onClick, color, children,
}: {
  selected: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-semibold transition-all whitespace-nowrap ${selected
        ? "text-white border-transparent shadow-sm"
        : "bg-white/70 dark:bg-white/8 border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 hover:text-slate-800 dark:hover:text-white"
        }`}
      style={selected ? { background: color ?? "var(--accent)" } : undefined}
    >
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />}
      {children}
    </button>
  );
}



function ChipTrigger({
  icon: Icon, label, active, activeLabel, onClear, onClick, expanded,
}: {
  icon: any;
  label: string;
  active: boolean;
  activeLabel?: string;
  onClear?: () => void;
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-semibold transition-all whitespace-nowrap ${active || expanded
        ? "bg-[var(--accent)] text-white border-transparent shadow-sm"
        : "bg-white/70 dark:bg-white/8 border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 hover:text-slate-800 dark:hover:text-white"
        }`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span>{active && activeLabel ? activeLabel : label}</span>
      {active && onClear ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClear?.(); } }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-white/25"
          aria-label={`Clear ${label}`}
        >
          <X className="h-2.5 w-2.5" />
        </span>
      ) : (
        <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      )}
    </button>
  );
}


// context chips + inline expanded options 
function ContextChips({
  context, onChange, isPersonalized, onPersonalizedChange, profile,
}: {
  context: HeroContext;
  onChange: (c: HeroContext) => void;
  isPersonalized: boolean;
  onPersonalizedChange: (v: boolean) => void;
  profile: CivicProfile | null;
}) {
  const [expanded, setExpanded] = useState<ChipId | null>(null);
  const set = useCallback((patch: Partial<HeroContext>) => onChange({ ...context, ...patch }), [context, onChange]);

  const toggle = (id: ChipId) => setExpanded(p => p === id ? null : id);

  const selectedIssue = ISSUE_OPTIONS.find(o => o.id === context.issue);

  // active labels for chips
  const locationLabel = context.location || undefined;
  const housingLabel = context.housing || undefined;
  const whoamiLabel = context.whoami.length === 1 ? context.whoami[0] : context.whoami.length > 1 ? `${context.whoami.length} selected` : undefined;
  const timeLabel = context.timeframe || undefined;
  const issueLabel = selectedIssue?.label.split(" ").slice(0, 2).join(" ") || undefined;

  return (
    <div className="mt-3 space-y-2.5">
      {/* perspective toggle + chip triggers */}
      <div className="flex flex-wrap items-center gap-2">
        {/* perspective: For Me vs. Everyone */}
        <div className="flex items-center rounded-full border border-slate-200 dark:border-white/15 bg-white/70 dark:bg-white/8 p-0.5 gap-0.5">
          <button type="button" onClick={() => { onPersonalizedChange(true); setExpanded(null); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${isPersonalized ? "bg-[var(--accent)] text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}>
            <Sparkles className="h-2.5 w-2.5" />For Me
          </button>
          <button type="button" onClick={() => { onPersonalizedChange(false); setExpanded(null); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${!isPersonalized ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}>
            <Users className="h-2.5 w-2.5" />Everyone
          </button>
        </div>

        <div className="w-px h-4 bg-slate-200 dark:bg-white/15 mx-0.5" />

        <ChipTrigger icon={MapPin} label="Location" active={!!locationLabel} activeLabel={locationLabel} onClear={() => { set({ location: "" }); setExpanded(null); }} onClick={() => toggle("location")} expanded={expanded === "location"} />
        <ChipTrigger icon={Home} label="Housing" active={!!housingLabel} activeLabel={housingLabel} onClear={() => { set({ housing: "" }); setExpanded(null); }} onClick={() => toggle("housing")} expanded={expanded === "housing"} />
        <ChipTrigger icon={User} label="Who I am" active={!!whoamiLabel} activeLabel={whoamiLabel} onClear={() => { set({ whoami: [] }); setExpanded(null); }} onClick={() => toggle("whoami")} expanded={expanded === "whoami"} />
        <ChipTrigger icon={Calendar} label="Timeframe" active={!!timeLabel} activeLabel={timeLabel} onClear={() => { set({ timeframe: "" }); setExpanded(null); }} onClick={() => toggle("timeframe")} expanded={expanded === "timeframe"} />
        <ChipTrigger icon={Tag} label="Issue" active={!!issueLabel} activeLabel={issueLabel} onClear={() => { set({ issue: "" }); setExpanded(null); }} onClick={() => toggle("issue")} expanded={expanded === "issue"} />
      </div>

      {/* inline expanded options */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key={expanded}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-sm px-3 py-3">

              {expanded === "location" && (
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map(opt => (
                    <Pill key={opt} selected={context.location === opt}
                      onClick={() => { set({ location: context.location === opt ? "" : opt }); }}>
                      {opt}
                    </Pill>
                  ))}
                </div>
              )}

              {expanded === "housing" && (
                <div className="flex flex-wrap gap-2">
                  {HOUSING_OPTIONS.map(opt => (
                    <Pill key={opt} selected={context.housing === opt}
                      onClick={() => { set({ housing: context.housing === opt ? "" : opt }); }}>
                      {opt}
                    </Pill>
                  ))}
                </div>
              )}

              {expanded === "whoami" && (
                <>
                  <p className="font-work-sans text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    Select all that apply
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WHOAMI_OPTIONS.map(opt => (
                      <Pill key={opt} selected={context.whoami.includes(opt)}
                        onClick={() => set({
                          whoami: context.whoami.includes(opt)
                            ? context.whoami.filter(w => w !== opt)
                            : [...context.whoami, opt],
                        })}>
                        {opt}
                      </Pill>
                    ))}
                  </div>
                </>
              )}

              {expanded === "timeframe" && (
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAMES.map(opt => (
                    <Pill key={opt} selected={context.timeframe === opt}
                      onClick={() => { set({ timeframe: context.timeframe === opt ? "" : opt }); }}>
                      {opt}
                    </Pill>
                  ))}
                </div>
              )}

              {expanded === "issue" && (
                <div className="flex flex-wrap gap-2">
                  {ISSUE_OPTIONS.map(opt => (
                    <Pill key={opt.id} selected={context.issue === opt.id} color={opt.color}
                      onClick={() => { set({ issue: context.issue === opt.id ? "" : opt.id }); }}>
                      <opt.Icon className="h-3 w-3 shrink-0" />
                      {opt.label}
                    </Pill>
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export function Hero({
  query, onQueryChange, loading, onSearch,
  context, onContextChange, isPersonalized, onPersonalizedChange, profile,
}: HeroProps) {
  const headlineIntro = "Unbiased Reflection";
  const headlineFocus = "of New York Policy";
  const introLen = headlineIntro.length;
  const line2Delay = 0.22 + introLen * HEADLINE_LETTER_STAGGER + 0.12;

  // auto-fill chips from profile when "For Me" is toggled on
  const prevPersonalized = useRef(isPersonalized);
  useEffect(() => {
    if (isPersonalized && !prevPersonalized.current && profile) {
      onContextChange({
        location: profile.borough ?? "",
        housing: (profile as any).housing ?? "",
        whoami: (profile as any).demographics ?? [],
        timeframe: "",
        issue: profile.issues?.[0] ?? "",
      });
    }
    if (!isPersonalized && prevPersonalized.current) {
      onContextChange(EMPTY_CONTEXT);
    }
    prevPersonalized.current = isPersonalized;
  }, [isPersonalized, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="relative overflow-hidden pb-10 pt-24 sm:pb-14 sm:pt-28">
      {/* background layers */}
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.82]"
        style={{ backgroundImage: "url('/images/skylinehero.png')" }} aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,255,0.48)_0%,rgba(248,251,255,0.28)_42%,rgba(248,251,255,0.42)_100%)] dark:bg-[linear-gradient(180deg,rgba(11,15,20,0.55)_0%,rgba(11,15,20,0.75)_45%,rgba(11,15,20,0.88)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(248,251,255,0)_0%,rgba(248,251,255,0.92)_100%)] dark:bg-[linear-gradient(180deg,rgba(11,15,20,0)_0%,rgba(11,15,20,0.97)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(231,241,250,0.7)_0%,rgba(231,241,250,0.28)_56%,rgba(231,241,250,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(20,28,38,0.5)_0%,rgba(11,15,20,0)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute right-0 top-0 h-36 w-[52%] bg-[radial-gradient(ellipse_at_top_right,rgba(229,240,250,0.86)_0%,rgba(229,240,250,0.5)_44%,rgba(229,240,250,0.18)_70%,rgba(229,240,250,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(60,80,108,0.25)_0%,rgba(11,15,20,0)_70%)]" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">

          {/* Headline */}
          <div className="mx-auto w-full text-center opacity-85">
            <h1 className="font-limelight mx-auto mt-5 max-w-3xl text-center text-[2.9rem] leading-[1.08] tracking-[3.8px] text-[rgba(20,31,45,0.92)] sm:text-[3.6rem] md:text-[4.2rem] lg:text-[4.65rem] dark:text-[var(--foreground)]">
              <motion.span className="block w-full" initial="hidden" animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: HEADLINE_LETTER_STAGGER, delayChildren: 0.22 } } }}>
                {headlineIntro.split("").map((char, i) => (
                  <motion.span key={`i-${i}`} className="inline-block" variants={letterVariants}>
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.span>
              <motion.span className="hero-wordmark-reflect mt-1.5 block w-full text-center" data-reflect="Of New York"
                initial="hidden" animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: HEADLINE_LETTER_STAGGER, delayChildren: line2Delay } } }}>
                {headlineFocus.split("").map((char, i) => (
                  <motion.span key={`f-${i}`} className="hero-gradient-text inline-block" variants={letterVariants}>
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
              className="font-limelight mx-auto mt-4 max-w-2xl text-balance text-[18px] font-extrabold tracking-[1.3px] text-[rgba(20,31,45,1)] dark:text-[var(--foreground-secondary)]">
              Where Policy Decisions Become Visible
            </motion.p>
          </div>

          {/* search bar + chips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mt-10 w-full"
          >
            <form onSubmit={(e) => { e.preventDefault(); void onSearch(); }}>
              <label htmlFor="hero-search" className="sr-only">Ask about NYC policy</label>
              <div className="hero-search-shell glass-card search-shell command-shell group mx-auto flex h-14 w-full items-center gap-2 rounded-[23px] py-0 pl-[clamp(0.75rem,2vw,1.125rem)] pr-[clamp(0.85rem,2.3vw,1.25rem)] leading-[25px] transition-[box-shadow,transform] duration-300 sm:h-[3.625rem] sm:gap-3 md:h-[61px]">
                <span className="hero-search-icon-wrap relative flex shrink-0 text-[#12355b] dark:text-white" aria-hidden>
                  <Search className="hero-search-icon-glow h-[clamp(1.05rem,min(1.35rem,38cqh),1.5rem)] w-[clamp(1.05rem,min(1.35rem,38cqh),1.5rem)] shrink-0 text-white transition-transform duration-300 group-focus-within:scale-105" strokeWidth={1.75} aria-hidden />
                </span>
                <input
                  id="hero-search"
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Ask about housing, transit, schools, budgets…"
                  disabled={loading}
                  className="font-work-sans min-w-0 flex-1 border-0 bg-transparent text-[18px] font-medium tracking-[1.2px] text-[rgba(20,31,45,0.7)] opacity-[0.88] placeholder:text-[0.98rem] placeholder:text-slate-400 placeholder:font-normal shadow-none focus:outline-none focus:ring-0 enabled:cursor-text disabled:opacity-60 dark:text-white dark:opacity-100 dark:placeholder:text-zinc-300"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  aria-label={loading ? "Loading" : "Search"}
                  className="command-submit hero-droplet-submit relative flex h-[clamp(2rem,calc(100cqh-22px),2.75rem)] w-[clamp(2rem,calc(100cqh-22px),2.75rem)] shrink-0 items-center justify-center border-0 bg-transparent p-0 shadow-none transition-[transform,filter] duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/55 disabled:pointer-events-none"
                >
                  <span className="sr-only">{loading ? "Loading…" : "Search"}</span>
                  <ArrowRight className="hero-submit-arrow relative z-10 h-[clamp(0.95rem,calc(0.32*100cqh-2px),1.25rem)] w-[clamp(0.95rem,calc(0.32*100cqh-2px),1.25rem)] shrink-0 text-[#12355b] dark:text-white" strokeWidth={2.5} aria-hidden />
                </button>
              </div>

              <ContextChips
                context={context}
                onChange={onContextChange}
                isPersonalized={isPersonalized}
                onPersonalizedChange={onPersonalizedChange}
                profile={profile}
              />
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
