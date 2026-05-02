"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Settings } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";

function navLinkClass(pathname: string, href: string) {
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  return active
    ? "font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-soft)]"
    : "text-slate-600 transition-colors hover:text-[var(--accent-mid)]";
}

export function Header() {
  const pathname = usePathname();
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
          <span className="font-limelight text-[20px] font-semibold tracking-[0.6px] text-slate-800 uppercase">
            Civic <span className="font-limelight text-[var(--accent)]">Spiegel</span>
          </span>
        </Link>

        <nav className="font-work-sans hidden items-center gap-8 text-[14px] font-medium leading-[25px] tracking-[0.25px] uppercase md:flex">
          <Link href="/" className={navLinkClass(pathname, "/")}>
            Briefings
          </Link>
          <Link href="/representatives" className={navLinkClass(pathname, "/representatives")}>
            Representatives
          </Link>
          <Link href="/map" className={navLinkClass(pathname, "/map")}>
            Map
          </Link>
          <Link href="/chat" className={navLinkClass(pathname, "/chat")}>
            Civic Assistant
          </Link>
          <Link href="/about" className={navLinkClass(pathname, "/about")}>
            About
          </Link>
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
