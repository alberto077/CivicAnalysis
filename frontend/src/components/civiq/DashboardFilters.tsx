"use client";

const POLICY_AREAS = ["All", "Housing", "Education", "Policing", "Transit", "Environment", "Health", "Immigration"];
const TIME_RANGES = ["Last 30 Days", "Last 6 Months", "Current Session", "All Time"];
const LOCATIONS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

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
  return (
    <div className="w-full mb-2 sm:mb-4">
      <div className="glass-card surface-float soft-inset rounded-3xl p-6 flex flex-col gap-8 border-[var(--border)]">
        {/* Label + personalize toggle; then chips + Edit profile on one row */}
        <div className="space-y-3">
          <div className="flex flex-row items-center justify-between gap-4">
            <span className="min-w-0 text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
              Select Policy Area
            </span>
            <label className="group flex shrink-0 cursor-pointer items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-tighter text-[var(--muted)]">
                Personalize results
              </span>
              <div
                className={`relative h-4.5 w-8 rounded-full transition-colors ${isPersonalized ? "bg-[var(--accent)]" : "bg-gray-300"}`}
              >
                <div
                  className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${isPersonalized ? "left-4" : "left-0.5"}`}
                />
              </div>
              <input type="checkbox" className="hidden" checked={isPersonalized} onChange={(e) => setIsPersonalized(e.target.checked)} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {POLICY_AREAS.map(area => (
              <button
                key={area}
                type="button"
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                  selectedArea === area
                    ? "bg-[var(--accent)] text-white shadow-lg"
                    : "bg-white/50 text-[var(--foreground)] hover:bg-white border border-[var(--border)]"
                }`}
              >
                {area}
              </button>
            ))}
            <button
              type="button"
              onClick={onEditProfile}
              className="ml-auto shrink-0 rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Edit profile
            </button>
          </div>
        </div>

        {/* Secondary Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]/50">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">Target Location</span>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-white/85 border border-[var(--border)] text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
               {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">Timeframe</span>
            <select 
              value={selectedTime} 
              onChange={(e) => setSelectedTime(e.target.value)}
              className="bg-white/85 border border-[var(--border)] text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
               {TIME_RANGES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
