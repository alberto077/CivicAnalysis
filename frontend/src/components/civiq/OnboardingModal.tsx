"use client";

import { useState, useEffect } from "react";
import { type CivicProfile } from "@/lib/useProfile";

export const BOROUGHS = ["Manhattan", "Queens", "Brooklyn", "Bronx", "Staten Island", "Other"];
export const INCOME = ["Under $25K", "$26-50K", "$51-75K", "$76-100K", "Over $100K", "Prefer not to say"];
export const HOUSING = ["Renter (Tenant)", "Homeowner", "Shared Housing", "Homeless / Unhoused", "Prefer not to say"];
export const AGE = ["Under 18", "18–25", "26–35", "36–50", "51–65", "65+", "Prefer not to say"];
export const ISSUES = [
  "Health", "Armed Forces and National Security", "Government Operations and Politics", "International Affairs", "Taxation",
  "Crime and Law Enforcement", "Agriculture and Food", "Public Lands and Natural Resources", "Transportation and Public Works",
  "Finance and Financial Sector", "Immigration", "Education", "Congress", "Science, Technology, Communications",
  "Environmental Protection", "Commerce", "Energy", "Labor and Employment", "Housing and Community Development",
  "Foreign Trade and International Finance", "Native Americans", "Emergency Management", "Civil Rights and Liberties, Minority Issues",
  "Economics and Public Finance", "Law", "Social Welfare", "Sports and Recreation", "Families", "Arts, Culture, Religion",
  "Water Resources Development", "Animals"
];
export const DEMOGRAPHICS = [
  "Student", "Immigrant / DACA", "Veteran", "Disability", "Small business owner",
  "Child of US immigrants", "Recent NYC resident", "Single parent / Caregiver", "LGBTQ+", "BIPOC"
];

type Props = {
  isOpen: boolean;
  onSave: (data: CivicProfile) => void;
  onSkip: () => void;
  initialProfile?: CivicProfile | null;
};

export function OnboardingModal({ isOpen, onSave, onSkip, initialProfile }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CivicProfile>({
    borough: "",
    income: "",
    housing: "",
    age: "",
    issues: [],
    demographics: [],
  });

  // Reset and pre-fill when opening
  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setStep(1);
      setData(initialProfile || { borough: "", income: "", housing: "", age: "", issues: [], demographics: [] });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const handleNext = () => setStep((s) => s + 1);
  const handleFinish = () => onSave(data);

  const toggleIssue = (issue: string) => {
    setData((prev) => ({
      ...prev,
      issues: prev.issues.includes(issue)
        ? prev.issues.filter((i) => i !== issue)
        : [...prev.issues, issue],
    }));
  };

  const toggleDemographic = (demo: string) => {
    setData((prev) => ({
      ...prev,
      demographics: prev.demographics.includes(demo)
        ? prev.demographics.filter((d) => d !== demo)
        : [...prev.demographics, demo],
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1b2a]/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSkip();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-[0_20px_60px_-15px_rgba(26,54,93,0.4)] animate-in fade-in zoom-in duration-300">
        <div className="mb-6 flex items-center justify-between">
          <p className="font-work-sans text-sm font-semibold tracking-widest text-[var(--accent-mid)] uppercase">
            Step {step} of 5
          </p>
          <p className="font-work-sans text-xs font-normal text-[var(--muted)]">Privacy: Saved only to your browser</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-limelight text-2xl font-bold text-[var(--foreground)] tracking-tight">Where do you live?</h2>
            <div className="grid grid-cols-2 gap-3">
              {BOROUGHS.map((b) => (
                <button
                  key={b}
                  onClick={() => setData({ ...data, borough: data.borough === b ? "" : b })}
                  className={`rounded-xl border p-3 text-left font-work-sans text-sm font-medium transition ${data.borough === b
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-md"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent-mid)]"
                    }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-limelight text-2xl font-bold text-[var(--foreground)] tracking-tight">Housing & Income</h2>
            <div className="space-y-4">
              <div>
                <label className="font-work-sans mb-2 block text-sm font-medium text-[var(--muted)]">Housing Status</label>
                <div className="flex flex-wrap gap-2">
                  {HOUSING.map((h) => (
                    <button
                      key={h}
                      onClick={() => setData({ ...data, housing: data.housing === h ? "" : h })}
                      className={`font-work-sans rounded-lg border px-4 py-2 text-sm font-normal transition ${data.housing === h ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white" : "border-[var(--border)] bg-gray-50 text-[var(--muted)] hover:bg-gray-100"
                        }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-work-sans mb-2 block text-sm font-medium text-[var(--muted)]">Household Income</label>
                <div className="flex flex-wrap gap-2">
                  {INCOME.map((i) => (
                    <button
                      key={i}
                      onClick={() => setData({ ...data, income: data.income === i ? "" : i })}
                      className={`font-work-sans rounded-lg border px-4 py-2 text-sm font-normal transition ${data.income === i ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white" : "border-[var(--border)] bg-gray-50 text-[var(--muted)] hover:bg-gray-100"
                        }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-limelight text-2xl font-bold text-[var(--foreground)] tracking-tight">What issues matter to you?</h2>
            <div className="flex flex-wrap gap-2 max-h-[35vh] overflow-y-auto pr-2 pb-4 scrollbar-thin">
              {ISSUES.map((issue) => (
                <button
                  key={issue}
                  onClick={() => toggleIssue(issue)}
                  className={`font-work-sans rounded-xl border px-4 py-2 text-sm font-medium transition ${data.issues.includes(issue)
                    ? "border-[var(--accent-mid)] bg-[var(--accent-mid)] text-white shadow-md"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent)]"
                    }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-limelight text-2xl font-bold text-[var(--foreground)] tracking-tight">What is your age?</h2>
            <div className="flex flex-wrap gap-2">
              {AGE.map((a) => (
                <button
                  key={a}
                  onClick={() => setData({ ...data, age: data.age === a ? "" : a })}
                  className={`font-work-sans rounded-lg border px-4 py-2 text-sm font-normal transition ${data.age === a ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white shadow-md" : "border-[var(--border)] bg-gray-50 text-[var(--muted)] hover:bg-gray-100"
                    }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-limelight text-2xl font-bold text-[var(--foreground)] tracking-tight">Any demographics apply?</h2>
            <p className="font-work-sans text-sm font-normal text-[var(--muted)]">Select all that apply.</p>
            <div className="flex flex-wrap gap-2 max-h-[35vh] overflow-y-auto pr-2 pb-4 scrollbar-thin">
              {DEMOGRAPHICS.map((demo) => (
                <button
                  key={demo}
                  onClick={() => toggleDemographic(demo)}
                  className={`font-work-sans rounded-xl border px-4 py-2 text-[13px] font-medium transition ${data.demographics.includes(demo)
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-md"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent-mid)]"
                    }`}
                >
                  {demo}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-5">
          {step < 5 ? (
            <button onClick={handleNext} className="font-work-sans text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition">
              Skip Question
            </button>
          ) : (
            <div className="w-1"></div>
          )}

          {step < 5 ? (
            <button onClick={handleNext} className="font-work-sans rounded-xl bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-mid)]">
              Next
            </button>
          ) : (
            <button onClick={handleFinish} className="font-work-sans rounded-xl bg-[var(--accent-mid)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-105">
              Complete Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
