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
      <header className="sticky top-4 z-50 px-4 sm:px-6">
        <div className="mx-auto flex h-[3.65rem] w-full max-w-5xl items-center justify-between rounded-[26px] border border-white/85 bg-white/72 px-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45),0_8px_22px_-18px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 transition hover:opacity-85"
          >
            <span className="logo-clip flex-shrink-0"></span>
            <span className="mt-1 font-display text-xl tracking-[0.18em] text-[var(--foreground)] uppercase sm:text-2xl">
              Civic <span className="text-[var(--accent)]">Spiegel</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <nav className="hidden items-center gap-2 md:flex">
              <a
                href="#briefings"
                className="rounded-full bg-white/70 px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.08em] text-[var(--foreground)] shadow-[0_6px_16px_-12px_rgba(15,23,42,0.45)] transition hover:scale-[1.02] hover:bg-white"
              >
                Briefings
              </a>
              <a
                href="#politicians"
                className="px-2.5 py-1 text-[12px] font-medium tracking-[0.08em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                Politicians
              </a>
            </nav>
            <p className="hidden rounded-full border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,255,255,0.35))] px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-[var(--accent)] lg:block">
              {profile?.borough ?? "NYC"} DATA
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="btn-premium rounded-full bg-[linear-gradient(135deg,#1f3d66_0%,#315b8f_100%)] px-4 py-2 text-xs font-semibold tracking-[0.1em] text-white shadow-[0_14px_24px_-16px_rgba(26,54,93,0.7)] transition hover:scale-[1.02] hover:shadow-[0_20px_34px_-18px_rgba(26,54,93,0.8)]"
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
