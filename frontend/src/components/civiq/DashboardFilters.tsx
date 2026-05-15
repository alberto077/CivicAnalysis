"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  Building2,
  BusFront,
  ChevronDown,
  GraduationCap,
  HeartPulse,
  Home,
  Info,
  Leaf,
  Scale,
  Shield,
} from "lucide-react";

const POLICY_AREAS = ["All", "Housing", "Education", "Policing", "Transit", "Environment", "Health", "Immigration"];
const TIME_RANGES = ["Last 30 Days", "Last 6 Months", "All Time"];
const LOCATIONS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const FILTER_DROPDOWN_TRIGGER =
  "filter-dd-trigger font-work-sans flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.26)_100%)] px-4 py-2.5 text-left text-[13px] font-medium tracking-[0.02em] text-[var(--foreground)] shadow-[0_10px_36px_-18px_rgba(26,54,93,0.22),0_2px_14px_-4px_rgba(15,23,42,0.08)] backdrop-blur-[28px] outline-none transition hover:brightness-[1.04] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] focus-visible:outline-none dark:hover:brightness-100";

const FILTER_DROPDOWN_PANEL =
  "filter-dd-panel absolute left-0 right-0 z-[70] mt-1 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(248,251,255,0.94)_100%)] py-1 shadow-[0_16px_44px_-16px_rgba(26,54,93,0.3),0_4px_18px_-6px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,rgba(28,36,44,0.99)_0%,rgba(18,22,28,0.98)_100%)]";

const AREA_ICONS = {
  All: Building2,
  Housing: Home,
  Education: GraduationCap,
  Policing: Shield,
  Transit: BusFront,
  Environment: Leaf,
  Health: HeartPulse,
  Immigration: Scale,
} as const;

function FilterDropdown({
  instanceId,
  value,
  options,
  onChange,
}: {
  instanceId: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = `${instanceId}-listbox`;

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={FILTER_DROPDOWN_TRIGGER}
        onClick={() => setOpen(o => !o)}
      >
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <ChevronDown
          className={`pointer-events-none size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ease-out dark:text-[var(--icon-violet)] ${open ? "rotate-180" : "rotate-0"}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={FILTER_DROPDOWN_PANEL}
        >
          {options.map(opt => (
            <li key={opt} role="none" className="px-0.5">
              <button
                type="button"
                role="option"
                aria-selected={value === opt}
                className={`filter-dd-option font-work-sans flex w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium tracking-[0.02em] transition ${
                  value === opt
                    ? "bg-white/45 text-[var(--accent)] filter-dd-option-active dark:bg-[var(--surface-elevated)] dark:text-[var(--accent-soft)]"
                    : "text-[var(--foreground)] hover:bg-white/38 dark:hover:bg-[var(--surface-elevated)]/70"
                }`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DashboardFilters({
  selectedArea, setSelectedArea,
  selectedLocation, setSelectedLocation,
  selectedTime, setSelectedTime,
  isPersonalized, setIsPersonalized,
  onEditProfile,
}: {
  selectedArea: string; setSelectedArea: (v: string) => void;
  selectedLocation: string; setSelectedLocation: (v: string) => void;
  selectedTime: string; setSelectedTime: (v: string) => void;
  isPersonalized: boolean; setIsPersonalized: (v: boolean) => void;
  onEditProfile: () => void;
}) {
  const personalizeInputId = `personalize-cb-${useId().replace(/:/g, "")}`;
  const personalizeTooltipId = `personalize-tip-${useId().replace(/:/g, "")}`;
  const locationDdId = `dd-loc-${useId().replace(/:/g, "")}`;
  const timeDdId = `dd-time-${useId().replace(/:/g, "")}`;

  return (
    <div className="relative z-40 w-full mb-2 sm:mb-4">
      <div className="glass-card surface-float soft-inset rounded-3xl p-6 flex flex-col gap-8 border-[var(--border)]">
        {/* Policy area heading + chips */}
        <div className="space-y-3">
          <span className="font-work-sans block min-w-0 whitespace-nowrap text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
            Select Policy Area
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            {POLICY_AREAS.map(area => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`filter-pill inline-flex items-center gap-2 rounded-xl border-0 px-4 py-2 text-[13px] font-medium ${
                  selectedArea === area
                    ? "filter-pill-active bg-[linear-gradient(155deg,#f7a8af_0%,#ee7a85_100%)] text-white dark:bg-[linear-gradient(155deg,rgba(140,78,84,0.65)_0%,rgba(95,48,52,0.75)_100%)] dark:text-[#f0eceb] dark:shadow-[0_0_20px_-8px_rgba(168,92,98,0.35)]"
                    : "bg-[linear-gradient(to_bottom,#fcfdfe_0%,#f5f9fc_50%,#eef4f9_100%)] text-[var(--foreground)] hover:brightness-[1.02] dark:bg-[linear-gradient(180deg,#151b22_0%,#0f1318_100%)] dark:hover:translate-y-[-1px] dark:hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)]"
                }`}
              >
                {(() => {
                  const Icon = AREA_ICONS[area as keyof typeof AREA_ICONS];
                  return (
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        selectedArea === area
                          ? "text-white dark:text-[#f0eceb]"
                          : "text-[var(--foreground)] dark:text-[#aedff4]"
                      }`}
                      aria-hidden
                    />
                  );
                })()}
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Location, timeframe, then personalize + edit profile */}
        <div className="grid grid-cols-1 gap-4 border-t border-[var(--border)]/50 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-start lg:gap-x-6">
          <div className="flex flex-col gap-2">
            <span className="font-work-sans whitespace-nowrap text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Target Location
            </span>
            <FilterDropdown
              instanceId={locationDdId}
              value={selectedLocation}
              options={LOCATIONS}
              onChange={setSelectedLocation}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-work-sans whitespace-nowrap text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Timeframe
            </span>
            <FilterDropdown
              instanceId={timeDdId}
              value={selectedTime}
              options={TIME_RANGES}
              onChange={setSelectedTime}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 lg:max-w-none">
            <div className="flex min-w-0 items-center gap-1">
              <label
                htmlFor={personalizeInputId}
                className="font-work-sans min-w-0 cursor-pointer truncate text-xs font-bold uppercase tracking-widest text-[var(--muted)]"
              >
                Personalize results
              </label>
              <span className="group relative inline-flex shrink-0">
                <button
                  type="button"
                  className="rounded-full p-0.5 text-[var(--muted)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)] dark:text-[var(--icon-amber)] dark:hover:text-[var(--icon-cyan)]"
                  aria-label="How personalize results works"
                  aria-describedby={personalizeTooltipId}
                >
                  <Info className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                </button>
                <span
                  id={personalizeTooltipId}
                  role="tooltip"
                  className="pointer-events-none invisible absolute left-1/2 top-full z-[80] mt-1.5 w-[min(15rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,251,255,0.96)_100%)] px-3 py-2 font-work-sans text-[11px] font-medium leading-snug tracking-[0.01em] text-[var(--foreground)] shadow-[0_12px_36px_-14px_rgba(26,54,93,0.35)] opacity-0 backdrop-blur-xl transition-[opacity,visibility] duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,rgba(28,36,44,0.99)_0%,rgba(22,28,36,0.98)_100%)]"
                >
                  When on, we use your saved borough and interests with these filters. When off, only the filters above apply.
                </span>
              </span>
            </div>
            <div className="flex flex-nowrap items-center gap-3">
              <input
                id={personalizeInputId}
                type="checkbox"
                className="peer sr-only"
                checked={isPersonalized}
                onChange={(e) => setIsPersonalized(e.target.checked)}
              />
              <label
                htmlFor={personalizeInputId}
                className="inline-flex shrink-0 cursor-pointer rounded-full peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent-soft)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent-soft)]/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--background)]"
              >
                <span className="inline-flex text-[clamp(12px,2.6vmin,16px)]">
                  <span
                    className={`relative box-border flex h-[1.5em] min-h-[1.5em] max-h-[1.5em] w-[2.75em] min-w-[2.75em] max-w-[2.75em] shrink-0 items-center rounded-full border border-solid px-[0.1875em] backdrop-blur-[14px] transition-[background,box-shadow,border-color] duration-300 ease-out ${
                      isPersonalized
                        ? "border-white/45 bg-[linear-gradient(128deg,rgba(26,54,93,0.4)_0%,rgba(90,140,180,0.34)_45%,rgba(230,100,112,0.28)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_3px_14px_-4px_rgba(26,54,93,0.22),0_8px_26px_-12px_rgba(26,54,93,0.3)]"
                        : "border-[rgba(26,54,93,0.28)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(214,226,240,0.88)_55%,rgba(196,212,228,0.82)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_3px_14px_-4px_rgba(15,23,42,0.14),0_8px_26px_-12px_rgba(26,54,93,0.28)]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`pointer-events-none box-border block size-[1.125em] min-h-[1.125em] min-w-[1.125em] max-h-[1.125em] max-w-[1.125em] shrink-0 rounded-full border border-solid bg-[linear-gradient(168deg,rgba(255,255,255,0.98)_0%,rgba(236,246,255,0.72)_55%,rgba(255,255,255,0.88)_100%)] backdrop-blur-[6px] transition-[transform,box-shadow,border-color] duration-[1600ms] ease-[cubic-bezier(0.4,0,0.15,1)] will-change-transform ${
                        isPersonalized
                          ? "translate-x-[1.25em] border-white/80 shadow-[0_2px_10px_-3px_rgba(26,54,93,0.22),inset_0_1px_0_rgba(255,255,255,0.95)]"
                          : "translate-x-0 border-[rgba(26,54,93,0.22)] shadow-[0_2px_12px_-2px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,1)]"
                      }`}
                    />
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={onEditProfile}
                className="filter-pill font-work-sans shrink-0 rounded-xl border-0 bg-[linear-gradient(to_bottom,#fcfdfe_0%,#f5f9fc_50%,#eef4f9_100%)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--foreground)] transition duration-300 hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)] dark:bg-[linear-gradient(180deg,#151b22_0%,#0f1318_100%)] dark:hover:translate-y-[-1px] dark:hover:shadow-[0_6px_16px_-10px_rgba(0,0,0,0.45)]"
              >
                Edit profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
