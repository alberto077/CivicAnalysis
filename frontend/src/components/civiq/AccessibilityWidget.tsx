"use client";

//import { useEffect, useMemo, useRef, useState } from "react";
import { Accessibility as AccessibilityIcon } from "lucide-react"; //used https://lucide.dev/icons/accessibility
import { useEffect, useMemo, useRef, useState } from "react";

type AccessibilitySettings = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
  readableFont: boolean;
  focusMode: boolean;
  colorBlindFriendly: boolean;
};

type SettingKey = keyof AccessibilitySettings;

const STORAGE_KEY = "civic_accessibility_settings";

const DEFAULT_SETTINGS: AccessibilitySettings = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
  readableFont: false,
  focusMode: false,
  colorBlindFriendly: false,
};

const SETTINGS: {
  key: SettingKey;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: "largeText",
    label: "Larger Text",
    description: "Increase text size across the site.",
    icon: "A+",
  },
  {
    key: "highContrast",
    label: "High Contrast",
    description: "Improve color contrast for readability.",
    icon: "◐",
  },
  {
    key: "reduceMotion",
    label: "Reduce Motion",
    description: "Limit animations and transitions.",
    icon: "↯",
  },
  {
    key: "underlineLinks",
    label: "Underline Links",
    description: "Make links easier to recognize.",
    icon: "🔗",
  },
  {
    key: "readableFont",
    label: "Readable Font",
    description: "Switch to a simpler system font.",
    icon: "Aa",
  },
  {
    key: "focusMode",
    label: "Focus Mode",
    description: "Make keyboard focus outlines stronger.",
    icon: "◎",
  },
  {
    key: "colorBlindFriendly",
    label: "Color Blind Friendly",
    description: "Use safer contrast and less color-only meaning.",
    icon: "CB",
  },
];

function getSavedSettings(): AccessibilitySettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(saved) as Partial<AccessibilitySettings>;

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getReadablePageText() {
  const selectedText = window.getSelection()?.toString().trim();

  if (selectedText) {
    return selectedText.replace(/\s+/g, " ").slice(0, 15000);
  }

  const main = document.querySelector("main");
  const rawText = main?.textContent || document.body.textContent || "";

  return rawText
    .replace(/\s+/g, " ")
    .replace(/A\+ Accessibility Display tools for easier reading\./gi, "")
    .trim()
    .slice(0, 15000);
}
function SettingButton({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-[#12355b] bg-[#12355b] text-white shadow-sm dark:border-[var(--accent)] dark:bg-[var(--accent)]/25 dark:text-[var(--foreground)]"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)] dark:hover:border-[var(--accent)]/40 dark:hover:bg-[var(--surface-card)]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
            active
              ? "bg-white text-[#12355b] dark:bg-[var(--foreground)] dark:text-[var(--background)]"
              : "bg-slate-100 text-slate-900 dark:bg-[var(--surface-card)] dark:text-[var(--foreground)]"
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>

        <span className="min-w-0">
          <span className="block text-sm font-bold">{label}</span>
          <span
            className={`mt-0.5 block text-xs leading-snug ${
              active
                ? "text-white/85 dark:text-[var(--foreground-secondary)]"
                : "text-slate-500 dark:text-[var(--foreground-secondary)]"
            }`}
          >
            {description}
          </span>
        </span>
      </span>

      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
          active
            ? "bg-white text-[#12355b] dark:bg-[var(--foreground)] dark:text-[var(--background)]"
            : "bg-slate-100 text-slate-500 dark:bg-[var(--surface-card)] dark:text-[var(--foreground-secondary)]"
        }`}
      >
        {active ? "On ✓" : "Off"}
      </span>
    </button>
  );
}

export function AccessibilityWidget() {
  const hasLoadedSavedSettings = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] =
    useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechError, setSpeechError] = useState("");

  const activeCount = useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      hasLoadedSavedSettings.current = true;
      setSettings(getSavedSettings());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle("access-large-text", settings.largeText);
    root.classList.toggle("access-high-contrast", settings.highContrast);
    root.classList.toggle("access-reduce-motion", settings.reduceMotion);
    root.classList.toggle("access-underline-links", settings.underlineLinks);
    root.classList.toggle("access-readable-font", settings.readableFont);
    root.classList.toggle("access-focus-mode", settings.focusMode);
    root.classList.toggle(
      "access-color-blind-friendly",
      settings.colorBlindFriendly,
    );

    if (hasLoadedSavedSettings.current) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggleSetting(key: SettingKey) {
    hasLoadedSavedSettings.current = true;

    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: !currentSettings[key],
    }));
  }

  function resetSettings() {
    hasLoadedSavedSettings.current = true;
    setSettings(DEFAULT_SETTINGS);
  }

  function readPageAloud() {
    setSpeechError("");

    if (!("speechSynthesis" in window)) {
      setSpeechError("Text-to-speech is not supported in this browser.");
      return;
    }

    const text = getReadablePageText();

    if (!text) {
      setSpeechError("No readable page text found.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
      setSpeechError("Unable to read the page aloud right now.");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function pauseSpeech() {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.pause();
    setIsPaused(true);
  }

  function resumeSpeech() {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.resume();
    setIsPaused(false);
    setIsSpeaking(true);
  }

  function stopSpeech() {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {isOpen ? (
        <div className="mb-4 flex max-h-[calc(100vh-13rem)] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
          <div className="shrink-0 bg-gradient-to-br from-[#12355b] via-[#0b1f3a] to-[#061525] px-5 py-4 text-white dark:from-[#0e2845] dark:via-[#081628] dark:to-[#04101c]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#12355b] shadow-sm">
                  <AccessibilityIcon className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="text-base font-black !text-white drop-shadow-sm">
                    Accessibility
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-white">
                    Display tools for easier reading.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white transition hover:bg-white/25"
                aria-label="Close accessibility menu"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/20 bg-white/15 px-3 py-2 text-xs font-semibold text-white">
              {activeCount > 0
                ? `${activeCount} accessibility setting${
                    activeCount === 1 ? "" : "s"
                  } active`
                : "No accessibility settings active"}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {SETTINGS.map((setting) => (
              <SettingButton
                key={setting.key}
                icon={setting.icon}
                label={setting.label}
                description={setting.description}
                active={settings[setting.key]}
                onClick={() => toggleSetting(setting.key)}
              />
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-[var(--foreground)]">
                    Text to Speech
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[var(--foreground-secondary)]">
                    Read the current page aloud.
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    isSpeaking
                      ? "bg-[#12355b] text-white dark:bg-[var(--foreground)] dark:text-[var(--background)]"
                      : "bg-slate-200 text-slate-600 dark:bg-[var(--surface-card)] dark:text-[var(--foreground-secondary)]"
                  }`}
                >
                  {isSpeaking ? (isPaused ? "Paused" : "Reading") : "Idle"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={readPageAloud}
                  className="rounded-xl bg-[#12355b] px-3 py-2 text-xs font-black text-white transition hover:opacity-90 dark:bg-[var(--foreground)] dark:text-[var(--background)]"
                >
                  Read Selected / Page
                </button>

                <button
                  type="button"
                  onClick={stopSpeech}
                  disabled={!isSpeaking && !isPaused}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[var(--foreground)] dark:hover:bg-[var(--surface-elevated)]"
                >
                  Stop
                </button>

                <button
                  type="button"
                  onClick={pauseSpeech}
                  disabled={!isSpeaking || isPaused}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[var(--foreground)] dark:hover:bg-[var(--surface-elevated)]"
                >
                  Pause
                </button>

                <button
                  type="button"
                  onClick={resumeSpeech}
                  disabled={!isPaused}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--surface-card)] dark:text-[var(--foreground)] dark:hover:bg-[var(--surface-elevated)]"
                >
                  Resume
                </button>
              </div>

              {speechError ? (
                <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                  {speechError}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={resetSettings}
              disabled={activeCount === 0}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--surface-elevated)] dark:text-[var(--foreground)] dark:hover:bg-[var(--surface-card)]"
            >
              Reset Settings
            </button>

            <p className="px-1 pt-1 text-center text-[11px] text-slate-500 dark:text-[var(--foreground-secondary)]">
              Preferences are saved on this device. Text-to-speech uses your
              browser’s built-in voice.
            </p>
          </div>
        </div>
      ) : null}

      <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/90 bg-slate-950/78 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_10px_3px_rgba(255,255,255,0.28),0_0_16px_5px_rgba(255,255,255,0.1)] backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-white hover:shadow-[0_0_0_2px_rgba(255,255,255,0.34),0_0_12px_4px_rgba(255,255,255,0.32),0_0_20px_6px_rgba(255,255,255,0.12)] dark:border-white/85 dark:bg-slate-950/62 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.22),0_0_8px_3px_rgba(255,255,255,0.18),0_0_14px_5px_rgba(147,197,253,0.12)] dark:hover:border-white dark:hover:shadow-[0_0_0_2px_rgba(255,255,255,0.36),0_0_12px_4px_rgba(255,255,255,0.24),0_0_18px_6px_rgba(56,189,248,0.12)]"
          aria-label="Open accessibility menu"
        >
          <AccessibilityIcon className="h-6 w-6 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.85)] dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]" />
        {activeCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#facc15] px-1 text-[10px] font-black text-[#061525] dark:bg-sky-300 dark:text-slate-950 dark:ring-1 dark:ring-sky-100/40">
            {activeCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}