"use client";

import { ExternalLink, Sparkles, UserRound } from "lucide-react";
import { MotionReveal } from "./MotionReveal";
import { PolicyTitleSplit } from "./PolicyTitleSplit";
import type { CivicProfile } from "@/lib/useProfile";
import type { ProfileActivityItem, ProfileActivityMode } from "@/lib/useProfileActivityFeed";
import type { PolicyApiArea } from "@/lib/profileIssueToPolicyArea";

type ProfileActivitySectionProps = {
  isProfileLoaded: boolean;
  profile: CivicProfile | null;
  profileSkipped: boolean;
  items: ProfileActivityItem[];
  loading: boolean;
  error: string | null;
  mode: ProfileActivityMode;
  mappedAreas: PolicyApiArea[];
  profileBorough: string | undefined;
  onSetupProfile: () => void;
  onEditProfile: () => void;
};

export function ProfileActivitySection({
  isProfileLoaded,
  profile,
  profileSkipped,
  items,
  loading,
  error,
  mode,
  mappedAreas,
  profileBorough,
  onSetupProfile,
  onEditProfile,
}: ProfileActivitySectionProps) {
  const title =
    mode === "personalized" ? "Picked for your profile" : "Recent activity";

  const subtitleParts: string[] = [];
  if (mode === "personalized" && profile) {
    if (profileBorough) subtitleParts.push(profileBorough);
    if (mappedAreas.length) subtitleParts.push(mappedAreas.join(", "));
    if (!subtitleParts.length) subtitleParts.push("Your saved interests");
  } else if (mode === "personalize_off") {
    subtitleParts.push("High-match picks need personalization");
  } else if (profileSkipped) {
    subtitleParts.push("Add a profile for borough + topic matches");
  } else if (!profile) {
    subtitleParts.push("Set up your profile to see targeted picks");
  } else {
    subtitleParts.push("Profile picks");
  }

  const showCardGrid = mode === "personalized" && items.length > 0;
  const showPersonalizedEmpty =
    mode === "personalized" && isProfileLoaded && !loading && !error && items.length === 0;
  const showNonPersonalizedPanel = mode !== "personalized" && isProfileLoaded && !loading && !error;

  return (
    <section
      id="profile-activity"
      className="mx-auto mt-6 max-w-7xl scroll-mt-20 px-4 sm:mt-8 sm:px-6 lg:px-8"
      aria-labelledby="profile-activity-heading"
    >
      <MotionReveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-[var(--accent)] shadow-[0_4px_14px_-6px_rgba(91,127,163,0.25)] ring-1 ring-white/70 dark:bg-[var(--surface-elevated)] dark:text-[var(--icon-violet)] dark:ring-[var(--border)]">
                <Sparkles className="h-4 w-4" strokeWidth={1.65} aria-hidden />
              </span>
              <h2
                id="profile-activity-heading"
                className="font-work-sans text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl"
              >
                {title}
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
              {subtitleParts.join(" · ")}
            </p>
            {mode === "personalize_off" ? (
              <p className="mt-1 max-w-2xl text-[12px] leading-snug text-[var(--foreground-secondary)]">
                Turn on &quot;Personalize results&quot; in the filters above. This strip only lists records that match
                both your borough and saved topic tags.
              </p>
            ) : null}
            {mode === "personalized" ? (
              <p className="mt-1 max-w-2xl text-[12px] leading-snug text-[var(--foreground-secondary)]">
                Only cross-matches (borough + your tags) appear here—approximate, device-local preferences. For the
                full chronological feed, see{" "}
                <a href="#updates" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
                  Recent policy updates
                </a>
                .
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {!profile ? (
              <button
                type="button"
                onClick={onSetupProfile}
                className="filter-pill font-work-sans inline-flex items-center gap-2 rounded-xl border-0 bg-[linear-gradient(to_bottom,#fcfdfe_0%,#f5f9fc_50%,#eef4f9_100%)] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--foreground)] transition hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)] dark:bg-[linear-gradient(180deg,#151b22_0%,#0f1318_100%)]"
              >
                <UserRound className="h-3.5 w-3.5 dark:text-[var(--icon-cyan)]" aria-hidden />
                Set up profile
              </button>
            ) : (
              <button
                type="button"
                onClick={onEditProfile}
                className="filter-pill font-work-sans rounded-xl border-0 bg-[linear-gradient(to_bottom,#fcfdfe_0%,#f5f9fc_50%,#eef4f9_100%)] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[var(--foreground)] transition hover:brightness-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-soft)] dark:bg-[linear-gradient(180deg,#151b22_0%,#0f1318_100%)]"
              >
                Edit profile
              </button>
            )}
          </div>
        </div>
      </MotionReveal>

      <MotionReveal className="mt-6">
        <div className="glass-card feature-border-glow overflow-hidden rounded-2xl border border-[var(--border)] md:rounded-3xl">
          {!isProfileLoaded || loading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 px-6 py-12">
              <div
                className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--accent)]/25 border-t-[var(--accent)]"
                aria-hidden
              />
              <p className="text-sm text-[var(--muted)]">Loading high-match picks…</p>
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-center" role="alert">
              <p className="font-work-sans text-sm font-semibold text-[var(--foreground)]">Could not load activity</p>
              <p className="mt-1 font-work-sans text-xs text-[var(--muted)]">{error}</p>
            </div>
          ) : showCardGrid ? (
            <div className="p-5 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {items.map((p) => (
                  <article
                    key={policyRowKey(p)}
                    className="flex flex-col rounded-2xl border border-[var(--border)] bg-white/55 p-4 shadow-[0_8px_28px_-18px_rgba(26,54,93,0.18)] backdrop-blur-sm dark:bg-[var(--surface-elevated)]/50 dark:shadow-[0_12px_36px_-24px_rgba(0,0,0,0.5)]"
                  >
                    <p className="font-work-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
                      {p.matchSummary}
                    </p>
                    <h3 className="mt-2 line-clamp-2 min-h-0 font-work-sans text-[15px] leading-snug text-[var(--foreground)]">
                      <PolicyTitleSplit title={p.title} />
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {p.source_type ? (
                        <span className="font-work-sans rounded bg-[var(--accent-soft)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                          {p.source_type}
                        </span>
                      ) : null}
                      {p.published_date ? (
                        <span className="font-work-sans text-[11px] text-[var(--muted)]">
                          {new Date(p.published_date).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)]/70 pt-3">
                      {canOpenOfficialUrl(p.source_url) ? (
                        <a
                          href={p.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-work-sans inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--accent)] underline-offset-2 hover:underline dark:text-[var(--icon-mint)]"
                        >
                          Open record
                          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                        </a>
                      ) : (
                        <span className="font-work-sans text-[11px] text-[var(--muted)]">No direct link for this row</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : showPersonalizedEmpty ? (
            <div className="px-6 py-12 text-center sm:px-10">
              <p className="font-work-sans text-sm font-semibold text-[var(--foreground)]">
                No cross-matches in this window
              </p>
              <p className="mx-auto mt-2 max-w-lg font-work-sans text-[13px] leading-relaxed text-[var(--muted)]">
                We didn&apos;t find records that matched both your borough and saved topic tags for your current
                timeframe. Add interests in your profile, widen the dashboard timeframe, or browse the full feed below.
              </p>
              <a
                href="#updates"
                className="mt-5 inline-flex font-work-sans text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Go to Recent policy updates
              </a>
            </div>
          ) : showNonPersonalizedPanel ? (
            <div className="px-6 py-12 text-center sm:px-10">
              <p className="font-work-sans text-sm font-semibold text-[var(--foreground)]">
                {mode === "personalize_off"
                  ? "Personalization is off"
                  : profileSkipped
                    ? "Browsing without a saved profile"
                    : "Profile not set yet"}
              </p>
              <p className="mx-auto mt-2 max-w-lg font-work-sans text-[13px] leading-relaxed text-[var(--muted)]">
                This area only shows <strong className="font-semibold text-[var(--foreground)]">high-confidence</strong>{" "}
                matches (your NYC borough plus topic tags from your profile). Citywide lists stay in{" "}
                <a href="#updates" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
                  Recent policy updates
                </a>
                .
              </p>
            </div>
          ) : null}
        </div>
      </MotionReveal>
    </section>
  );
}

function policyRowKey(p: ProfileActivityItem): string {
  return `${p.id}-${p.source_url}-${p.title}`;
}

function canOpenOfficialUrl(url: string): boolean {
  return /^https?:\/\//i.test(url?.trim() ?? "");
}
