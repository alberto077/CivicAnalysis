"use client";

import { useEffect, useState } from "react";

const links = [
  { label: "About", href: "#" },
  { label: "Data Sources", href: "#" },
  { label: "NYC Open Data", href: "https://opendata.cityofnewyork.us/" },
  { label: "Contact", href: "#" },
] as const;

export function SiteFooter() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative z-10 mt-16 px-4 pb-5 sm:px-6 lg:px-8">
      <div className="surface-float mx-auto flex max-w-6xl flex-col gap-8 rounded-3xl border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.5)_100%)] px-6 py-8 sm:flex-row sm:items-center sm:justify-between backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="logo-clip w-[24px] h-[24px] bg-[length:400px] bg-[position:center_52%] opacity-80 border-0 shadow-none grayscale" />
          <p className="font-condensed text-[13px] font-semibold tracking-wide uppercase text-[var(--muted)]">
            © {year ?? "----"} Civic Spiegel · NY Policy Assistant
          </p>
        </div>
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
