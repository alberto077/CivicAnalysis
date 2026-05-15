"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Settings, X } from "lucide-react";

import { useProfile } from "@/lib/useProfile";
import { OnboardingModal } from "@/components/civiq/OnboardingModal";
import { SettingsModal } from "@/components/civiq/SettingsModal";
import { ThemeToggle } from "@/components/civiq/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Briefings" },
  { href: "/representatives", label: "Representatives" },
  { href: "/map", label: "Map" },
  { href: "/calendar", label: "Calendar" },
  { href: "/about", label: "About" },
];

function navLinkClass(pathname: string, href: string) {
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return active
    ? "font-semibold text-[var(--accent)] transition-colors duration-200 hover:text-[var(--foreground)]"
    : "text-[var(--foreground-secondary)] transition-colors duration-200 hover:text-[var(--accent)]";
}

export function Header() {
  const pathname = usePathname();
  const { profile, saveProfile } = useProfile();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-[1.5rem] border border-white/38 bg-[linear-gradient(135deg,rgba(248,251,255,0.72)_0%,rgba(242,248,253,0.55)_100%)] px-4 py-3 shadow-[-0.7px_2.6px_20.1px_1.6px_rgba(96,155,251,0.2),0px_14px_34px_-20px_rgba(26,54,93,0.26)] backdrop-blur-[34px] transition-shadow duration-300 sm:rounded-[2rem] sm:px-6 dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,rgba(21,27,34,0.82)_0%,rgba(14,18,24,0.72)_100%)] dark:shadow-[0_12px_40px_-18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="flex h-12 items-center justify-between gap-3 sm:h-14">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="group flex min-w-0 items-center gap-3 transition hover:opacity-80"
          >
            <div className="h-8 w-8 shrink-0 rounded-xl bg-[linear-gradient(135deg,var(--accent)_0%,#2f5f96_100%)] shadow-inner transition group-hover:rotate-12" />

            <span className="truncate font-limelight text-[17px] font-semibold uppercase tracking-[0.5px] text-[var(--foreground)] sm:text-[20px]">
              Civic{" "}
              <span className="font-limelight text-[var(--accent)]">
                Spiegel
              </span>
            </span>
          </Link>

          <nav className="font-work-sans hidden items-center gap-8 text-[14px] font-medium uppercase leading-[25px] tracking-[0.25px] md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={navLinkClass(pathname, link.href)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setShowEditProfile(true)}
              className="group flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5 text-[var(--muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-[var(--accent)]/35 hover:text-[var(--accent)] dark:border-white/12 dark:bg-[linear-gradient(135deg,rgba(148,163,184,0.22)_0%,rgba(100,116,139,0.28)_48%,rgba(71,85,105,0.24)_100%)] dark:backdrop-blur-xl dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_22px_-12px_rgba(15,23,42,0.4)] dark:hover:border-sky-200/25 dark:hover:bg-[linear-gradient(135deg,rgba(148,163,184,0.32)_0%,rgba(100,116,139,0.38)_48%,rgba(71,85,105,0.32)_100%)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_28px_-10px_rgba(15,23,42,0.45)]"
              title="Update Preferences"
              aria-label="Update Preferences"
            >
              <Settings className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-hover:rotate-90 group-hover:text-[var(--accent)] dark:text-sky-300 dark:group-hover:text-sky-200" />
              <span className="hidden text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--accent)] sm:inline dark:text-white dark:group-hover:text-white">
                Profile
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)] dark:text-[var(--icon-amber)] dark:hover:text-[var(--accent)] md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <nav className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3 md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={`rounded-2xl px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] transition ${
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(`${link.href}/`))
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/70 text-[var(--foreground-secondary)] hover:bg-white hover:text-[var(--accent)] dark:bg-white/5 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
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