"use client";
import { motion } from "framer-motion";

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
      <div
        className="pointer-events-none absolute inset-x-0 top-10 h-[420px] bg-[linear-gradient(180deg,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[7%] top-[26%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(230,57,70,0.14)_0%,rgba(230,57,70,0)_70%)] blur-2xl"
        aria-hidden
      />
      <SkylineDecor className="text-[var(--accent)] opacity-20" />
      <SkylineDecor className="text-[var(--accent-mid)] opacity-[0.08] translate-x-4 translate-y-2" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <div className="lg:pr-4">
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="font-display mt-5 max-w-3xl text-[2.9rem] font-bold leading-[0.97] tracking-[-0.01em] text-[var(--foreground)] sm:text-[3.6rem] md:text-[4.2rem] lg:text-[4.65rem]"
          >
            Understand Policies That Shape{" "}
            <span className="hero-gradient-text hero-wordmark-reflect" data-reflect="Your Neighborhood">
              Your Neighborhood
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)]/80 sm:text-lg"
          >
            Your AI-powered civic research assistant
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
            className="mt-10 max-w-full lg:max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              void onSearch();
            }}
          >
            <label htmlFor="location-search" className="sr-only">
              Ask about your neighborhood, local policies, budgets, or city decisions
            </label>
            <div className="glass-card search-shell command-shell group flex min-h-[5.3rem] items-center gap-3 rounded-[1.7rem] border border-white/80 bg-[linear-gradient(152deg,rgba(255,255,255,0.93)_0%,rgba(255,255,255,0.78)_100%)] px-5 py-3 shadow-[0_22px_46px_-20px_rgba(13,27,42,0.32)] sm:gap-4 sm:px-7 sm:py-4 md:min-h-[5.8rem]">
              <span className="text-[var(--muted)]" aria-hidden>
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.65"
                  className="opacity-75 transition-transform duration-300 group-focus-within:scale-105"
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
                placeholder="Ask about your Neighborhood"
                disabled={loading}
                className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[1.1rem] text-[var(--foreground)] placeholder:text-[0.98rem] placeholder:text-[var(--muted)]/85 focus:outline-none focus:ring-0 enabled:cursor-text disabled:opacity-60 sm:text-[1.18rem]"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                aria-label={loading ? "Loading briefing" : "Submit briefing request"}
                className="command-submit shrink-0 rounded-[1.15rem] bg-[var(--accent-mid)] px-4 py-3 text-white shadow-[0_14px_24px_-14px_rgba(230,57,70,0.7)] transition-all duration-300 ease-out hover:brightness-110 disabled:pointer-events-none disabled:opacity-50 sm:px-5"
              >
                <span className="sr-only">{loading ? "Briefing…" : "Get briefing"}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M5 12h13" strokeLinecap="round" />
                  <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.form>
        </div>

        <div className="hidden lg:flex justify-end items-center drop-shadow-2xl opacity-95 hover:opacity-100 transition-opacity duration-500">
          <img
            src="/image2.png"
            alt="Civic Spiegel Network"
            className="w-full max-w-[540px] xl:max-w-[620px] object-contain scale-[1.05]"
            style={{
              WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 75%)",
              maskImage: "radial-gradient(circle at center, black 40%, transparent 75%)"
            }}
          />
        </div>
      </div>
    </section>
  );
}
