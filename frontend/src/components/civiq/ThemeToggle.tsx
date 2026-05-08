"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { startTransition, useEffect, useState } from "react";

const spring = { type: "spring" as const, stiffness: 300, damping: 25, mass: 0.85 };

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <div
        className="h-8 w-[52px] shrink-0 rounded-full bg-[var(--surface-elevated)]"
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative h-8 w-[52px] shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-0 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.15),0_1px_0_rgba(255,255,255,0.04)] transition-transform duration-200 ease-out hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] active:scale-[0.98]"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        initial={false}
        animate={{
          background: isDark
            ? "linear-gradient(135deg, rgba(75,92,118,0.45) 0%, rgba(35,44,56,0.55) 100%)"
            : "linear-gradient(135deg, rgba(255,215,160,0.4) 0%, rgba(255,248,230,0.25) 55%, rgba(210,220,240,0.2) 100%)",
        }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      />

      <AnimatePresence>
        {isDark ? (
          <motion.span
            key="stars"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-2 top-2 flex gap-1"
            aria-hidden
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block size-0.5 rounded-full bg-[var(--foreground)]/45"
                style={{ opacity: 0.4 + i * 0.15 }}
              />
            ))}
          </motion.span>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="absolute top-0.5 left-0.5 z-[1] flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] will-change-transform"
        initial={false}
        animate={{
          x: isDark ? 22 : 0,
          backgroundColor: isDark ? "rgba(52, 62, 78, 0.98)" : "rgba(255, 246, 228, 0.96)",
          boxShadow: isDark
            ? "0 2px 10px -2px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 16px -2px rgba(120, 150, 190, 0.45)"
            : "0 2px 10px -2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.65), 0 0 14px -2px rgba(255, 190, 100, 0.4)",
        }}
        transition={spring}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ opacity: 0, rotate: -50, scale: 0.65 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 50, scale: 0.65 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <Moon className="size-4 text-[#c5d4e8]" strokeWidth={2} aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ opacity: 0, rotate: 50, scale: 0.65 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -50, scale: 0.65 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <Sun className="size-4 text-[#c9956a]" strokeWidth={2} aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
