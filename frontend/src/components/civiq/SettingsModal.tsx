"use client";

import { useState, useEffect } from "react";
import { type CivicProfile, useProfile } from "@/lib/useProfile";
import { BOROUGHS, HOUSING, INCOME, AGE, ISSUES, DEMOGRAPHICS } from "./OnboardingModal";

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, saveProfile, clearProfile } = useProfile();
  const [data, setData] = useState<CivicProfile>({
    borough: "", income: "", housing: "", age: "", issues: [], demographics: []
  });
  const [activeTab, setActiveTab] = useState<"Profile" | "Interests">("Profile");

  useEffect(() => {
    if (isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setData(profile || { borough: "", income: "", housing: "", age: "", issues: [], demographics: [] });
      setActiveTab("Profile");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const toggleArray = (key: "issues" | "demographics", val: string) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter(i => i !== val) : [...prev[key], val]
    }));
  };

  const setSingle = (key: keyof CivicProfile, val: string) => {
    setData(prev => ({ ...prev, [key]: prev[key] === val ? "" : val }));
  };

  const handleSave = () => {
    saveProfile(data);
    onClose();
  };

  const handleClear = () => {
    clearProfile();
    setData({ borough: "", income: "", housing: "", age: "", issues: [], demographics: [] });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d1b2a]/60 backdrop-blur-sm p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white flex flex-col shadow-[0_20px_60px_-15px_rgba(26,54,93,0.4)] animate-in fade-in zoom-in duration-300 max-h-[90vh]">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6 border-b border-[var(--border)] shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-limelight text-xl font-bold text-[var(--foreground)] tracking-tight">Edit profile</h2>
              <p className="font-work-sans text-xs text-[var(--muted)] mt-1">Configure your personalized assistant details.</p>
            </div>
            <button onClick={onClose} className="text-[var(--muted)] hover:text-black font-bold p-2 text-xl">&times;</button>
          </div>
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("Profile")}
              className={`font-work-sans flex-1 text-center pb-3 text-sm font-semibold transition border-b-2 ${activeTab === "Profile" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Demographics
            </button>
            <button
              onClick={() => setActiveTab("Interests")}
              className={`font-work-sans flex-1 text-center pb-3 text-sm font-semibold transition border-b-2 ${activeTab === "Interests" ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              Policy Interests
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto scrollbar-thin flex-1 bg-gray-50/50">
          {activeTab === "Profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="font-limelight text-xs font-bold tracking-widest text-[var(--accent)] uppercase mb-3">Location</h3>
                <div className="flex flex-wrap gap-2">
                  {BOROUGHS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSingle("borough", b)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${data.borough === b ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent-soft)]"
                        }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-limelight text-xs font-bold tracking-widest text-[var(--accent)] uppercase mb-3">Housing & Income</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {HOUSING.map((h) => (
                    <button
                      key={h}
                      onClick={() => setSingle("housing", h)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${data.housing === h ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent-soft)]"
                        }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {INCOME.map((i) => (
                    <button
                      key={i}
                      onClick={() => setSingle("income", i)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${data.income === i ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent-soft)]"
                        }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-limelight text-xs font-bold tracking-widest text-[var(--accent)] uppercase mb-3">Age</h3>
                <div className="flex flex-wrap gap-2">
                  {AGE.map((a) => (
                    <button
                      key={a}
                      onClick={() => setSingle("age", a)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${data.age === a ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent-soft)]"
                        }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-limelight text-xs font-bold tracking-widest text-[var(--accent)] uppercase mb-3">Demographic Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {DEMOGRAPHICS.map((demo) => (
                    <button
                      key={demo}
                      onClick={() => toggleArray("demographics", demo)}
                      className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${data.demographics.includes(demo)
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                          : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent-mid)]"
                        }`}
                    >
                      {demo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Interests" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="font-limelight text-xs font-bold tracking-widest text-[var(--accent)] uppercase mb-3">Issues Tracked</h3>
              <p className="text-sm text-[var(--muted)] mb-4">Select the specific policy areas you want your civic assistant to monitor.</p>
              <div className="flex flex-wrap gap-2">
                {ISSUES.map((issue) => (
                  <button
                    key={issue}
                    onClick={() => toggleArray("issues", issue)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition ${data.issues.includes(issue)
                        ? "border-[var(--accent-mid)] bg-[var(--accent-mid)] text-white shadow-sm"
                        : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)]"
                      }`}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-[var(--border)] shrink-0 flex justify-between items-center bg-white rounded-b-2xl">
          <button onClick={handleClear} className="text-sm text-red-600 font-medium hover:underline px-2 py-1 transition">
            Clear all
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="rounded-xl bg-gray-100 hover:bg-gray-200 text-[var(--foreground)] px-5 py-2.5 text-sm font-semibold transition">
              Cancel
            </button>
            <button onClick={handleSave} className="rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-mid)] text-white px-6 py-2.5 text-sm font-semibold shadow-sm transition">
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
