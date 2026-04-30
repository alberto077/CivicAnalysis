"use client";
import Link from "next/link";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-[2rem] border border-white/38 bg-[linear-gradient(135deg,rgba(248,251,255,0.46)_0%,rgba(242,248,253,0.32)_100%)] px-8 backdrop-blur-[34px] shadow-[-0.7px_2.6px_20.1px_1.6px_rgba(96,155,251,0.2),0px_0px_0px_0px_rgba(0,0,0,0),0px_0px_0px_0px_rgba(0,0,0,0),0px_0px_0px_0px_rgba(0,0,0,0),0px_14px_34px_-20px_rgba(26,54,93,0.26)]">
        <Link
          href="/"
          className="flex items-center gap-3 transition hover:opacity-80 group"
        >
          <div className="h-8 w-8 rounded-xl bg-[linear-gradient(135deg,var(--accent)_0%,#2f5f96_100%)] shadow-inner transition group-hover:rotate-12" />
          <span className="font-display text-xl font-bold tracking-[0.15em] text-slate-900 uppercase">
            Civic <span className="text-[var(--accent)]">Spiegel</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold text-slate-500 tracking-[0.25em] uppercase">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Briefings</Link>
          <Link href="/representatives" className="hover:text-[var(--accent)] transition-colors">Representatives</Link>
          <Link href="/map" className="hover:text-[var(--accent)] transition-colors">Map</Link>
          <Link href="/chat" className="hover:text-[var(--accent)] transition-colors">Civic Assistant</Link>
          <Link href="/about" className="hover:text-[var(--accent)] transition-colors">About</Link>
        </nav>
      </div>
    </header>
  );
}
