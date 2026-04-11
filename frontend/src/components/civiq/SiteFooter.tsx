const links = [
  { label: "About", href: "#" },
  { label: "Data Sources", href: "#" },
  { label: "NYC Open Data", href: "https://opendata.cityofnewyork.us/" },
  { label: "Contact", href: "#" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-16 border-t border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.22)_100%)] py-12 shadow-[0_-8px_32px_-20px_rgba(91,127,163,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-[var(--muted)]">
          © {new Date().getFullYear()} Civic Spiegel · Civic Research Assistant
        </p>
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-[var(--foreground)]/80 underline-offset-4 transition hover:text-[var(--accent)] hover:underline"
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
