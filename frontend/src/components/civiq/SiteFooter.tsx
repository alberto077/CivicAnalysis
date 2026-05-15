import { Scale } from "lucide-react";

const links = [
  { label: "Data Sources", href: "/data-sources" },
  { label: "Github", href: "https://github.com/alberto077/CivicAnalysis"},
  { label: "About", href: "/about" },
] as const;

export function SiteFooter() {
  return (
    <footer id="site-footer" className="relative z-10 mt-16 px-4 pb-5 sm:px-6 lg:px-8">
      <div className="surface-float mx-auto flex max-w-6xl flex-col gap-8 rounded-3xl border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.5)_100%)] px-6 py-8 backdrop-blur-xl transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-(--border) dark:bg-[linear-gradient(165deg,rgba(17,22,28,0.92)_0%,rgba(11,15,20,0.88)_100%)]">
        <div className="flex items-center gap-3">
          <span
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-emerald-200/95 bg-gradient-to-br from-emerald-50 via-teal-50/90 to-emerald-100/70 text-emerald-800 shadow-[0_2px_10px_-4px_rgba(5,150,105,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors dark:border-emerald-400/45 dark:bg-gradient-to-br dark:from-emerald-950/85 dark:via-emerald-900/70 dark:to-emerald-950/90 dark:text-emerald-300 dark:shadow-[0_0_26px_-2px_rgba(52,211,153,0.55),0_4px_22px_-10px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(110,231,183,0.42),inset_0_0_14px_2px_rgba(52,211,153,0.18),inset_0_-6px_12px_-4px_rgba(16,185,129,0.22)]"
            aria-hidden
          >
            <Scale
              className="h-[18px] w-[18px] dark:drop-shadow-[0_0_10px_rgba(52,211,153,0.55),0_0_14px_rgba(16,185,129,0.35)]"
              strokeWidth={2}
            />
          </span>
          <p className="font-work-sans text-[13px] font-semibold tracking-wide uppercase text-(--muted)">
            © {new Date().getFullYear()} Civic Spiegel · NY Civic Research Assistant
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-work-sans text-[13px] font-semibold tracking-wide uppercase text-(--muted) underline-offset-4 transition hover:text-(--accent) hover:underline"
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
