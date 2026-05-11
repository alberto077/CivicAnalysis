const links = [
  { label: "Data Sources", href: "/data-sources" },
  { label: "Github", href: "https://github.com/alberto077/CivicAnalysis"},
  { label: "About", href: "/about" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16 px-4 pb-5 sm:px-6 lg:px-8">
      <div className="surface-float mx-auto flex max-w-6xl flex-col gap-8 rounded-3xl border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.5)_100%)] px-6 py-8 backdrop-blur-xl transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-(--border) dark:bg-[linear-gradient(165deg,rgba(17,22,28,0.92)_0%,rgba(11,15,20,0.88)_100%)]">
        <div className="flex items-center gap-3">
          <span className="logo-clip w-6 h-6 bg-size-[400px] bg-position-[center_52%] opacity-80 border-0 shadow-none grayscale" />
          <p className="font-work-sans text-[13px] font-semibold tracking-wide uppercase text-(--muted)">
            © {new Date().getFullYear()} Civic Spiegel · NY Civic Research Assistant
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="font-work-sans text-sm text-(--foreground)/80 underline-offset-4 transition hover:text-(--accent) hover:underline"
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
