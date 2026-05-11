"use client";

import { Fragment } from "react";

/** Insert spaces around **bold** when the model glues tokens (e.g. is**$4**per). */
function ensureSpacesAroundBold(s: string): string {
  let t = s;
  let prev = "";
  let guard = 0;
  while (t !== prev && guard++ < 10) {
    prev = t;
    t = t.replace(/([^*\s])(\*\*[\s\S]*?\*\*)/g, "$1 $2");
    t = t.replace(/(\*\*[\s\S]*?\*\*)([A-Za-z0-9$€£])/g, "$1 $2");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

/** Remove stray single `*` while preserving `**` pairs. When `preserveEdges`, do not trim (so spaces after **…** stay). */
function stripLoneAsterisks(s: string, opts?: { preserveEdges?: boolean }): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "*" && s[i + 1] === "*") {
      out += "**";
      i++;
      continue;
    }
    if (s[i] === "*") continue;
    out += s[i];
  }
  const collapsed = out.replace(/\s{2,}/g, " ");
  return opts?.preserveEdges ? collapsed : collapsed.trim();
}

function isBoldSegment(seg: string): boolean {
  return seg.startsWith("**") && seg.endsWith("**") && seg.length >= 4;
}

/**
 * Renders plain text with **double-asterisk** segments as bold (from model output).
 */
export function BriefingInline({ text }: { text: string }) {
  const normalized = ensureSpacesAroundBold(text.trim());
  const segments = normalized.split(/(\*\*[\s\S]*?\*\*)/g);
  return (
    <>
      {segments.map((seg, i) => {
        const prev = i > 0 ? segments[i - 1]! : "";
        const prevBold = isBoldSegment(prev);

        if (isBoldSegment(seg)) {
          const spaceBefore = i > 0 && !prevBold && prev !== "" && !/\s$/.test(prev);
          return (
            <Fragment key={i}>
              {spaceBefore ? " " : null}
              <strong className="font-semibold text-slate-900 dark:text-[var(--foreground)]">
                {stripLoneAsterisks(seg.slice(2, -2))}
              </strong>
            </Fragment>
          );
        }

        const cleaned = stripLoneAsterisks(seg, { preserveEdges: true });
        if (!cleaned.trim()) return null;
        const spaceAfterBold = i > 0 && prevBold && !/^\s/.test(cleaned);
        return (
          <span key={i}>
            {spaceAfterBold ? " " : null}
            {cleaned}
          </span>
        );
      })}
    </>
  );
}
