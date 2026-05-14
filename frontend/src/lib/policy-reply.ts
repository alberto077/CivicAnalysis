export type PolicySource = {
  title: string;
  description: string;
  /** Official URL when the model or client merged index metadata. */
  url?: string;
  source_type?: string;
  published_date?: string;
};

/** Deduped rows from vector search (always has a URL when present). */
export type PolicyRetrievalSource = {
  title: string;
  source_url: string;
  source_type: string;
  published_date?: string;
};

export type BriefingSourceCard = {
  title: string;
  description: string;
  url?: string;
  source_type?: string;
  published_date?: string;
};

export type PolicyResponse = {
  /** 1–2 very short sentences; always present after normalize (may be derived). */
  tldr: string[];
  /** Short topic labels for chips (e.g. Housing, Budget). */
  topic_tags: string[];
  what_happened: string[];
  why_it_matters: string[];
  whos_affected: string[];
  /** Stats, dollars, dates, vote counts — model may use **bold** inside strings. */
  key_numbers: string[];
  what_happens_next: string[];
  /** Extra detail for progressive disclosure (Read more). */
  read_more: string[];
  /** Legacy fields — kept in sync for older UI paths. */
  at_a_glance: string[];
  key_takeaways: string[];
  what_this_means: string[];
  relevant_actions: string[];
  sources: PolicySource[];
  /** Official URLs from the retrieval index (merged in `sendChat`). */
  retrieval_sources: PolicyRetrievalSource[];
  /** Number of document excerpts passed to the model. */
  sources_used: number;
};

function filterStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (value as unknown[]).filter((item): item is string => typeof item === "string");
}

const KEY_NUMBER_BAD_PATTERNS: RegExp[] = [
  /\$X\b/i,
  /€X\b/i,
  /£X\b/i,
  /\*\*\$X\*\*/i,
  /\*\*€X\*\*/i,
  /\*\*£X\*\*/i,
  /\*\*Date\*\*/i,
  /^Date\s+/i,
  /\bTBD\b/i,
  /\bN\/?A\b/i,
  /placeholder/i,
  /\bXXX\b/i,
  /\[\s*\.{3}\s*\]/,
];

/** Placeholder / junk filter shared by full lines and short KPI snippets. */
function keyNumberHasDisqualifyingPattern(t: string): boolean {
  for (const re of KEY_NUMBER_BAD_PATTERNS) {
    if (re.test(t)) return true;
  }
  const boldLead = t.match(/^\*\*([^*]+)\*\*/)?.[1]?.trim() ?? "";
  if (/^\$[xX]$/.test(boldLead) || /^[€£][xX]$/.test(boldLead)) return true;
  if (/^date$/i.test(boldLead)) return true;
  return false;
}

/** Remove template KPIs (e.g. $X, **Date**) so Key numbers only shows concrete figures from context. */
export function isFactualKeyNumberLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 4) return false;
  if (keyNumberHasDisqualifyingPattern(t)) return false;
  if (!/\d/.test(t)) return false;
  return true;
}

function filterFactualKeyNumbers(lines: string[]): string[] {
  return lines.map((s) => s.trim()).filter(Boolean).filter(isFactualKeyNumberLine);
}

/** Legislative / bill labels — not dashboard metrics. */
function isBillOrResolutionFigure(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/[$€£]/.test(t)) return false;
  if (/\d+(?:\.\d+)?\s*%/.test(t)) return false;
  if (/\d[\d,]*(?:\.\d+)?\s*(?:million|billion|thousand)\b/i.test(t)) return false;
  if (/\d+(?:\.\d+)?\s*(?:bps|basis\s+points)\b/i.test(t)) return false;

  if (/\b(?:nys\s+)?bill\s+[sa]\d/i.test(t)) return true;
  if (/\b(?:senate|assembly)\s+bill\b/i.test(t)) return true;
  if (/\bintro\.?\s*\d+/i.test(t)) return true;
  if (/\bh\.?\s*r\.?\s*\d+/i.test(t)) return true;
  if (/\b(?:chapter|local law)\s+\d+/i.test(t)) return true;
  const compact = t.replace(/\s+/g, "");
  if (/^(?:NYS)?Bill[SA]\d{4,}$/i.test(compact)) return true;
  if (/^[SA]\d{4,}$/i.test(compact)) return true;
  if (/\b[sa]\s*-?\d{4,}\b/i.test(t)) return true;
  return false;
}

function kpiCardHeadIsBillFigure(s: string): boolean {
  const m = s.match(/^\*\*([^*]+)\*\*/);
  return Boolean(m?.[1] && isBillOrResolutionFigure(m[1]));
}

/** Narrative lines: require a KPI-worthy numeric signal (avoid weak "3 steps"). */
export function lineHasSignificantNumericSignal(line: string): boolean {
  const t = line.trim();
  if (/[\$€£]\s*[\d,]/i.test(t)) return true;
  if (/\d{4,}/.test(t)) return true;
  if (/\d{1,4}\s*[-–]\s*\d{1,4}/.test(t)) return true;
  if (/\d+(?:\.\d+)?\s*%/.test(t)) return true;
  if (/\d[\d,]*(?:\.\d+)?\s*(?:million|billion|thousand)\b/i.test(t)) return true;
  if (/\d[\d,]*(?:\.\d+)?\s*[kmb]\b/i.test(t)) return true;
  if (/\d+(?:\.\d+)?\s*(?:bps|basis\s+points)\b/i.test(t)) return true;
  return false;
}

function normDedupeBriefingLine(line: string): string {
  return line
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Narrative KPI cards must carry a figure plus readable context (not bare IDs/years). */
function isFactualKpiSnippet(t: string): boolean {
  const s = t.trim();
  if (s.length < 8 || !/\d/.test(s)) return false;
  if (kpiCardHeadIsBillFigure(s)) return false;
  if (!lineHasSignificantNumericSignal(s)) return false;
  if (keyNumberHasDisqualifyingPattern(s)) return false;
  const boldCtx = /^\*\*[^*]{1,56}\*\*\s+.{5,}/.test(s);
  const statCtx =
    /^((?:\$|€|£)?[\d,.]+(?:%|[kmb])?|\d+\s*[-–/]\s*\d+)\s*[—:–\-]\s+.{5,}/i.test(s);
  return boldCtx || statCtx;
}

function plainBriefingText(line: string): string {
  return line.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function wordsAround(plain: string, start: number, end: number, maxBefore: number, maxAfter: number): string {
  const beforeSeg = plain.slice(0, Math.max(0, start));
  const mid = plain.slice(start, end);
  const afterSeg = plain.slice(end);
  const beforeWords = beforeSeg.trim().split(/\s+/).filter(Boolean).slice(-maxBefore);
  const afterWords = afterSeg.trim().split(/\s+/).filter(Boolean).slice(0, maxAfter);
  return [...beforeWords, mid, ...afterWords].join(" ").replace(/\s+/g, " ").trim();
}

/** Figure must be a monetary or percentage-style metric (not bill no. / resolution labels). */
function isNumericFigureLike(s: string): boolean {
  const t = s.trim();
  if (!/\d/.test(t)) return false;
  if (isBillOrResolutionFigure(t)) return false;
  if (/[$€£]/.test(t)) return true;
  if (/\d+(?:\.\d+)?\s*%/.test(t)) return true;
  if (/\d[\d,]*(?:\.\d+)?\s*(?:million|billion|thousand)\b/i.test(t)) return true;
  if (/\d[\d,]*(?:\.\d+)?\s*[kmb]\b/i.test(t)) return true;
  if (/\d+(?:\.\d+)?\s*(?:bps|basis\s+points)\b/i.test(t)) return true;
  return false;
}

function stripCaptionLeadNoise(s: string): string {
  let t = s.trim().replace(/\s+/g, " ");
  const reps = [
    /^(?:will be|is|are|was|were|has been|have been|would be|could be)\s+/i,
    /^(?:allocated|earmarked|authorized|approved|directed|expected)\s+to\s+/i,
    /^(?:in order to|in an effort to)\s+/i,
  ];
  for (const re of reps) t = t.replace(re, "").trim();
  return t.replace(/^[,;:\s]+/, "");
}

function titleCaseShortLabel(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/** First N words after dropping leading articles / light filler. */
function firstMeaningfulWords(s: string, maxWords: number): string {
  const leadSkip = new Set(["a", "an", "the", "in", "on", "at", "to", "of", "for", "by", "and", "or", "that"]);
  let words = stripCaptionLeadNoise(s)
    .replace(/[.,;:]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  let guard = 0;
  while (words.length && guard < 3 && leadSkip.has(words[0].toLowerCase().replace(/[^a-z]/gi, ""))) {
    words = words.slice(1);
    guard += 1;
  }
  return words.slice(0, maxWords).join(" ");
}

/**
 * Turn a long briefing fragment into a short, human-readable metric label (not a trimmed sentence tail).
 */
function buildSensibleKpiMetricLabel(figure: string, rawCaption: string): string {
  const t = stripCaptionLeadNoise(rawCaption).slice(0, 280);
  const low = t.toLowerCase();
  const hasMoney = /[$€£]/.test(figure);
  const hasPct = /%/.test(figure);

  if (hasMoney) {
    if (/\blate\s+fees?\b/i.test(low)) return "Late payment fees";
    if (
      /\blate\b/.test(low) &&
      /\b(?:interest|rate|penalties|payment|payments)\b/i.test(low)
    ) {
      return "Late payment interest";
    }
    if (/\bemergency\s+(?:funding|aid|relief|budget|appropriation)\b/i.test(low)) return "Emergency funding";
    if (/\bgovernment\s+operations\b/i.test(low)) return "Government operations";
    if (/\bhousing\s+(?:trust|fund)\b/i.test(low)) return "Housing trust fund";
    if (/\brent\s+(?:stabilization|relief|support)\b/i.test(low)) return "Rent stabilization";
  }
  if (hasPct) {
    if (/\b(?:increase|rise|hike|jump|surge|uptick)\b/i.test(low)) return "Rate increase";
    if (/\b(?:decrease|drop|cut|decline|fall)\b/i.test(low)) return "Rate decrease";
    if (/\bproperty\s+tax(es)?\b/i.test(low)) return "Property tax";
    if (/\bsales\s+tax(es)?\b/i.test(low)) return "Sales tax";
  }

  const toPurpose = t.match(/\bto\s+(support|fund|cover|help|pay|offset|backstop)\s+([^.]{4,56})/i);
  if (toPurpose) {
    const chunk = firstMeaningfulWords(toPurpose[2], 4);
    if (chunk.length >= 5) return titleCaseShortLabel(chunk);
  }

  const forWhat = t.match(/^(?:for|toward|towards)\s+([^.]{4,60})/i);
  if (forWhat) {
    const chunk = firstMeaningfulWords(forWhat[1], 5);
    if (chunk.length >= 5) return titleCaseShortLabel(chunk);
  }

  const chunk = firstMeaningfulWords(t, 5);
  if (chunk.length >= 6) return titleCaseShortLabel(chunk);
  const fallback = firstMeaningfulWords(rawCaption, 5);
  return fallback.length >= 4 ? titleCaseShortLabel(fallback) : titleCaseShortLabel(chunk);
}

/**
 * `**figure** caption` for KeyNumberKpiCard — caption is a short, sensible label derived from briefing text.
 */
function toBoldFigureCard(figure: string, plain: string, figStart: number, figEnd: number): string | null {
  const f = figure.replace(/\s+/g, " ").trim();
  if (!f || !isNumericFigureLike(f)) return null;

  const tryWindow = (before: number, after: number): string | null => {
    const window = wordsAround(plain, figStart, figEnd, before, after);
    const lowWin = window.toLowerCase();
    const lowFig = f.toLowerCase();
    const idx = lowWin.indexOf(lowFig);
    let captionAfter = "";
    let captionBefore = "";
    if (idx >= 0) {
      captionBefore = window.slice(0, idx).trim().replace(/[(,:;]+$/, "");
      captionAfter = window.slice(idx + f.length).trim().replace(/^[,;:)\s]+/, "");
    } else {
      captionAfter = window.replace(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
    }
    let caption = "";
    if (captionAfter.length >= 6) caption = captionAfter;
    else if (captionBefore.split(/\s+/).filter(Boolean).length >= 2 && captionBefore.length >= 6) {
      caption = captionBefore.split(/\s+/).filter(Boolean).slice(-9).join(" ");
    } else if (captionAfter.length > 0) caption = captionAfter;
    else if (captionBefore.length > 0) {
      caption = captionBefore.split(/\s+/).filter(Boolean).slice(-7).join(" ");
    }
    caption = caption.replace(/\s+/g, " ").trim().slice(0, 220);
    if (caption.length < 5) return null;
    if (!/[$€£]/.test(f) && caption.length < 8 && !/\d+(?:\.\d+)?\s*%/.test(f)) return null;
    const label = buildSensibleKpiMetricLabel(f, caption);
    if (!label || label.length < 4) return null;
    return `**${f}** ${label}`;
  };

  return tryWindow(9, 10) ?? tryWindow(14, 16);
}

type RegexHit = { figStart: number; figEnd: number; figure: string; spanLen: number };

function pushRegexHits(plain: string, re: RegExp, mapHit: (m: RegExpExecArray) => RegexHit | null, out: RegexHit[]) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain)) !== null) {
    const hit = mapHit(m);
    if (hit) out.push(hit);
  }
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

function mergeRegexHits(hits: RegexHit[]): RegexHit[] {
  const sorted = [...hits].sort((a, b) => b.spanLen - a.spanLen || a.figStart - b.figStart);
  const kept: RegexHit[] = [];
  for (const h of sorted) {
    const span: [number, number] = [h.figStart, h.figEnd];
    if (kept.some((k) => rangesOverlap(span, [k.figStart, k.figEnd]))) continue;
    kept.push(h);
  }
  kept.sort((a, b) => a.figStart - b.figStart);
  return kept;
}

/**
 * Stable key so the same metric (money, %, range, vote) does not appear twice.
 */
function canonicalKpiDedupeKey(snippet: string): string | null {
  const t = normDedupeBriefingLine(snippet);
  const pctRange = t.match(
    /(\d+(?:\.\d+)?)\s*%\s*(?:to|through|and|[-–])\s*(\d+(?:\.\d+)?)\s*%/,
  );
  if (pctRange) return `pctr:${pctRange[1]}-${pctRange[2]}`;
  const moneyRange = t.match(
    /[$€£]\s*[\d,.]+(?:\.\d+)?(?:\s*(?:million|billion|thousand|[kmb]))?\s*[-–]\s*[$€£]?\s*[\d,.]+(?:\.\d+)?(?:\s*(?:million|billion|thousand|[kmb]))?/,
  );
  if (moneyRange) return `moneyr:${normDedupeBriefingLine(moneyRange[0])}`;
  const symMoney = t.match(/[$€£]\s*([\d,.]+)(?:\s*([kmb]|million|billion|thousand))?\b/);
  if (symMoney) {
    const n = symMoney[1].replace(/,/g, "");
    const mult = (symMoney[2] || "").replace(/million|billion|thousand/g, (w) =>
      w.startsWith("mil") ? "m" : w.startsWith("bil") ? "b" : w.startsWith("thou") ? "k" : w,
    );
    return `money:${n}:${mult}`;
  }
  const wordMoney = t.match(/([\d,.]+)(?:\s*([kmb]|million|billion|thousand))\b/);
  if (wordMoney && /million|billion|thousand|[kmb]\b/.test(t)) {
    return `moneyw:${wordMoney[1].replace(/,/g, "")}:${(wordMoney[2] || "").slice(0, 3)}`;
  }
  const pctChg = t.match(
    /(?:\b(?:up|rose|grew|increased|jumped|climbed|higher|more|surged)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%|\b(\d+(?:\.\d+)?)\s*%\s*(?:increase|rise|growth|jump|surge|hike|uptick))/,
  );
  if (pctChg) {
    const n = (pctChg[1] || pctChg[2] || "").replace(/,/g, "");
    if (n) return `pctchg:${n}`;
  }
  const pctDrop = t.match(
    /(?:\b(?:down|fell|dropped|decreased|lower|cut|slid)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%|\b(\d+(?:\.\d+)?)\s*%\s*(?:decrease|decline|drop|fall|cut))/,
  );
  if (pctDrop) {
    const n = (pctDrop[1] || pctDrop[2] || "").replace(/,/g, "");
    if (n) return `pctdrop:${n}`;
  }
  const bps = t.match(/\b(\d+(?:\.\d+)?)\s*(?:bps|basis\s+points)\b/);
  if (bps) return `bps:${bps[1]}`;
  const pct = t.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return `pct:${pct[1]}`;
  return null;
}

function lineLooksBillOrIntroJargon(t: string): boolean {
  return (
    /\b(?:nys\s+)?bill\s+[sa]\d/i.test(t) ||
    /\b(?:senate|assembly)\s+bill\b/i.test(t) ||
    /\bintro\.?\s*\d/i.test(t) ||
    /\bh\.?\s*r\.?\s*\d/i.test(t) ||
    /\b[sa]\s*-?\d{4,}\b/i.test(t)
  );
}

/**
 * Pulls `**figure** context` cards from a narrative bullet (money, %, ranges, % change, bps — not bills/Intro).
 */
function extractKpiSnippetsFromLine(line: string): string[] {
  const plain = plainBriefingText(line);
  if (!isFactualKeyNumberLine(line) || !lineHasSignificantNumericSignal(line)) return [];

  const rawHits: RegexHit[] = [];

  pushRegexHits(
    plain,
    /\b\d+(?:\.\d+)?\s*%\s*(?:to|through|and|\s*[-–]\s*)\s*\d+(?:\.\d+)?\s*%/gi,
    (m) => ({
      figStart: m.index,
      figEnd: m.index + m[0].length,
      figure: m[0].replace(/\s+/g, " ").trim(),
      spanLen: m[0].length,
    }),
    rawHits,
  );

  pushRegexHits(
    plain,
    /[$€£]\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand|[kmb]))?\s*[-–]\s*[$€£]?\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand|[kmb]))?\b/gi,
    (m) => ({
      figStart: m.index,
      figEnd: m.index + m[0].length,
      figure: m[0].replace(/\s+/g, " ").trim(),
      spanLen: m[0].length,
    }),
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b(?:up|rose|grew|increased|jumped|climbed|higher|surged)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    (m) => {
      const inner = m[0].match(/(\d+(?:\.\d+)?)\s*%/);
      if (!inner || inner.index === undefined) return null;
      const fs = m.index + inner.index;
      const fe = fs + inner[0].length;
      const figure = plain.slice(fs, fe).replace(/\s+/g, " ").trim();
      return { figStart: fs, figEnd: fe, figure, spanLen: m[0].length };
    },
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b(?:down|fell|dropped|decreased|lower|cut|slid)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    (m) => {
      const inner = m[0].match(/(\d+(?:\.\d+)?)\s*%/);
      if (!inner || inner.index === undefined) return null;
      const fs = m.index + inner.index;
      const fe = fs + inner[0].length;
      const figure = plain.slice(fs, fe).replace(/\s+/g, " ").trim();
      return { figStart: fs, figEnd: fe, figure, spanLen: m[0].length };
    },
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b(\d+(?:\.\d+)?)\s*%\s*(?:increase|increases|rise|rises|growth|jump|jumps|surge|surges|hike|hikes|uptick|upticks)\b/gi,
    (m) => {
      const inner = m[0].match(/^(\d+(?:\.\d+)?)\s*%/i);
      if (!inner || inner.index === undefined) return null;
      const fs = m.index + inner.index;
      const fe = fs + inner[0].length;
      const figure = plain.slice(fs, fe).replace(/\s+/g, " ").trim();
      return { figStart: fs, figEnd: fe, figure, spanLen: m[0].length };
    },
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b(\d+(?:\.\d+)?)\s*%\s*(?:decrease|decreases|decline|declines|drop|drops|fall|falls|cut|cuts)\b/gi,
    (m) => {
      const inner = m[0].match(/^(\d+(?:\.\d+)?)\s*%/i);
      if (!inner || inner.index === undefined) return null;
      const fs = m.index + inner.index;
      const fe = fs + inner[0].length;
      const figure = plain.slice(fs, fe).replace(/\s+/g, " ").trim();
      return { figStart: fs, figEnd: fe, figure, spanLen: m[0].length };
    },
    rawHits,
  );

  pushRegexHits(
    plain,
    /[$€£]\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand|[kmb]))?\b/gi,
    (m) => ({
      figStart: m.index,
      figEnd: m.index + m[0].length,
      figure: m[0].replace(/\s+/g, " ").trim(),
      spanLen: m[0].length,
    }),
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b[\d,]+(?:\.\d+)?\s*(?:million|billion|thousand)\b/gi,
    (m) => ({
      figStart: m.index,
      figEnd: m.index + m[0].length,
      figure: m[0].replace(/\s+/g, " ").trim(),
      spanLen: m[0].length,
    }),
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b\d+(?:\.\d+)?\s*(?:bps|basis\s+points)\b/gi,
    (m) => ({
      figStart: m.index,
      figEnd: m.index + m[0].length,
      figure: m[0].replace(/\s+/g, " ").trim(),
      spanLen: m[0].length,
    }),
    rawHits,
  );

  pushRegexHits(
    plain,
    /\b\d+(?:\.\d+)?\s*%/g,
    (m) => ({
      figStart: m.index,
      figEnd: m.index + m[0].length,
      figure: m[0].replace(/\s+/g, " ").trim(),
      spanLen: m[0].length,
    }),
    rawHits,
  );

  const merged = mergeRegexHits(rawHits);
  const seen = new Set<string>();

  type SortPair = { d: string; sortIdx: number };
  const sortPairs: SortPair[] = [];

  const pushPair = (card: string | null, sortIdx: number) => {
    if (!card) return;
    const d = card.replace(/\s+/g, " ").trim();
    if (kpiCardHeadIsBillFigure(d)) return;
    if (!isFactualKeyNumberLine(d) && !isFactualKpiSnippet(d)) return;
    const key = canonicalKpiDedupeKey(d) ?? normDedupeBriefingLine(d);
    if (!key || seen.has(key)) return;
    seen.add(key);
    sortPairs.push({ d, sortIdx });
  };

  for (const h of merged) {
    pushPair(toBoldFigureCard(h.figure, plain, h.figStart, h.figEnd), h.figStart);
  }

  for (const m of line.matchAll(/\*\*([^*]{2,44})\*\*/g)) {
    const inner = m[1].trim();
    if (!/\d/.test(inner) || !isNumericFigureLike(inner)) continue;
    const plainIdx = plain.indexOf(inner);
    if (plainIdx < 0) continue;
    pushPair(toBoldFigureCard(inner, plain, plainIdx, plainIdx + inner.length), plainIdx);
  }

  sortPairs.sort((a, b) => a.sortIdx - b.sortIdx);
  return sortPairs.map((p) => p.d);
}

/**
 * Bold lead `**figure** caption` or `12-0 — caption` → one compact card string; else figure snippets.
 * When `allowShortFallback` is false (narrative), never use the whole bullet unless it already matches
 * a compact pattern — keeps the KPI strip to dashboard-style metrics only.
 */
function keyNumberLineToKpiDisplays(line: string, allowShortFallback: boolean): string[] {
  const t = line.trim();
  if (!isFactualKeyNumberLine(t)) return [];

  const boldLead = t.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
  if (boldLead) {
    const head = boldLead[1].trim();
    const rest = boldLead[2].trim();
    if (/\d/.test(head) && head.length <= 40 && !isBillOrResolutionFigure(head)) {
      if (!rest) return [`**${head}**`];
      const label = buildSensibleKpiMetricLabel(head, rest);
      return [label.length >= 4 ? `**${head}** ${label}` : `**${head}** ${rest}`];
    }
  }

  const statLead = t.match(
    /^((?:\$|€|£)?[\d,.]+(?:%|[kmb])?|\d+\s*[-–/]\s*\d+)\s*[—:–\-]\s+(.+)$/i,
  );
  if (statLead && statLead[1].length <= 28) {
    const fig = statLead[1].trim();
    const tail = (statLead[2] || "").trim();
    if (tail) {
      const label = buildSensibleKpiMetricLabel(fig, tail);
      if (label.length >= 4) return [`**${fig}** ${label}`];
    }
    return [t];
  }

  if (
    allowShortFallback &&
    t.length <= 42 &&
    lineHasSignificantNumericSignal(t) &&
    !lineLooksBillOrIntroJargon(t)
  ) {
    return [t];
  }

  const snippets = extractKpiSnippetsFromLine(t);
  return snippets.length ? snippets : [];
}

const DEFAULT_DISPLAY_KEY_NUMBERS_MAX = 8;

/**
 * Merges model `key_numbers` with narrative bullets that contain grounded-style figures,
 * deduped and capped for KPI cards. Narrative metrics are formatted as `**figure** short context`
 * (money, %, ranges, increases/decreases, bps) — not bill / Intro labels.
 */
export function buildDisplayKeyNumbers(
  b: PolicyResponse,
  maxItems: number = DEFAULT_DISPLAY_KEY_NUMBERS_MAX,
): string[] {
  const out: string[] = [];
  const seenCanon = new Set<string>();

  const push = (raw: string) => {
    const t = raw.trim();
    if (!t || kpiCardHeadIsBillFigure(t)) return;
    if (!isFactualKeyNumberLine(t) && !isFactualKpiSnippet(t)) return;
    const canon = canonicalKpiDedupeKey(t) ?? normDedupeBriefingLine(t);
    if (!canon || seenCanon.has(canon)) return;
    seenCanon.add(canon);
    out.push(t);
  };

  for (const line of b.key_numbers) {
    for (const disp of keyNumberLineToKpiDisplays(line, true)) {
      push(disp);
      if (out.length >= maxItems) return out;
    }
  }

  const narrativeFields: string[][] = [
    b.tldr,
    b.what_happened,
    b.why_it_matters,
    b.whos_affected,
    b.what_happens_next,
    b.read_more,
  ];

  for (const arr of narrativeFields) {
    for (const line of arr) {
      if (!isFactualKeyNumberLine(line) || !lineHasSignificantNumericSignal(line)) continue;
      for (const disp of keyNumberLineToKpiDisplays(line, false)) {
        push(disp);
        if (out.length >= maxItems) return out;
      }
    }
  }

  return out;
}

function parseTldr(payload: Record<string, unknown>): string[] {
  const raw = payload.tldr;
  if (typeof raw === "string" && raw.trim()) {
    const one = raw.trim();
    const bySentence = one.split(/(?<=[.!?])\s+/).filter(Boolean);
    return bySentence.slice(0, 2).length ? bySentence.slice(0, 2) : [one];
  }
  if (Array.isArray(raw)) {
    const lines = raw.filter((item): item is string => typeof item === "string").map((s) => s.trim()).filter(Boolean);
    return lines.slice(0, 2);
  }
  return [];
}

function optString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

/** Allow only http(s) links in UI anchors. */
export function safeHttpUrl(raw: string | undefined): string | undefined {
  const u = raw?.trim();
  if (!u) return undefined;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    return undefined;
  }
  return undefined;
}

function normTitleKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Host + pathname only — used to recover the indexed URL when the model emits
// a truncated version of the same link (LLMs routinely drop `?ID=…` etc).
function urlPathKey(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host.toLowerCase()}${u.pathname}`;
  } catch {
    return "";
  }
}

/**
 * Merge LLM narrative sources with retrieval index URLs so cards always prefer
 * official links when titles align; unmatched retrieval rows are appended.
 */
export function buildBriefingSourceCards(
  llmSources: PolicySource[],
  retrieval: PolicyRetrievalSource[],
): BriefingSourceCard[] {
  const usedUrls = new Set<string>();
  const out: BriefingSourceCard[] = [];

  const retrievalList = retrieval.filter((r) => safeHttpUrl(r.source_url));
  const byExact = new Map<string, PolicyRetrievalSource>();
  const byPath = new Map<string, string>();
  for (const r of retrievalList) {
    byExact.set(normTitleKey(r.title), r);
    const url = safeHttpUrl(r.source_url);
    const key = url ? urlPathKey(url) : "";
    if (url && key && !byPath.has(key)) byPath.set(key, url);
  }

  for (const s of llmSources) {
    const key = normTitleKey(s.title);
    let match = byExact.get(key);
    if (!match) {
      match =
        retrievalList.find(
          (r) =>
            normTitleKey(r.title).includes(key) ||
            key.includes(normTitleKey(r.title)),
        ) ?? undefined;
    }
    // Trust the retrieval index over the model: it preserves query params
    // (e.g. `?ID=12345`) that the LLM tends to drop. Fall back to the LLM URL
    // only when there's no title match and no same-path retrieval row.
    const matchUrl = match ? safeHttpUrl(match.source_url) : undefined;
    const llmUrl = safeHttpUrl(s.url);
    const llmPathHit = llmUrl ? byPath.get(urlPathKey(llmUrl)) : undefined;
    const url = matchUrl ?? llmPathHit ?? llmUrl;
    if (url) usedUrls.add(url);
    out.push({
      title: s.title.trim() || "Source",
      description: s.description.trim(),
      url,
      source_type: optString(s.source_type) || optString(match?.source_type),
      published_date: optString(s.published_date) || optString(match?.published_date),
    });
  }

  for (const r of retrievalList) {
    const url = safeHttpUrl(r.source_url);
    if (!url || usedUrls.has(url)) continue;
    usedUrls.add(url);
    out.push({
      title: r.title.trim() || "Source",
      description: r.source_type
        ? `${r.source_type} — official record from the indexed library.`
        : "Official document from the indexed search library.",
      url,
      source_type: optString(r.source_type),
      published_date: optString(r.published_date),
    });
  }

  return out;
}

/** Parse `retrieval_sources` from the `/api/chat` JSON envelope (deduped URLs from the index). */
export function parseRetrievalSourcesEnvelope(
  data: Record<string, unknown>,
  maxItems = 12,
): PolicyRetrievalSource[] {
  const raw = data.retrieval_sources;
  if (!Array.isArray(raw)) return [];

  const out: PolicyRetrievalSource[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim() : "";
    const source_url = typeof r.source_url === "string" ? r.source_url.trim() : "";
    const source_type = typeof r.source_type === "string" ? r.source_type.trim() : "";
    const published_date = optString(r.published_date);
    if (!source_url) continue;
    out.push({
      title: title || "Source",
      source_url,
      source_type,
      ...(published_date ? { published_date } : {}),
    });
    if (out.length >= maxItems) break;
  }
  return out;
}

export function normalizePolicyReply(payload: unknown): PolicyResponse {
  const p =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const raw_at_a_glance = filterStrings(p.at_a_glance);
  const raw_key_takeaways = filterStrings(p.key_takeaways);
  const raw_what_this_means = filterStrings(p.what_this_means);
  const raw_relevant_actions = filterStrings(p.relevant_actions);

  const raw_what_happened = filterStrings(p.what_happened);
  const raw_why = filterStrings(p.why_it_matters);
  const raw_who = filterStrings(p.whos_affected);
  const raw_next = filterStrings(p.what_happens_next);

  const what_happened = raw_what_happened.length ? raw_what_happened : raw_at_a_glance;
  const at_a_glance = raw_at_a_glance.length ? raw_at_a_glance : what_happened;

  const why_it_matters = raw_why.length ? raw_why : raw_key_takeaways;
  const key_takeaways = raw_key_takeaways.length ? raw_key_takeaways : why_it_matters;

  const whos_affected = raw_who.length ? raw_who : raw_what_this_means;
  const what_this_means = raw_what_this_means.length ? raw_what_this_means : whos_affected;

  const what_happens_next = raw_next.length ? raw_next : raw_relevant_actions;
  const relevant_actions = raw_relevant_actions.length ? raw_relevant_actions : what_happens_next;

  const key_numbers = filterFactualKeyNumbers(filterStrings(p.key_numbers));

  const read_more = filterStrings(p.read_more);

  let tldr = parseTldr(p);
  if (tldr.length === 0) {
    const fromGlance = at_a_glance.slice(0, 2).map((s) => {
      const t = s.trim();
      if (t.length <= 200) return t;
      return `${t.slice(0, 197)}…`;
    });
    tldr = fromGlance.length ? fromGlance : [];
  }
  if (tldr.length > 2) tldr = tldr.slice(0, 2);

  const topic_tags = filterStrings(p.topic_tags);

  const sources: PolicySource[] = Array.isArray(p.sources)
    ? (p.sources as unknown[])
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as Record<string, unknown>).title === "string" &&
            typeof (item as Record<string, unknown>).description === "string",
        )
        .map((item) => {
          const url =
            optString(item.url) ||
            optString(item.source_url) ||
            optString(item.href) ||
            optString(item.link);
          return {
            title: String(item.title).trim(),
            description: String(item.description).trim(),
            url,
            source_type: optString(item.source_type),
            published_date: optString(item.published_date),
          };
        })
    : [];

  return {
    tldr,
    topic_tags,
    what_happened,
    why_it_matters,
    whos_affected,
    key_numbers,
    what_happens_next,
    read_more,
    at_a_glance: at_a_glance.length ? at_a_glance : what_happened,
    key_takeaways: key_takeaways.length ? key_takeaways : why_it_matters,
    what_this_means: what_this_means.length ? what_this_means : whos_affected,
    relevant_actions: relevant_actions.length ? relevant_actions : what_happens_next,
    sources,
    retrieval_sources: [],
    sources_used: 0,
  };
}

export function hasPolicyBriefingContent(b: PolicyResponse): boolean {
  return (
    b.tldr.length > 0 ||
    b.topic_tags.length > 0 ||
    b.what_happened.length > 0 ||
    b.why_it_matters.length > 0 ||
    b.whos_affected.length > 0 ||
    b.key_numbers.length > 0 ||
    b.what_happens_next.length > 0 ||
    b.read_more.length > 0 ||
    b.at_a_glance.length > 0 ||
    b.key_takeaways.length > 0 ||
    b.what_this_means.length > 0 ||
    b.relevant_actions.length > 0 ||
    b.sources.length > 0 ||
    b.retrieval_sources.length > 0
  );
}

export function ragReplyHasError(reply: unknown): boolean {
  return (
    typeof reply === "object" &&
    reply !== null &&
    "error" in reply &&
    typeof (reply as Record<string, unknown>).error === "string"
  );
}

/** Plain-style RAG reply: `{ "markdown": "..." }` from the backend. */
export function extractRagMarkdown(reply: unknown): string {
  if (typeof reply !== "object" || reply === null) return "";
  const md = (reply as Record<string, unknown>).markdown;
  return typeof md === "string" ? md.trim() : "";
}

export type RetrievalTier = "vector" | "lexical" | "recent" | "none";
