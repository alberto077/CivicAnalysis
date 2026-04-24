"use client";
import Link from "next/link";
import { useState } from "react";
import { SettingsModal } from "./SettingsModal";

export function Header() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-[2rem] border border-white/40 bg-white/60 px-8 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <Link
            href="/"
            className="flex items-center gap-3 transition hover:opacity-80 group"
          >
            <div className="h-8 w-8 rounded-xl bg-[linear-gradient(135deg,var(--accent)_0%,#2f5f96_100%)] shadow-inner transition group-hover:rotate-12" />
            <span className="font-display text-xl font-bold tracking-[0.15em] text-slate-900 uppercase">
              Civic <span className="text-[var(--accent)]">Spiegel</span>
            </span>
          </Link>

          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold text-slate-500 tracking-[0.25em] uppercase">
              <Link href="/" className="hover:text-[var(--accent)] transition-colors">Briefings</Link>
              <Link href="/representatives" className="hover:text-[var(--accent)] transition-colors">Representatives</Link>
              <Link href="/map" className="hover:text-[var(--accent)] transition-colors">Map</Link>
              <Link href="/chat" className="hover:text-[var(--accent)] transition-colors">Civic Assistant</Link>
              <Link href="/about" className="hover:text-[var(--accent)] transition-colors">About</Link>
            </nav>

            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            <button
              onClick={() => setShowSettings(true)}
              className="text-[10px] font-extrabold text-white bg-slate-900 rounded-full px-6 py-2.5 hover:bg-slate-800 transition tracking-[0.2em] uppercase shadow-lg shadow-slate-200"
            >
              Settings
            </button>
          </div>
        </div>
      </header>
      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
