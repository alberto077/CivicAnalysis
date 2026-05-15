"use client";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";

type HeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  loading: boolean;
  onSearch: () => void | Promise<void>;
};

const HEADLINE_LETTER_STAGGER = 0.14;
const HEADLINE_LETTER_DURATION = 1.05;
const headlineLetterEase: [number, number, number, number] = [0.16, 1, 0.32, 1];

const headlineLetterVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: HEADLINE_LETTER_DURATION,
      ease: headlineLetterEase,
    },
  },
};

export function Hero({ query, onQueryChange, loading, onSearch }: HeroProps) {
  const headlineIntro = "A Reflection";
  const headlineFocus = "Of Your City";
  const introLen = headlineIntro.length;
  /** Same rhythm as line 1: start after line 1’s letters have begun their cascade (+ short pause). */
  const line2DelayChildren =
    0.22 + introLen * HEADLINE_LETTER_STAGGER + 0.12;

  return (
    <section className="relative overflow-hidden pb-24 pt-24 sm:pb-32 sm:pt-28">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.82]"
        style={{ backgroundImage: "url('/images/skylinehero.png')" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,255,0.48)_0%,rgba(248,251,255,0.28)_42%,rgba(248,251,255,0.42)_100%)] dark:bg-[linear-gradient(180deg,rgba(11,15,20,0.55)_0%,rgba(11,15,20,0.75)_45%,rgba(11,15,20,0.88)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(248,251,255,0)_0%,rgba(248,251,255,0.92)_100%)] dark:bg-[linear-gradient(180deg,rgba(11,15,20,0)_0%,rgba(11,15,20,0.97)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(231,241,250,0.7)_0%,rgba(231,241,250,0.28)_56%,rgba(231,241,250,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(20,28,38,0.5)_0%,rgba(11,15,20,0)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-36 w-[52%] bg-[radial-gradient(ellipse_at_top_right,rgba(229,240,250,0.86)_0%,rgba(229,240,250,0.5)_44%,rgba(229,240,250,0.18)_70%,rgba(229,240,250,0)_100%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(60,80,108,0.25)_0%,rgba(11,15,20,0)_70%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-4xl">
        <div className="grid grid-cols-1 items-center gap-12">
          <div className="mx-auto w-full text-center opacity-85">
          <h1 className="font-limelight mx-auto mt-5 max-w-3xl text-center text-[2.9rem] leading-[1.08] tracking-[3.8px] text-[rgba(20,31,45,0.92)] sm:text-[3.6rem] md:text-[4.2rem] lg:text-[4.65rem] dark:text-[var(--foreground)]">
            <motion.span
              className="block w-full"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: HEADLINE_LETTER_STAGGER,
                    delayChildren: 0.22,
                  },
                },
              }}
            >
              {headlineIntro.split("").map((char, index) => (
                <motion.span
                  key={`headline-intro-${index}`}
                  className="inline-block"
                  variants={headlineLetterVariants}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.span>
            <motion.span
              className="hero-wordmark-reflect mt-1.5 block w-full text-center"
              data-reflect="Of Your City"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: HEADLINE_LETTER_STAGGER,
                    delayChildren: line2DelayChildren,
                  },
                },
              }}
            >
              {headlineFocus.split("").map((char, index) => (
                <motion.span
                  key={`headline-focus-${index}`}
                  className="hero-gradient-text inline-block"
                  variants={headlineLetterVariants}
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            className="font-limelight mx-auto mt-4 max-w-2xl text-balance text-[18px] font-extrabold tracking-[1.3px] text-[rgba(20,31,45,1)] dark:text-[var(--foreground-secondary)]"
          >
            Where Policy Decisions Become Visible
          </motion.p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.16 }}
          className="mt-10 w-full min-w-0"
          onSubmit={(e) => {
            e.preventDefault();
            void onSearch();
          }}
        >
          <label htmlFor="location-search" className="font-work-sans sr-only">
            Ask about your neighborhood, local policies, budgets, or city decisions
          </label>
          <div className="hero-search-shell glass-card search-shell command-shell group mx-auto flex h-14 w-full max-w-full items-center gap-2 rounded-[23px] py-0 pl-[clamp(0.75rem,2vw,1.125rem)] pr-[clamp(0.85rem,2.3vw,1.25rem)] leading-[25px] transition-[box-shadow,transform] duration-300 sm:h-[3.625rem] sm:gap-3 md:h-[61px] md:gap-[clamp(0.5rem,1.5vw,0.75rem)]">
            <span
              className="hero-search-icon-wrap relative box-content flex shrink-0 overflow-visible border-0 [border-image:none] rounded-none opacity-100 my-0.5 -mx-0.5 text-white"
              aria-hidden
            >
              <Search
                className="hero-search-icon-glow relative z-0 box-content h-[clamp(1.05rem,min(1.35rem,38cqh),1.5rem)] w-[clamp(1.05rem,min(1.35rem,38cqh),1.5rem)] shrink-0 text-white transition-transform duration-300 group-focus-within:scale-105"
                strokeWidth={1.75}
                aria-hidden
              />
            </span>
            <input
              id="location-search"
              type="text"
              name="location"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ask about your Neighborhood"
              disabled={loading}
              className="font-work-sans min-w-0 flex-1 border-0 bg-transparent pb-0 pt-0 text-[18px] font-medium tracking-[1.2px] text-[rgba(20,31,45,0.7)] opacity-[0.88] [-webkit-background-clip:unset] [background-clip:unset] placeholder:text-[0.98rem] placeholder:text-slate-400 placeholder:font-normal shadow-none focus:outline-none focus:ring-0 enabled:cursor-text disabled:opacity-60 dark:text-white dark:opacity-100 dark:placeholder:text-zinc-300"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-label={loading ? "Loading briefing" : "Submit briefing request"}
              className="command-submit hero-droplet-submit relative box-border flex h-[clamp(2rem,calc(100cqh-22px),2.75rem)] w-[clamp(2rem,calc(100cqh-22px),2.75rem)] shrink-0 items-center justify-center overflow-visible border-0 bg-transparent p-0 shadow-none transition-[transform,filter] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(0,0,0,0.08)] disabled:pointer-events-none dark:focus-visible:ring-sky-200/45 dark:focus-visible:ring-offset-[rgba(255,255,255,0.06)]"
            >
              <span className="sr-only">{loading ? "Briefing…" : "Get briefing"}</span>
              <ArrowRight
                className="hero-submit-arrow relative z-10 block h-[clamp(0.95rem,calc(0.32 * 100cqh - 2px),1.25rem)] w-[clamp(0.95rem,calc(0.32 * 100cqh - 2px),1.25rem)] shrink-0 text-white"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          </div>
        </motion.form>
        </div>
      </div>
    </section>
  );
}
