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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-8">
      <div className="glass-card surface-float soft-inset rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row gap-4 items-center justify-between border-[var(--border)]">
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 md:pb-0 scrollbar-hide py-1">
          <span className="text-sm font-semibold text-[var(--muted)] mr-2 tracking-widest font-condensed uppercase shrink-0">Topic:</span>
          {POLICY_AREAS.map(area => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
                selectedArea === area 
                  ? 'bg-[linear-gradient(135deg,var(--accent)_0%,#2f5f96_100%)] text-white shadow-[0_8px_20px_-12px_rgba(26,54,93,0.55)]' 
                  : 'bg-white/65 text-[var(--foreground)] hover:bg-white border border-[var(--border)] hover:-translate-y-0.5'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
           <label className="flex items-center gap-2 cursor-pointer group shrink-0">
             <div className={`w-8 h-4.5 rounded-full relative transition-colors ${isPersonalized ? "bg-[var(--accent)]" : "bg-gray-300"}`}>
               <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${isPersonalized ? "left-4" : "left-0.5"}`} />
             </div>
             <span className="text-[13px] font-semibold text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors uppercase tracking-tight hidden sm:block">
               {isPersonalized ? "Profile Active" : "Generic Data"}
             </span>
             <input type="checkbox" className="hidden" checked={isPersonalized} onChange={(e) => setIsPersonalized(e.target.checked)} />
           </label>

           <div className="flex gap-3">
             <select 
               value={selectedLocation} 
               onChange={(e) => setSelectedLocation(e.target.value)}
               className="bg-white/85 border border-[var(--border)] text-[13px] font-medium rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--accent-soft)] shadow-[0_8px_18px_-14px_rgba(20,39,64,0.6)]"
             >
                {LOCATIONS.map(l => <option key={l}>{l}</option>)}
             </select>
             <select 
               value={selectedTime} 
               onChange={(e) => setSelectedTime(e.target.value)}
               className="bg-white/85 border border-[var(--border)] text-[13px] font-medium rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--accent-soft)] shadow-[0_8px_18px_-14px_rgba(20,39,64,0.6)]"
             >
                {TIME_RANGES.map(t => <option key={t}>{t}</option>)}
             </select>
           </div>
        </div>
      </div>
    </div>
  );
}
