"use client";

import { usePathname } from "next/navigation";
import { type RefObject, useEffect, useState } from "react";

const FOOTER_ID = "site-footer";
const DEFAULT_GAP = 12;

function resolveBaseBottom(baseBottom: number, baseBottomSm?: number): number {
  if (
    baseBottomSm !== undefined &&
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 640px)").matches
  ) {
    return baseBottomSm;
  }
  return baseBottom;
}

function computeBottom(
  baseBottom: number,
  gap: number,
  widgetHeight: number,
): number {
  const footer = document.getElementById(FOOTER_ID);
  if (!footer) return baseBottom;

  const { top, bottom } = footer.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  if (bottom <= 0 || top >= viewportHeight) {
    return baseBottom;
  }

  // Footer scrolled above the FAB zone — do not lift (avoids pushing buttons off-screen).
  const bottomZoneTop = viewportHeight - baseBottom - widgetHeight;
  if (bottom <= bottomZoneTop) {
    return baseBottom;
  }

  const requiredBottom = viewportHeight - top + gap;
  return Math.max(baseBottom, requiredBottom);
}

/** Keeps fixed bottom UI above `#site-footer` while scrolling. */
export function useFooterAwareBottom(
  baseBottom = 20,
  baseBottomSm?: number,
  gap = DEFAULT_GAP,
  fallbackWidgetHeight = 56,
  measureRef?: RefObject<HTMLElement | null>,
  remeasureKey?: unknown,
): number {
  const pathname = usePathname();
  const [bottom, setBottom] = useState(baseBottom);

  useEffect(() => {
    const update = () => {
      const base = resolveBaseBottom(baseBottom, baseBottomSm);
      const measured = measureRef?.current?.getBoundingClientRect().height;
      const widgetHeight =
        measured && measured > 0 ? measured : fallbackWidgetHeight;
      setBottom(computeBottom(base, gap, widgetHeight));
    };

    update();

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    const footer = document.getElementById(FOOTER_ID);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (footer) {
      resizeObserver?.observe(footer);
    }
    if (measureRef?.current) {
      resizeObserver?.observe(measureRef.current);
    }

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    mediaQuery.addEventListener("change", update);

    const raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      mediaQuery.removeEventListener("change", update);
      resizeObserver?.disconnect();
    };
  }, [baseBottom, baseBottomSm, gap, fallbackWidgetHeight, measureRef, pathname, remeasureKey]);

  return bottom;
}
