"use client";

import { useMemo } from "react";
import {
  User, Sparkles, Settings, Plus, ExternalLink,
  Users, Clock, Building2,
} from "lucide-react";
import { type CivicProfile } from "@/lib/useProfile";
import { type PolicyBriefing } from "@/lib/api";
import { MotionReveal } from "./MotionReveal";
import { getPolicyAreaMetadata, timeAgo } from "@/lib/policyMetadata";

type Props = {
  isProfileLoaded: boolean;
  profile: CivicProfile | null;
  profileSkipped: boolean;
  items: PolicyBriefing[];
  loading: boolean;
  error: string | null;
  mode: "personalized" | "fallback" | "empty" | "citywide" | string;
  mappedAreas: string[];
  profileBorough: string | undefined;
  onSetupProfile: () => void;
  onEditProfile: () => void;
};

function SectionHeader({ eyebrow, title, badge, action }: {
  eyebrow: string; title: string; badge?: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <div>
          <p className="font-work-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p>
          <h2 className="font-limelight text-lg font-semibold tracking-tight text-[rgba(20,31,45,0.9)] dark:text-[var(--foreground)] leading-tight">{title}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="hidden sm:flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-amber-700 dark:text-amber-400">
            <Sparkles className="h-2 w-2" />{badge}
          </span>
        )}
        {action && (
          <button onClick={action.onClick} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <Settings className="h-2.5 w-2.5" />{action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function ProfileChips({ profile, onEdit }: { profile: CivicProfile; onEdit: () => void }) {
  const chips = useMemo(() => {
    const out: { label: string; color?: string }[] = [];
    if (profile.borough) out.push({ label: profile.borough, color: "#ee7a85" });
    if (profile.housing) out.push({ label: profile.housing });
    (profile.issues ?? []).slice(0, 3).forEach((issue) => {
      const meta = getPolicyAreaMetadata(issue);
      out.push({ label: issue.split(" ").slice(0, 2).join(" "), color: meta.id !== "All" ? meta.color : undefined });
    });
    return out;
  }, [profile]);

  return (
    <div className="flex items-center justify-between gap-3 mb-4 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 backdrop-blur-md">
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10">
          <User className="h-2.5 w-2.5 text-[var(--accent)]" />
        </span>
        {chips.map((c, i) => (
          <span key={i} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: c.color ?? "var(--muted)", background: c.color ? `${c.color}12` : "var(--surface-elevated)", borderColor: c.color ? `${c.color}30` : "var(--border)" }}>
            {c.label}
          </span>
        ))}
      </div>
      <button onClick={onEdit} className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
        <Settings className="h-2.5 w-2.5" />Edit
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon = Sparkles, title, body, cta, onCta }: {
  icon?: React.ElementType; title: string; body: string; cta: string; onCta: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)]/10 mx-auto mb-3">
        <Icon className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">{title}</p>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed max-w-[200px] mx-auto mb-4">{body}</p>
      <button onClick={onCta}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-[var(--accent)] hover:brightness-110 transition-all active:scale-[0.98] shadow-sm">
        <Plus className="h-3 w-3" />{cta}
      </button>
    </div>
  );
}

function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-16 rounded bg-slate-200/70 dark:bg-slate-700/50" />
            <div className="h-3 w-10 rounded bg-slate-200/50 dark:bg-slate-700/30 ml-auto" />
          </div>
          <div className="h-4 w-4/5 rounded bg-slate-200/70 dark:bg-slate-700/50 mb-1.5" />
          <div className="h-3 w-3/5 rounded bg-slate-200/50 dark:bg-slate-700/30" />
        </div>
      ))}
    </div>
  );
}

export function ProfileActivitySection({
  isProfileLoaded, profile, profileSkipped,
  items, loading, error, mode, mappedAreas, profileBorough,
  onSetupProfile, onEditProfile,
}: Props) {

  if (!isProfileLoaded) return <MotionReveal><section><div className="h-7 w-40 animate-pulse rounded-xl bg-slate-200/60 dark:bg-[var(--surface-elevated)]/60 mb-4" /><SkeletonList /></section></MotionReveal>;

  if (!profile && !profileSkipped) return (
    <MotionReveal><section>
      <SectionHeader eyebrow="Activity" title="Your Civic Feed" />
      <EmptyState icon={User} title="Set up your profile"
        body="Tell us your borough and interests to surface legislation that affects you most."
        cta="Set up profile" onCta={onSetupProfile} />
    </section></MotionReveal>
  );

  if (profileSkipped || mode === "empty" || (mode !== "personalized" && mode !== "fallback" && mode !== "citywide" && !items.length)) return (
    <MotionReveal><section>
      <SectionHeader eyebrow="Activity" title="Your Civic Feed" />
      <EmptyState icon={Sparkles} title="No activity to show"
        body={profileSkipped ? "Create a profile to see personalized legislation." : "Add issue areas to your profile to see matched activity."}
        cta={profileSkipped ? "Create profile" : "Edit profile"} onCta={profileSkipped ? onSetupProfile : onEditProfile} />
    </section></MotionReveal>
  );

  const contextLabel = [profileBorough, ...(mappedAreas?.slice(0, 2) ?? [])].filter(Boolean).join(" · ");

  return (
    <MotionReveal>
      <section>
        <SectionHeader
          eyebrow={mode === "personalized" ? "Personalized" : mode === "citywide" ? "City-wide" : "Activity"}
          title="Your Civic Feed"
          badge={contextLabel || undefined}
        />

        {profile && <ProfileChips profile={profile} onEdit={onEditProfile} />}

        {loading && <SkeletonList />}

        {!loading && error && (
          <div className="rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200" role="alert">
            <p className="font-semibold">Could not load your feed.</p>
            <p className="mt-0.5 text-[13px] opacity-80">{error}</p>
          </div>
        )}

        {!loading && !error && !items.length && (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-white/40 dark:bg-[var(--surface-card)]/40 p-8 text-center">
            <p className="text-[12px] text-[var(--muted)]">No records matched your profile for this period.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-2.5">
            {items.map((item) => {
              const matchedArea = mappedAreas?.find((area) => {
                const kws = getPolicyAreaMetadata(area).keywords;
                const hay = `${item.title} ${(item.topic_tags ?? []).join(" ")}`.toLowerCase();
                return kws.some((k) => hay.includes(k));
              });
              const meta = getPolicyAreaMetadata(matchedArea ?? item.source_type ?? "");
              const color = meta.color;
              const AreaIcon = meta.Icon ?? Building2;

              return (
                <div key={item.id}
                  className="group relative rounded-2xl border border-[var(--border)] bg-white/60 dark:bg-[var(--surface-card)]/50 backdrop-blur-md px-4 py-3.5 hover:bg-white/80 dark:hover:bg-[var(--surface-card)]/75 hover:shadow-sm transition-all">
                  <div className="absolute left-0 inset-y-3.5 w-[3px] rounded-full" style={{ background: color }} />
                  <div className="pl-3">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border"
                        style={{ color, background: `${color}12`, borderColor: `${color}30` }}>
                        <AreaIcon className="h-2 w-2" />
                        {matchedArea ?? item.source_type ?? "Record"}
                      </span>
                      {item.source_type && matchedArea && item.source_type !== matchedArea && (
                        <span className="text-[8px] text-[var(--muted)] uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[var(--surface-elevated)] border border-[var(--border)]">
                          {item.source_type}
                        </span>
                      )}
                      {item.published_date && (
                        <span className="flex items-center gap-0.5 text-[9px] text-[var(--muted)] tabular-nums ml-auto">
                          <Clock className="h-2 w-2" />{timeAgo(item.published_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold text-[var(--foreground)] leading-snug group-hover:text-[var(--accent)] transition-colors line-clamp-2 mb-1">
                      {item.title}
                    </p>
                    {item.impact && (
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed line-clamp-2 mb-1.5 italic">{item.impact}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {item.affects ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <Users className="h-2.5 w-2.5 text-[var(--muted)] shrink-0" />
                          <span className="text-[9px] text-[var(--muted)] truncate max-w-[110px]">{item.affects}</span>
                        </div>
                      ) : <div />}
                      {item.source_url && item.source_url !== "#" && (
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                          className="flex shrink-0 items-center gap-0.5 text-[9px] font-bold text-[var(--accent)] hover:underline">
                          Source <ExternalLink className="h-2 w-2" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </MotionReveal>
  );
}