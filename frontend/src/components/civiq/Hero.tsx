"use client";
import { motion } from "framer-motion";

type HeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  onSearch: () => void | Promise<void>;
};

export function Hero({ query, onQueryChange, loading, onSearch }: HeroProps) {
  const headlineIntro = "A Reflection";
  const headlineFocus = "Of Your City";

  return (
    <section className="relative overflow-hidden pb-24 pt-10 sm:pb-32 sm:pt-16">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.82]"
        style={{ backgroundImage: "url('/images/skylinehero.png')" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,255,0.48)_0%,rgba(248,251,255,0.28)_42%,rgba(248,251,255,0.42)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(248,251,255,0)_0%,rgba(248,251,255,0.92)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(231,241,250,0.7)_0%,rgba(231,241,250,0.28)_56%,rgba(231,241,250,0)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-36 w-[52%] bg-[radial-gradient(ellipse_at_top_right,rgba(229,240,250,0.86)_0%,rgba(229,240,250,0.5)_44%,rgba(229,240,250,0.18)_70%,rgba(229,240,250,0)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 opacity-85 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12">
          <div className="mx-auto text-center">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.035,
                  delayChildren: 0.2
                }
              }
            }}
            className="font-limelight mx-auto mt-5 max-w-3xl text-right text-[2.9rem] leading-[1.08] tracking-[3.8px] text-[rgba(20,31,45,0.92)] sm:text-[3.6rem] md:text-[4.2rem] lg:text-[4.65rem]"
          >
            <span className="block">
              {headlineIntro.split("").map((char, index) => (
                <motion.span
                  key={`headline-intro-${index}`}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                    }
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
            <span
              className="hero-gradient-text hero-wordmark-reflect mt-1.5 block pl-[0.62em] text-right sm:pl-[0.78em]"
              data-reflect="Of Your City"
            >
              {headlineFocus.split("").map((char, index) => (
                <motion.span
                  key={`headline-focus-${index}`}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                    }
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            className="font-limelight mx-auto mt-4 max-w-2xl text-balance text-[18px] font-extrabold tracking-[1.3px] text-[rgba(20,31,45,1)]"
          >
            Where Policy Decisions Become Visible
          </motion.p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
          className="mx-auto mt-10 w-full max-w-4xl"
          onSubmit={(e) => {
            e.preventDefault();
            void onSearch();
          }}
        >
          <label htmlFor="location-search" className="font-work-sans sr-only">
            Ask about your neighborhood, local policies, budgets, or city decisions
          </label>
          <div className="glass-card search-shell command-shell group flex h-[61px] w-full max-w-[904px] items-center gap-3 rounded-[23px] border border-white/80 bg-[linear-gradient(152deg,rgba(255,255,255,0.93)_0%,rgba(255,255,255,0.78)_100%)] px-[9px] py-0 leading-[25px] shadow-[0_22px_46px_-20px_rgba(13,27,42,0.32)] sm:gap-4">
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
              className="font-work-sans min-w-0 flex-1 border-0 bg-transparent pb-0 pt-0 text-[18px] font-medium tracking-[1.2px] text-[rgba(20,31,45,0.7)] opacity-[0.88] placeholder:text-[0.98rem] placeholder:text-[var(--muted)]/85 placeholder:font-normal focus:outline-none focus:ring-0 enabled:cursor-text disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-label={loading ? "Loading briefing" : "Submit briefing request"}
              className="command-submit shrink-0 rounded-[1.15rem] bg-[var(--accent-mid)] px-4 py-3 text-slate-50 shadow-[0_14px_24px_-14px_rgba(230,57,70,0.7)] transition-all duration-300 ease-out hover:brightness-110 disabled:pointer-events-none disabled:opacity-50 sm:px-5"
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
    </section>
  );
}
