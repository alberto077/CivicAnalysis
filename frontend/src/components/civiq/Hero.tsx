"use client";

function SkylineDecor({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 ${className ?? ""}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 1200 200"
        className="h-44 w-full min-w-[800px] text-[var(--accent-soft)] opacity-[0.38] sm:h-52 md:h-60"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="bldg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <rect x="40" y="70" width="52" height="130" rx="4" fill="url(#bldg)" />
        <rect x="110" y="95" width="44" height="105" rx="4" fill="url(#bldg)" />
        <rect x="175" y="50" width="68" height="150" rx="4" fill="url(#bldg)" />
        <rect x="265" y="85" width="56" height="115" rx="4" fill="url(#bldg)" />
        <rect x="340" y="60" width="48" height="140" rx="4" fill="url(#bldg)" />
        <rect x="405" y="100" width="72" height="100" rx="4" fill="url(#bldg)" />
        <rect x="495" y="45" width="60" height="155" rx="4" fill="url(#bldg)" />
        <rect x="575" y="78" width="40" height="122" rx="4" fill="url(#bldg)" />
        <rect x="635" y="55" width="80" height="145" rx="4" fill="url(#bldg)" />
        <rect x="735" y="92" width="55" height="108" rx="4" fill="url(#bldg)" />
        <rect x="810" y="65" width="64" height="135" rx="4" fill="url(#bldg)" />
        <rect x="895" y="88" width="48" height="112" rx="4" fill="url(#bldg)" />
        <rect x="960" y="52" width="90" height="148" rx="4" fill="url(#bldg)" />
        <rect x="1065" y="75" width="50" height="125" rx="4" fill="url(#bldg)" />
      </svg>
    </div>
  );
}

type HeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  onSearch: () => void | Promise<void>;
};

export function Hero({ query, onQueryChange, loading, onSearch }: HeroProps) {
  return (
    <section className="relative overflow-hidden pb-24 pt-10 sm:pb-32 sm:pt-16">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-[480px] w-[min(920px,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(230,57,70,0.08)_0%,rgba(26,54,93,0.05)_45%,transparent_70%)]"
        aria-hidden
      />
      <SkylineDecor className="text-[var(--accent)] opacity-20" />
      <SkylineDecor className="text-[var(--accent-mid)] opacity-[0.08] translate-x-4 translate-y-2" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)] sm:text-xs">
          Civic Spiegel
        </p>
        <h1 className="font-display mt-5 max-w-4xl text-[2.35rem] font-semibold leading-[1.06] tracking-tight text-[var(--foreground)] sm:text-5xl md:text-6xl lg:text-[4.15rem] lg:leading-[1.04]">
          Understand Policies That Affect{" "}
          <span className="hero-gradient-text">Your Neighborhood</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--muted)] sm:text-xl">
          Your AI-powered civic research assistant
        </p>

        <form
          className="mt-12 max-w-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            void onSearch();
          }}
        >
          <label htmlFor="location-search" className="sr-only">
            Ask about your neighborhood, local policies, budgets, or city decisions
          </label>
          <div className="glass-card search-shell flex min-h-[3.75rem] items-center gap-3 rounded-2xl px-4 py-2 sm:gap-4 sm:px-5 sm:py-3 md:min-h-[4.25rem]">
            <span className="text-[var(--muted)]" aria-hidden>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.65"
                className="opacity-65"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" strokeLinecap="round" />
              </svg>
            </span>
            <input
              id="location-search"
              type="search"
              name="location"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ask about your neighborhood, local policies, budgets, or city decisions..."
              disabled={loading}
              className="focus-soft min-w-0 flex-1 border-0 bg-transparent py-2 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-0 enabled:cursor-text disabled:opacity-60 sm:text-[17px]"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-premium shrink-0 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50 sm:px-6 sm:text-[15px]"
            >
              {loading ? "Briefing…" : "Get briefing"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
