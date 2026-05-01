"use client";
import Link from "next/link";
import { useState } from "react";
import { Settings } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";

export function Header() {
  const { profile, saveProfile } = useProfile();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

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

        <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold text-slate-500 tracking-[0.25em] uppercase">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Briefings</Link>
          <Link href="/representatives" className="hover:text-[var(--accent)] transition-colors">Representatives</Link>
          <Link href="/map" className="hover:text-[var(--accent)] transition-colors">Map</Link>
          <Link href="/chat" className="hover:text-[var(--accent)] transition-colors">Civic Assistant</Link>
          <Link href="/about" className="hover:text-[var(--accent)] transition-colors">About</Link>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowEditProfile(true)}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[var(--accent)] hover:border-[var(--accent-soft)] transition-all shadow-sm flex items-center gap-2 group"
            title="Update Preferences"
          >
            <Settings className="h-4 w-4 transition-transform group-hover:rotate-90" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest">Profile</span>
          </button>
        </div>
      </div>

      <OnboardingModal
        isOpen={showOnboarding}
        initialProfile={profile}
        onSave={(data) => {
          saveProfile(data);
          setShowOnboarding(false);
        }}
        onSkip={() => setShowOnboarding(false)}
      />

      <SettingsModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
    </header>
  );
}
