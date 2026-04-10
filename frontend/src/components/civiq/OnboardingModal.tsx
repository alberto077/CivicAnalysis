"use client";

import { useState } from "react";
import {
  defaultPreferences,
  getStoredPreferences,
  isOnboardingComplete,
  savePreferences,
  setOnboardingComplete,
  type UserPreferences,
} from "@/lib/storage";

const BOROUGH_OPTIONS = [
  "Manhattan",
  "Queens",
  "Brooklyn",
  "Bronx",
  "Staten Island",
  "Other / Prefer not to say",
];

const INCOME_OPTIONS = [
  "Under $25K",
  "$26-50K",
  "$51-75K",
  "$76K-100K",
  "Over $100K",
  "Other / Prefer not to say",
];

const HOUSING_OPTIONS = [
  "Renter (Tenant)",
  "Homeowner",
  "Shared Housing",
  "Homeless / Unhoused",
  "Other / Prefer not to say",
];

const AGE_OPTIONS = [
  "Under 18",
  "18–25",
  "26–35",
  "36–50",
  "51–65",
  "65+",
  "Other / Prefer not to say",
];

const ISSUE_OPTIONS = [
  "Health",
  "Armed Forces and National Security",
  "Government Operations and Politics",
  "International Affairs",
  "Taxation",
  "Crime and Law Enforcement",
  "Agriculture and Food",
  "Public Lands and Natural Resources",
  "Transportation and Public Works",
  "Finance and Financial Sector",
  "Immigration",
  "Education",
  "Congress",
  "Science, Technology, Communications",
  "Environmental Protection",
  "Commerce",
  "Energy",
  "Labor and Employment",
  "Housing and Community Development",
  "Foreign Trade and International Finance",
  "Native Americans",
  "Emergency Management",
  "Civil Rights and Liberties, Minority Issues",
  "Economics and Public Finance",
  "Law",
  "Social Welfare",
  "Sports and Recreation",
  "Families",
  "Arts, Culture, Religion",
  "Water Resources Development",
  "Animals",
];

const IDENTITY_OPTIONS = [
  "Student",
  "Immigrant / DACA",
  "Veteran",
  "Disability",
  "Small business owner",
  "Child of US immigrants",
  "Recent NYC resident",
  "Single parent / Caregiver",
  "LGBTQ+",
  "BIPOC",
];

function toggleArrayValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function OnboardingModal() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !isOnboardingComplete();
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window === "undefined") return defaultPreferences;
    return getStoredPreferences();
  });

  function handleSave() {
    savePreferences(preferences);
    setOnboardingComplete(true);
    setOpen(false);
  }

  function handleSkip() {
    savePreferences(preferences);
    setOnboardingComplete(true);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/60 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Welcome to Civic Spiegel
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--foreground)]">
            Personalize your policy briefings
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Tell us a bit about yourself so we can tailor briefings to issues
            that matter most to you.
          </p>
        </div>

        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              What borough do you live in?
            </label>
            <select
              value={preferences.borough}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, borough: e.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Select an option</option>
              {BOROUGH_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              What&apos;s your approximate annual household income?
            </label>
            <select
              value={preferences.householdIncome}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  householdIncome: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Select an option</option>
              {INCOME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              What&apos;s your housing status?
            </label>
            <select
              value={preferences.housingStatus}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  housingStatus: e.target.value,
                }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Select an option</option>
              {HOUSING_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              Age range?
            </label>
            <select
              value={preferences.ageRange}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, ageRange: e.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="">Select an option</option>
              {AGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-[var(--foreground)]">
              What issues matter most to you?
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ISSUE_OPTIONS.map((issue) => (
                <label
                  key={issue}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]"
                >
                  <input
                    type="checkbox"
                    checked={preferences.priorityIssues.includes(issue)}
                    onChange={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        priorityIssues: toggleArrayValue(
                          prev.priorityIssues,
                          issue
                        ),
                      }))
                    }
                    className="mt-1"
                  />
                  <span>{issue}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-[var(--foreground)]">
              Any of these apply to you?
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {IDENTITY_OPTIONS.map((tag) => (
                <label
                  key={tag}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]"
                >
                  <input
                    type="checkbox"
                    checked={preferences.identityTags.includes(tag)}
                    onChange={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        identityTags: toggleArrayValue(prev.identityTags, tag),
                      }))
                    }
                    className="mt-1"
                  />
                  <span>{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={preferences.personalized}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    personalized: e.target.checked,
                  }))
                }
              />
              Enable personalized local briefings
            </label>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--foreground)]"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}