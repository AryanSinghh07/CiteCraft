import type { SummaryFocus, SummaryLength } from '@/types';

/**
 * Quick summary that runs entirely in the browser — no server, no AI, no cost.
 * It is *extractive*: it scores every sentence by how many of the document's key
 * words it contains (plus its position and the chosen focus) and keeps the best
 * ones in their original order. Works best on English prose.
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
  key_findings: /\b(result|results|found|find|findings|show(?:s|ed)?|significant(?:ly)?|increase[sd]?|decrease[sd]?|improve[sd]?|improvement|accuracy|outperform\w*|conclude[sd]?|conclusion|achiev\w+|reduc\w+)\b|\d+(?:\.\d+)?\s?%/i,
  methods: /\b(method\w*|approach|dataset|data set|data|sample[sd]?|participants|survey\w*|interview\w*|model\w*|algorithm\w*|experiment\w*|procedure|framework|architecture|trained|training|evaluat\w+|measured|analy[sz]\w+)\b/i,
  literature: /\b(propose[sd]?|contribut\w+|novel|result\w*|found|limitation\w*|future work|method\w*|approach|outperform\w*|conclude[sd]?)\b/i,
  action_items: /\b(will|should|must|need(?:s)? to|deadline|due|action|next steps?|to-?do|responsible|assign\w*|follow[- ]up|by (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week))\b/i,
};

const COUNTS: Record<SummaryLength, number> = { brief: 3, standard: 6, detailed: 10 };

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}][\p{L}\p{N}'-]*/gu) ?? [];
const stem = (w: string) => w.replace(/'s$/, '').replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1');

/** Splits text into sentences, also treating bullet / heading lines as their own units. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .replace(/-\n(?=[a-z])/g, '') // re-join words hyphenated across lines (PDFs)
    .split(/\n{2,}|\n(?=\s*(?:[-•*▪●]|\d+[.)])\s)/)
    .flatMap(block =>
      block
        .replace(/\s*\n\s*/g, ' ')
        .split(/(?<=[.!?])["”')\]]*\s+(?=["“([]?[A-Z0-9])/)
        .map(s => s.replace(/^\s*(?:[-•*▪●]|\d+[.)])\s+/, '').trim()),
    )
    .filter(Boolean);
}

export interface QuickSummaryResult {
  markdown: string;
  wordCount: number;
  keywords: string[];
}

export function quickSummary(
  text: string,
  options: { length: SummaryLength; focus: SummaryFocus; fileName?: string },
): QuickSummaryResult {
  const all = splitSentences(text);
  const wordCount = words(text).length;
  // Ignore fragments and very long run-ons (tables, references).
  const sentences = all
    .map((s, index) => ({ s, index, w: words(s) }))
    .filter(x => x.w.length >= 6 && x.w.length <= 70 && !/^(references|bibliography|acknowledg)/i.test(x.s))
    // short lines without ending punctuation are titles / headings, not statements
    .filter(x => /[.!?:;"”')]$/.test(x.s) || x.w.length >= 12);

  if (sentences.length === 0) {
    throw new Error('There isn’t enough readable text in this file to summarize.');
  }

  // Term frequencies (stemmed, without stop words).
  const freq = new Map<string, number>();
  const display = new Map<string, Map<string, number>>();
  for (const { w } of sentences) {
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
  const total = sentences.length;

  const scored = sentences.map(x => {
    const keys = x.w.filter(t => t.length >= 3 && !STOPWORDS.has(t)).map(stem);
    const unique = [...new Set(keys)];
    let score = unique.reduce((sum, k) => sum + (freq.get(k) ?? 0) / maxFreq, 0) / Math.pow(Math.max(8, x.w.length), 0.6);
    if (x.index < Math.max(3, total * 0.1)) score *= 1.25; // openings usually state the point
    if (focus?.test(x.s)) score *= 1.6;
    if (options.focus === 'simple') score *= x.w.length <= 22 ? 1.3 : 0.8;
    return { ...x, score, matchesFocus: Boolean(focus?.test(x.s)), keySet: new Set(unique) };
  });

  // Pick the best sentences, skipping near-duplicates.
  const picked: typeof scored = [];
  // With a focus chosen, sentences that match it come first; then the best of the rest.
  const ranked = [...scored].sort((a, b) => Number(b.matchesFocus) - Number(a.matchesFocus) || b.score - a.score);
  for (const candidate of ranked) {
    if (picked.length >= COUNTS[options.length] + 1) break;
    const duplicate = picked.some(p => {
      const overlap = [...candidate.keySet].filter(k => p.keySet.has(k)).length;
      return overlap / Math.max(1, Math.min(candidate.keySet.size, p.keySet.size)) > 0.7;
    });
    if (!duplicate) picked.push(candidate);
  }
  const [lead, ...rest] = picked;
  const points = rest.sort((a, b) => a.index - b.index);

  const keywords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => [...(display.get(k) ?? new Map([[k, 1]])).entries()].sort((a, b) => b[1] - a[1])[0][0]);

  const minutes = Math.max(1, Math.round(wordCount / 220));
  const heading =
    options.focus === 'action_items'
      ? 'Decisions & action items'
      : options.focus === 'key_findings'
        ? 'Key findings'
        : options.focus === 'methods'
          ? 'Methods & approach'
          : options.focus === 'slides'
            ? 'Slide points'
            : 'Key points';

  const markdown = [
    '## TL;DR',
    lead.s,
    '',
    `## ${heading}`,
    ...(points.length ? points.map(p => `- ${p.s}`) : ['- (The document is short — the TL;DR covers it.)']),
    '',
    '## Keywords',
    keywords.map(k => `\`${k}\``).join(' · '),
    '',
    '## About this document',
    `- About **${wordCount.toLocaleString()} words** · roughly **${minutes} min** to read`,
    `- ${points.length + 1} of ${total} sentences selected`,
    '',
    '_Quick summary made in your browser from the document’s own sentences._',
  ].join('\n');

  return { markdown, wordCount, keywords };
}
