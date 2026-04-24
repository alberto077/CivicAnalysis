"use client";
import Link from "next/link";
import { useState } from "react";
import { SettingsModal } from "./SettingsModal";
import { useProfile } from "@/lib/useProfile";

export function Header() {
  const [showSettings, setShowSettings] = useState(false);
  const { profile } = useProfile();

  return (
    <>
      <header className="sticky top-3 z-50 px-3 sm:px-5 lg:px-7">
        <div className="surface-float mx-auto flex h-[3.35rem] w-full max-w-6xl items-center justify-between rounded-2xl border border-white/70 bg-[linear-gradient(150deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.72)_100%)] px-4 sm:h-14 sm:px-6 lg:px-8 backdrop-blur-2xl backdrop-saturate-150">
          <Link
            href="/"
            className="flex items-center gap-2 transition hover:opacity-85"
          >
            <span className="logo-clip flex-shrink-0"></span>
            <span className="font-display text-2xl tracking-widest text-[var(--foreground)] uppercase mt-1">
              Civic <span className="text-[var(--accent)]">Spiegel</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-5 text-[13px] font-semibold text-[var(--muted)] tracking-wide uppercase">
              <a href="#briefings" className="hover:text-[var(--accent)] transition-colors">Briefings</a>
              <a href="#politicians" className="hover:text-[var(--accent)] transition-colors">Politicians</a>
            </nav>
            <div className="h-4 w-px bg-[var(--border)] hidden lg:block" />
            <p className="hidden font-condensed text-sm font-bold tracking-wide uppercase text-[var(--accent-mid)] sm:block">
              NY Data Sync
            </p>
            <button 
              onClick={() => setShowSettings(true)}
              className="btn-premium text-xs font-semibold text-white bg-[var(--accent)] rounded-full px-4 py-1.5 hover:bg-[var(--accent-mid)] transition tracking-wide uppercase shadow-sm"
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
