import type { SummaryFocus, SummaryLength } from '@/types';

/**
 * Quick summary that runs entirely in the browser — no server, no AI, no cost.
 * It is *extractive*: it scores every sentence by how many of the document's key
 * words it contains (plus its position and the chosen focus) and keeps the best
 * ones in their original order, grouped under the document's own section headings
 * when it has them (e.g. a résumé's EDUCATION / PROJECTS). Works best on English.
 */

const STOPWORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below between both but by can
  could did do does doing down during each few for from further had has have having he her here hers herself him himself his how
  i if in into is it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out
  over own same she should so some such than that the their theirs them themselves then there these they this those through to too
  under until up us very was we were what when where which while who whom why will with would you your yours yourself yourselves
  may might must shall one two three also however therefore thus hence within without upon via per et al eg ie fig figure table
  using use used based paper study work section chapter page pages show shows shown new well first second many much like
  et-al doi http https www com org pdf`.split(/\s+/),
);

const FOCUS_PATTERNS: Partial<Record<SummaryFocus, RegExp>> = {
  key_findings: /\b(result|results|found|find|findings|show(?:s|ed)?|significant(?:ly)?|increase[sd]?|decrease[sd]?|improve[sd]?|improvement|accuracy|outperform\w*|conclude[sd]?|conclusion|achiev\w+|reduc\w+|won|award\w*|place)\b|\d+(?:\.\d+)?\s?%/i,
  methods: /\b(method\w*|approach|dataset|data set|data|sample[sd]?|participants|survey\w*|interview\w*|model\w*|algorithm\w*|experiment\w*|procedure|framework|architecture|trained|training|evaluat\w+|measured|analy[sz]\w+|built|using)\b/i,
  literature: /\b(propose[sd]?|contribut\w+|novel|result\w*|found|limitation\w*|future work|method\w*|approach|outperform\w*|conclude[sd]?)\b/i,
  action_items: /\b(will|should|must|need(?:s)? to|deadline|due|action|next steps?|to-?do|responsible|assign\w*|follow[- ]up|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week))\b/i,
};

const FOCUS_HEADINGS: Partial<Record<SummaryFocus, string>> = {
  key_findings: 'Key findings',
  methods: 'Methods & approach',
  literature: 'Key points for a literature review',
  action_items: 'Decisions & action items',
  slides: 'Slide points',
};

const COUNTS: Record<SummaryLength, number> = { brief: 4, standard: 7, detailed: 12 };

/** Words that usually mean a line continues on the next one (PDF line wrapping). */
const CONTINUES = /(?:[,;:(/&+-]|\b(?:with|and|or|of|the|a|an|to|for|in|on|at|by|from|using|that|which|as|into|over|under|via|than|is|are|was|were|be|has|have|had|their|its|our|your|his|her))$/i;

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}][\p{L}\p{N}'-]*/gu) ?? [];
const stem = (w: string) => w.replace(/'s$/, '').replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1');
const stripBullet = (line: string) => line.replace(/^\s*(?:[-–•*▪●◦►✓✔]|\(?\d{1,2}[.)])\s+/, '').trim();
const isBullet = (line: string) => /^\s*(?:[-–•*▪●◦►✓✔]|\(?\d{1,2}[.)])\s+/.test(line);
const endsSentence = (line: string) => /[.!?]["”')\]]?$/.test(line.trim());

/** A short line with no full stop, in CAPS or Title Case: a section heading such as "PROJECTS". */
export function isHeading(line: string): boolean {
  const t = line.trim().replace(/:$/, '');
  if (!t || endsSentence(t) || t.length > 60) return false;
  const w = t.split(/\s+/);
  if (w.length > 6) return false;
  const letters = t.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3) return false;
  const caps = letters === letters.toUpperCase();
  const titleCase = w.every(x => !/^\p{Ll}/u.test(x) || /^(of|and|the|for|in|on|to|a|an|&)$/i.test(x));
  return caps || (titleCase && w.length <= 4);
}

/** Contact details and other non-prose lines (emails, phones, URLs, separators). */
const isNoise = (line: string) =>
  /@\S+\.\S+|https?:\/\/|www\.|\+?\d[\d\s-]{8,}\d/.test(line) ||
  (line.match(/\|/g) ?? []).length >= 2 ||
  /^[\W\d\s]+$/.test(line) ||
  isTitle(line);

/** A Title Case line without a full stop, e.g. a document title "Crop Disease Detection with Deep Learning". */
const isTitle = (line: string) => {
  const t = line.trim();
  if (endsSentence(t) || /[,;]/.test(t)) return false; // lists such as "Python, React, SQL" are content
  const w = t.split(/\s+/);
  return w.length <= 12 && w.every(x => !/^\p{Ll}/u.test(x) || /^(of|and|the|for|in|on|to|a|an|with|via|from|by|at|or)$/i.test(x));
};

/** Title Case for headings written in CAPS ("PROJECTS" → "Projects"). */
const headingCase = (h: string) => {
  const t = h.trim().replace(/:$/, '');
  return t === t.toUpperCase() ? t.toLowerCase().replace(/(^|\s)\p{L}/gu, m => m.toUpperCase()) : t;
};

/** Capital first letter and a full stop at the end. */
const tidy = (s: string) => {
  let t = s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]["”')\]]?$/.test(t) ? t : `${t.replace(/[,;:\-–]+$/, '')}.`;
};

export interface Unit {
  text: string;
  /** the section heading this text sits under, if any */
  section?: string;
}

/**
 * Splits document text into sentence-sized units. Wrapped lines are re-joined only
 * when the line clearly continues; headings and bullets start new units.
 */
export function splitUnits(raw: string): Unit[] {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/(\p{L})-\n(?=\p{Ll})/gu, '$1') // words hyphenated across lines
    .split('\n');

  const blocks: Unit[] = [];
  let section: string | undefined;
  let current: string | null = null;
  const flush = () => {
    if (current && current.trim()) blocks.push({ text: current.trim(), section });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line) {
      flush();
      continue;
    }
    if (isHeading(line) && !(current && CONTINUES.test(current))) {
      flush();
      section = headingCase(line);
      continue;
    }
    if (current === null) {
      current = stripBullet(line);
      continue;
    }
    const continues =
      !isBullet(line) &&
      !endsSentence(current) &&
      (CONTINUES.test(current) || /^[\p{Ll}\d(%]/u.test(line));
    if (continues) {
      current += ` ${line}`;
    } else {
      flush();
      current = stripBullet(line);
    }
  }
  flush();

  // Split each block into sentences.
  return blocks.flatMap(b =>
    b.text
      .split(/(?<=[.!?])["”')\]]*\s+(?=["“([]?\p{Lu}|\d)/u)
      .map(t => ({ text: t.trim(), section: b.section }))
      .filter(u => u.text),
  );
}

/** Kept for compatibility: plain sentence strings. */
export const splitSentences = (text: string) => splitUnits(text).map(u => u.text);

export interface QuickSummaryResult {
  markdown: string;
  wordCount: number;
  keywords: string[];
}

export function quickSummary(
  text: string,
  options: { length: SummaryLength; focus: SummaryFocus; fileName?: string },
): QuickSummaryResult {
  const wordCount = words(text).length;
  const candidates = splitUnits(text)
    .filter(u => !isNoise(u.text) && !/^(references|bibliography|acknowledg)/i.test(u.text))
    .map((u, index) => ({ ...u, index, w: words(u.text) }))
    .filter(u => u.w.length >= 4 && u.w.length <= 70);

  if (candidates.length === 0) {
    throw new Error('There isn’t enough readable text in this file to summarize.');
  }

  // Term frequencies (stemmed, without stop words).
  const freq = new Map<string, number>();
  const display = new Map<string, Map<string, number>>();
  for (const { w } of candidates) {
    for (const raw of w) {
      if (raw.length < 3 || STOPWORDS.has(raw) || /^\d+$/.test(raw)) continue;
      const k = stem(raw);
      freq.set(k, (freq.get(k) ?? 0) + 1);
      const forms = display.get(k) ?? new Map<string, number>();
      forms.set(raw, (forms.get(raw) ?? 0) + 1);
      display.set(k, forms);
    }
  }
  const maxFreq = Math.max(1, ...freq.values());
  const focus = FOCUS_PATTERNS[options.focus];
  const total = candidates.length;

  const scored = candidates.map(c => {
    const unique = [...new Set(c.w.filter(t => t.length >= 3 && !STOPWORDS.has(t)).map(stem))];
    let score = unique.reduce((sum, k) => sum + (freq.get(k) ?? 0) / maxFreq, 0) / Math.pow(Math.max(8, c.w.length), 0.6);
    if (c.index < Math.max(3, total * 0.1)) score *= 1.2; // openings usually state the point
    if (c.w.length >= 8) score *= 1.15; // prefer full statements over fragments
    if (options.focus === 'simple') score *= c.w.length <= 22 ? 1.3 : 0.8;
    return { ...c, score, matchesFocus: Boolean(focus?.test(c.text)), keySet: new Set(unique) };
  });

  // With a focus chosen, matching sentences come first; then the best of the rest. Skip near-duplicates.
  const ranked = [...scored].sort((a, b) => Number(b.matchesFocus) - Number(a.matchesFocus) || b.score - a.score);
  const picked: typeof scored = [];
  for (const candidate of ranked) {
    if (picked.length >= COUNTS[options.length] + 1) break;
    const duplicate = picked.some(p => {
      const overlap = [...candidate.keySet].filter(k => p.keySet.has(k)).length;
      return overlap / Math.max(1, Math.min(candidate.keySet.size, p.keySet.size)) > 0.7;
    });
    if (!duplicate) picked.push(candidate);
  }

  // Overview: the best full statement (plus a second one when it is short).
  const overviewPool = [...picked].sort((a, b) => b.score - a.score);
  const lead = overviewPool.find(p => p.w.length >= 8) ?? overviewPool[0];
  const second = lead.w.length < 18 ? overviewPool.find(p => p !== lead && p.w.length >= 8 && p.section === lead.section) : undefined;
  const overview = [lead, second].filter(Boolean) as typeof picked;
  const points = picked.filter(p => !overview.includes(p)).sort((a, b) => a.index - b.index);

  // Group points under the document's own headings when it has several sections.
  const sections = [...new Set(points.map(p => p.section).filter(Boolean))] as string[];
  const grouped = sections.length >= 2;
  const pointLines: string[] = [];
  if (points.length === 0) {
    pointLines.push('- The document is short — the overview above covers it.');
  } else if (grouped) {
    let lastSection: string | undefined | null = null;
    for (const p of points) {
      if (p.section !== lastSection) {
        if (pointLines.length) pointLines.push('');
        pointLines.push(`**${p.section ?? 'General'}**`);
        lastSection = p.section;
      }
      pointLines.push(`- ${tidy(p.text)}`);
    }
  } else {
    pointLines.push(...points.map(p => `- ${tidy(p.text)}`));
  }

  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => [...(display.get(k) ?? new Map([[k, 1]])).entries()].sort((a, b) => b[1] - a[1])[0][0]);

  const minutes = Math.max(1, Math.round(wordCount / 220));

  const markdown = [
    '## Overview',
    overview
      .sort((a, b) => a.index - b.index)
      .map(p => tidy(p.text))
      .join(' '),
    '',
    `## ${FOCUS_HEADINGS[options.focus] ?? 'Key points'}`,
    ...pointLines,
    '',
    '## Keywords',
    keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' · '),
    '',
    '---',
    `_About ${wordCount.toLocaleString()} words · ${minutes} min read · ${picked.length} of ${total} sentences selected · quick summary made in your browser_`,
  ].join('\n');

  return { markdown, wordCount, keywords };
}
