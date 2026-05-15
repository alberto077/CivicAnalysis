"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type ThemedSelectOption = {
  value: string;
  label: string;
};

const TRIGGER_CLASS =
  "rep-select font-work-sans flex w-full min-h-[2.625rem] min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[linear-gradient(140deg,rgba(255,255,255,0.92)_0%,rgba(246,250,255,0.82)_100%)] px-3 py-2 text-sm font-bold text-[var(--foreground)] shadow-[0_10px_24px_-16px_rgba(26,54,93,0.32)] outline-none transition focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)]/40 dark:bg-[linear-gradient(165deg,rgba(29,36,45,0.9)_0%,rgba(20,26,34,0.88)_100%)] dark:hover:bg-[linear-gradient(165deg,rgba(34,42,52,0.94)_0%,rgba(24,30,38,0.92)_100%)]";

const PANEL_CLASS =
  "filter-dd-panel themed-scrollbar font-work-sans absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(246,250,255,0.92)_100%)] py-1 shadow-[0_14px_40px_-18px_rgba(26,54,93,0.3),0_4px_18px_-6px_rgba(15,23,42,0.12)] backdrop-blur-[18px] dark:border-[var(--border)] dark:bg-[linear-gradient(135deg,rgba(23,29,36,0.96)_0%,rgba(14,19,24,0.94)_100%)]";

export function ThemedSelect({
  instanceId,
  value,
  options,
  onChange,
  ariaLabel,
}: {
  instanceId: string;
  value: string;
  options: ThemedSelectOption[];
  onChange: (next: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = `${instanceId}-listbox`;

  const currentOption = options.find((o) => o.value === value);
  const currentIndex = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const list = listRef.current;
    const node = list?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      setOpen(true);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((idx) => Math.min(options.length - 1, idx + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((idx) => Math.max(0, idx - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const next = options[activeIndex];
      if (next) {
        onChange(next.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        id={instanceId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className={TRIGGER_CLASS}
        onClick={() =>
          setOpen((wasOpen) => {
            if (wasOpen) return false;
            setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
            return true;
          })
        }
        onKeyDown={onTriggerKeyDown}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {currentOption?.label ?? value}
        </span>
        <ChevronDown
          className={`pointer-events-none size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ease-out dark:text-[var(--icon-violet)] ${
            open ? "rotate-180" : "rotate-0"
          }`}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          onKeyDown={onListKeyDown}
          className={PANEL_CLASS}
        >
          {options.map((opt, index) => {
            const isSelected = value === opt.value;
            const isActive = activeIndex === index;
            return (
              <li key={opt.value} role="none" className="px-1">
                <button
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-option-index={index}
                  className={`filter-dd-option font-work-sans flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold tracking-[0.02em] transition ${
                    isSelected
                      ? "filter-dd-option-active bg-[var(--accent-soft)]/35 text-[var(--accent)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent-soft)]"
                      : isActive
                        ? "bg-[var(--accent-soft)]/15 text-[var(--foreground)] dark:bg-[var(--surface-elevated)]/70"
                        : "text-[var(--foreground)] hover:bg-[var(--accent-soft)]/15 dark:hover:bg-[var(--surface-elevated)]/70"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected ? (
                    <span
                      aria-hidden
                      className="ml-2 text-xs font-bold text-[var(--accent)] dark:text-[var(--accent-soft)]"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
