"use client";
import { useEffect, useId, useRef, useState, useMemo } from "react";
import { ChevronDown, Info, Sparkles, Users, Settings, Map as MapIcon, Layers } from "lucide-react";
import { POLICY_AREAS } from "@/lib/policyMetadata";
import { type CivicProfile } from "@/lib/useProfile";

const TIME_RANGES = ["Last 30 Days", "Last 6 Months", "All Time"] as const;
const LOCATIONS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

const TRIGGER =
  "filter-dd-trigger font-work-sans flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.26)_100%)] px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.02em] text-[var(--foreground)] shadow-[0_10px_36px_-18px_rgba(26,54,93,0.22),0_2px_14px_-4px_rgba(15,23,42,0.08)] backdrop-blur-[28px] outline-none transition hover:brightness-[1.04] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] dark:hover:brightness-100";

const PANEL =
  "filter-dd-panel absolute left-0 right-0 z-[70] mt-1 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.94)_100%)] py-1 shadow-[0_16px_44px_-16px_rgba(26,54,93,0.355)] backdrop-blur-xl dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,rgba(28,36,44,0.99)_0%,rgba(18,22,28,0.98)_100%)]";

function FilterDropdown({ instanceId, value, options, onChange }: {
  instanceId: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={open}
        aria-controls={`${instanceId}-lb`} className={TRIGGER} onClick={() => setOpen((o) => !o)}>
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <ChevronDown className={`pointer-events-none size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 dark:text-[var(--icon-violet)] ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <ul id={`${instanceId}-lb`} role="listbox" className={PANEL}>
          {options.map((opt) => (
            <li key={opt} role="none" className="px-0.5">
              <button type="button" role="option" aria-selected={value === opt}
                className={`filter-dd-option font-work-sans flex w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium tracking-[0.02em] transition ${value === opt ? "bg-white/45 text-[var(--accent)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent-soft)]" : "text-[var(--foreground)] hover:bg-white/38 dark:hover:bg-[var(--surface-elevated)]/70"}`}
                onClick={() => { onChange(opt); setOpen(false); triggerRef.current?.focus(); }}>
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DashboardFilters({
  selectedLocation, setSelectedLocation,
  selectedTime, setSelectedTime,
  isPersonalized, setIsPersonalized,
  onEditProfile,
  selectedArea, setSelectedArea,
  mapMode, setMapMode,
  profile,
}: {
  selectedLocation: string; setSelectedLocation: (v: string) => void;
  selectedTime: string; setSelectedTime: (v: string) => void;
  isPersonalized: boolean; setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
  selectedArea: string; setSelectedArea: (v: string) => void;
  mapMode: "vector" | "satellite"; setMapMode: (v: "vector" | "satellite") => void;
  profile: CivicProfile | null;
}) {
  const tipId = `personalize-tip-${useId().replace(/:/g, "")}`;
  const locId = `dd-loc-${useId().replace(/:/g, "")}`;
  const timeId = `dd-time-${useId().replace(/:/g, "")}`;

  const profileAreaIds = useMemo(() => {
    if (!isPersonalized || !profile) return new Set<string>();
    return new Set<string>(profile.issues ?? []);
  }, [isPersonalized, profile]);

  return (
    <div className="relative z-40 w-full">
      <div className="glass-card surface-float soft-inset rounded-3xl px-6 py-5 border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 backdrop-blur-md shadow-sm flex flex-col gap-5">

        {/* Dropdowns and Control Toggles */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,1.3fr)] lg:items-end lg:gap-x-8">

          {/* Location Dropdown */}
          <div className="flex flex-col gap-2">
            <span className="font-work-sans text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Location</span>
            <FilterDropdown instanceId={locId} value={selectedLocation} options={LOCATIONS} onChange={setSelectedLocation} />
          </div>

          {/* Timeframe Dropdown */}
          <div className="flex flex-col gap-2">
            <span className="font-work-sans text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Timeframe</span>
            <FilterDropdown instanceId={timeId} value={selectedTime} options={TIME_RANGES} onChange={setSelectedTime} />
          </div>

          {/* Personalize/Generalize Toggle + Settings*/}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-work-sans text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Perspective</span>
              <span className="group relative inline-flex shrink-0">
                <button type="button" aria-label="How perspective works" aria-describedby={tipId}
                  className="rounded-full p-0.5 text-[var(--muted)] transition hover:text-[var(--foreground)] dark:text-[var(--icon-amber)]">
                  <Info className="size-3.5" strokeWidth={2} aria-hidden />
                </button>
                <span id={tipId} role="tooltip"
                  className="pointer-events-none invisible absolute left-1/2 bottom-full z-[80] mb-2 w-[min(16rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.96)_100%)] px-3 py-2.5 font-work-sans text-[11px] font-medium leading-relaxed text-[var(--foreground)] shadow-[0_12px_36px_-14px_rgba(26,54,93,0.35)] opacity-0 backdrop-blur-xl transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,rgba(28,36,44,0.99)_0%,rgba(22,28,36,0.98)_100%)]">
                  <strong>Personalized</strong> filters by your saved borough, housing, demographics, and selected interest areas. <strong>Generalized</strong> applies city-wide standards for general exploration.
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-[var(--border)] bg-slate-100/60 dark:bg-[var(--surface-elevated)]/60 p-0.5 shadow-inner gap-0.5 h-[38px]">
                <button
                  type="button"
                  onClick={() => setIsPersonalized(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all h-full ${isPersonalized
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Personalized
                </button>
                <button
                  type="button"
                  onClick={() => setIsPersonalized(false)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all h-full ${!isPersonalized
                    ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/10"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Generalized
                </button>
              </div>

              {/* Settings button */}
              <button
                type="button"
                onClick={onEditProfile}
                className="font-work-sans flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white/80 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--foreground)] transition-all hover:bg-slate-50 active:scale-[0.98] shadow-sm dark:bg-[var(--surface-elevated)] dark:hover:bg-[var(--surface-elevated)]/80 h-[38px]"
              >
                <Settings className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Map Mode control */}
          <div className="flex flex-col gap-2">
            <span className="font-work-sans text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Map Mode</span>
            <div className="flex items-center rounded-xl border border-[var(--border)] bg-slate-100/60 dark:bg-[var(--surface-elevated)]/60 p-0.5 shadow-inner gap-0.5 h-[38px] w-full lg:w-fit">
              <button
                type="button"
                onClick={() => setMapMode("vector")}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all h-full flex-1 lg:flex-none ${mapMode === "vector"
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                Vector
              </button>
              <button
                type="button"
                onClick={() => setMapMode("satellite")}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold transition-all h-full flex-1 lg:flex-none ${mapMode === "satellite"
                  ? "bg-white dark:bg-[var(--surface-card)] text-[var(--foreground)] shadow-sm border border-[var(--border)]/10"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Satellite
              </button>
            </div>
          </div>

        </div>

        {/* Issue Tags/Filters */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border)]/40">
          <span className="font-work-sans text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Issue Focus</span>
          <div className="flex flex-wrap gap-1.5">
            {POLICY_AREAS.map((area) => {
              const Icon = area.Icon;
              const isActive = selectedArea === area.id;
              const isInterest = profileAreaIds.has(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedArea(area.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${isActive
                    ? "border-transparent text-white shadow-sm"
                    : isInterest
                      ? "bg-amber-50/70 dark:bg-amber-950/15 border-amber-200/90 dark:border-amber-800/40 text-amber-700 dark:text-amber-400"
                      : "bg-white/50 dark:bg-[var(--surface-card)]/50 border-[var(--border)]/50 text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--foreground)]"
                    }`}
                  style={isActive ? { background: area.color, boxShadow: `0 2px 8px -2px ${area.color}70` } : undefined}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {area.label}
                  {isInterest && !isActive && <Sparkles className="h-2.5 w-2.5 text-amber-400 shrink-0 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
