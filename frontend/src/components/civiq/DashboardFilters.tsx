"use client";

const POLICY_AREAS = ["All", "Housing", "Education", "Policing", "Transit", "Environment", "Health", "Immigration"];
const TIME_RANGES = ["Last 30 Days", "Last 6 Months", "Current Session", "All Time"];
const LOCATIONS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

export function DashboardFilters({ 
  selectedArea, setSelectedArea,
  selectedLocation, setSelectedLocation,
  selectedTime, setSelectedTime,
  isPersonalized, setIsPersonalized
}: { 
  selectedArea: string; setSelectedArea: (v: string) => void;
  selectedLocation: string; setSelectedLocation: (v: string) => void;
  selectedTime: string; setSelectedTime: (v: string) => void;
  isPersonalized: boolean; setIsPersonalized: (v: boolean) => void;
}) {
  return (
    <div className="w-full mt-8 mb-4">
      <div className="glass-card surface-float soft-inset rounded-3xl p-6 flex flex-col gap-8 border-[var(--border)]">
        {/* Topic Grid - No scrolling, just clean wrapping */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--muted)] tracking-widest uppercase">Select Policy Area</span>
            <label className="flex items-center gap-2 cursor-pointer group">
              <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-tighter">Personalize results</span>
              <div className={`w-8 h-4.5 rounded-full relative transition-colors ${isPersonalized ? "bg-[var(--accent)]" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${isPersonalized ? "left-4" : "left-0.5"}`} />
              </div>
              <input type="checkbox" className="hidden" checked={isPersonalized} onChange={(e) => setIsPersonalized(e.target.checked)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {POLICY_AREAS.map(area => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                  selectedArea === area 
                    ? 'bg-[var(--accent)] text-white shadow-lg' 
                    : 'bg-white/50 text-[var(--foreground)] hover:bg-white border border-[var(--border)]'
                }`}
              >
                {area}
              </button>
            ))}
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
