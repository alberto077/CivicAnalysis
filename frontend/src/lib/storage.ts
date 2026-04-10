//kevon's edit
//new file
//Storage.ts

export type UserPreferences = {
  borough: string;
  householdIncome: string;
  housingStatus: string;
  ageRange: string;
  priorityIssues: string[];
  identityTags: string[];
  personalized: boolean;
};

export const defaultPreferences: UserPreferences = {
  borough: "",
  householdIncome: "",
  housingStatus: "",
  ageRange: "",
  priorityIssues: [],
  identityTags: [],
  personalized: true,
};

const PREFS_KEY = "civicspiegel:userPreferences";
const ONBOARDING_KEY = "civicspiegel:onboardingComplete";

export function getStoredPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPreferences;

    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
    };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function setOnboardingComplete(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, String(value));
}