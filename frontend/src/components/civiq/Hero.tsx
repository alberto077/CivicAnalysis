"use client";

import { motion } from "framer-motion";
import { ArrowRight, Search, Sparkles, Users, X } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";
import { POLICY_AREAS } from "@/lib/policyMetadata";
import type { CivicProfile } from "@/lib/useProfile";

export type HeroContext = {
  borough: string;
  housing: string;
  income: string;
  age: string;
  demographics: string[];
  issues: string[];
  timeframe: string;
};

export const EMPTY_CONTEXT: HeroContext = {
  borough: "", housing: "", income: "", age: "", demographics: [], issues: [], timeframe: "",
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

// options - should import these into OnboardingModal and SettingsModal
export const BOROUGHS = ["Manhattan", "Queens", "Brooklyn", "Bronx", "Staten Island", "Other"];
export const INCOME = ["Under $25K", "$26-50K", "$51-75K", "$76-100K", "Over $100K", "Prefer not to say"];
export const HOUSING = ["Renter (Tenant)", "Homeowner", "Shared Housing", "Homeless / Unhoused", "Prefer not to say"];
export const AGE = ["Under 18", "18–25", "26–35", "36–50", "51–65", "65+", "Prefer not to say"];
export const DEMOGRAPHICS = [
  "Student", "Immigrant / DACA", "Veteran", "Disability", "Small business owner",
  "Child of US immigrants", "Recent NYC resident", "Single parent / Caregiver", "LGBTQ+", "BIPOC",
];
export const TIMEFRAMES = ["Last 30 days", "Last 6 months", "Last year", "All time"];
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
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${selected
        ? "text-white border-transparent shadow-sm"
        : "bg-white dark:bg-white/6 border-slate-200 dark:border-white/12 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/25 hover:bg-slate-50 dark:hover:bg-white/10"
        }`}
      style={selected ? { background: color ?? "var(--accent)" } : undefined}
    >
      {children}
    </button>
  );
}


function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start py-2.5 border-b border-slate-100 dark:border-white/6 last:border-0">
      <span className="w-20 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-1 text-right">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 flex-1">
        {children}
      </div>
    </div>
  );
}


function FilterBar({
  context, onChange, isPersonalized, onPersonalizedChange,
}: {
  context: HeroContext;
  onChange: (c: HeroContext) => void;
  isPersonalized: boolean;
  onPersonalizedChange: (v: boolean) => void;
}) {
  const set = useCallback(
    (patch: Partial<HeroContext>) => onChange({ ...context, ...patch }),
    [context, onChange],
  );

  const toggleArray = (key: "demographics" | "issues", val: string) =>
    set({ [key]: context[key].includes(val) ? context[key].filter(v => v !== val) : [...context[key], val] });

  const hasAny =
    !!context.borough || !!context.housing || !!context.income || !!context.age ||
    context.demographics.length > 0 || context.issues.length > 0 || !!context.timeframe;

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[var(--surface-card)]/70 backdrop-blur-sm shadow-sm overflow-hidden">

      {/* top bar: perspective toggle + clear */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-white/8 bg-slate-50/80 dark:bg-white/3">
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/12 bg-white dark:bg-white/6 p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => onPersonalizedChange(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${isPersonalized
              ? "bg-[var(--accent)] text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
          >
            <Sparkles className="h-3 w-3" /> For me
          </button>
          <button
            type="button"
            onClick={() => onPersonalizedChange(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${!isPersonalized
              ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
              }`}
          >
            <Users className="h-3 w-3" /> Everyone
          </button>
        </div>

        <button
          type="button"
          onClick={() => onChange(EMPTY_CONTEXT)}
          disabled={!hasAny}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${hasAny
            ? "border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
            : "border-slate-200 dark:border-white/8 bg-transparent text-slate-300 dark:text-slate-600 cursor-default"
            }`}
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      </div>

      {/* filter rows */}
      <div className="px-4 py-1">

        <FilterSection label="Borough">
          {BOROUGHS.map(opt => (
            <Pill key={opt} selected={context.borough === opt}
              onClick={() => set({ borough: context.borough === opt ? "" : opt })}>
              {opt}
            </Pill>
          ))}
        </FilterSection>

        <div className="flex gap-0">
          {/* Housing + Income share a row on wider screens */}
          <div className="flex-1 flex gap-3 items-start py-2.5 border-b border-slate-100 dark:border-white/6">
            <span className="w-20 flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-1 text-right">Housing</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {HOUSING.map(opt => (
                <Pill key={opt} selected={context.housing === opt}
                  onClick={() => set({ housing: context.housing === opt ? "" : opt })}>
                  {opt}
                </Pill>
              ))}
            </div>
          </div>
        </div>

        <FilterSection label="Income">
          {INCOME.map(opt => (
            <Pill key={opt} selected={context.income === opt}
              onClick={() => set({ income: context.income === opt ? "" : opt })}>
              {opt}
            </Pill>
          ))}
        </FilterSection>

        <FilterSection label="Age">
          {AGE.map(opt => (
            <Pill key={opt} selected={context.age === opt}
              onClick={() => set({ age: context.age === opt ? "" : opt })}>
              {opt}
            </Pill>
          ))}
        </FilterSection>

        {/* Demographics - multi-select */}
        <FilterSection label="I am">
          {DEMOGRAPHICS.map(opt => (
            <Pill key={opt} selected={context.demographics.includes(opt)}
              onClick={() => toggleArray("demographics", opt)}>
              {opt}
            </Pill>
          ))}
        </FilterSection>

        {/* Issue - multi-select */}
        <FilterSection label="Issue">
          {ISSUE_OPTIONS.map(opt => (
            <Pill key={opt.id} selected={context.issues.includes(opt.id)} color={opt.color}
              onClick={() => toggleArray("issues", opt.id)}>
              <opt.Icon className="h-3 w-3 flex-shrink-0" />
              {opt.label}
            </Pill>
          ))}
        </FilterSection>

        <FilterSection label="Timeframe">
          {TIMEFRAMES.map(opt => (
            <Pill key={opt} selected={context.timeframe === opt}
              onClick={() => set({ timeframe: context.timeframe === opt ? "" : opt })}>
              {opt}
            </Pill>
          ))}
        </FilterSection>

      </div>
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

  // sync context from profile when isPersonalized / "For Me" is toggled on
  const prevProfile = useRef(profile);
  const prevPersonalized = useRef(isPersonalized);

  useEffect(() => {
    const profileChanged = prevProfile.current !== profile;
    const personalizedTurnedOn = isPersonalized && !prevPersonalized.current;

    if (isPersonalized && (personalizedTurnedOn || profileChanged) && profile) {
      onContextChange({
        borough: profile.borough ?? "",
        housing: profile.housing ?? "",
        income: profile.income ?? "",
        age: profile.age ?? "",
        demographics: profile.demographics ?? [],
        issues: profile.issues ?? [],
        timeframe: context.timeframe, // preserve user-chosen timeframe
      });
    }
    if (!isPersonalized && prevPersonalized.current) {
      onContextChange(EMPTY_CONTEXT);
    }

    prevProfile.current = profile;
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

          {/* search bar + filter bar */}
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

              <FilterBar
                context={context}
                onChange={onContextChange}
                isPersonalized={isPersonalized}
                onPersonalizedChange={onPersonalizedChange}
              />
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}