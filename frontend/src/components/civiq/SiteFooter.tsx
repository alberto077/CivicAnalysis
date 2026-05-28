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
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#6eb3e8]/55 bg-gradient-to-br from-[#e8f1fa] via-[#d4e6f5] to-[#b8d4eb] text-[#12355b] shadow-[0_2px_10px_-4px_rgba(18,53,91,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] transition-colors dark:border-sky-300/40 dark:bg-gradient-to-br dark:from-[#1a2d45] dark:via-[#152536] dark:to-[#0f1c2e] dark:text-sky-300 dark:shadow-[0_0_20px_-2px_rgba(96,155,251,0.45),0_4px_18px_-8px_rgba(56,120,200,0.4),inset_0_1px_0_rgba(147,197,253,0.22),inset_0_0_12px_2px_rgba(96,155,251,0.12)]"
            aria-hidden
          >
            <Scale
              className="h-[18px] w-[18px] dark:drop-shadow-[0_0_10px_rgba(96,155,251,0.55),0_0_14px_rgba(147,197,253,0.38)]"
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
