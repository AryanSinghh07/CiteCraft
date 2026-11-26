import type { Publication, PublicationInput, PublicationType } from '@/types';
import { parseName } from './citations';

/** Import from and export to BibTeX (.bib), the format used by Google Scholar, Zotero, Mendeley, etc. */

export interface BibtexParseResult {
  publications: PublicationInput[];
  /** entries that could not be imported, with the reason */
  skipped: { key: string; reason: string }[];
}

const TYPE_MAP: Record<string, PublicationType> = {
  article: 'journal',
  inproceedings: 'conference',
  conference: 'conference',
  proceedings: 'conference',
  book: 'book',
  incollection: 'chapter',
  inbook: 'chapter',
};

const LATEX_ACCENTS: Record<string, string> = {
  "'": '́',
  '`': '̀',
  '^': '̂',
  '"': '̈',
  '~': '̃',
  '=': '̄',
  '.': '̇',
  c: '̧',
  v: '̌',
  u: '̆',
  H: '̋',
};

/** Turns common LaTeX markup into plain text: {\'e} -> é, \& -> &, {Braces} -> Braces. */
export function cleanLatex(value: string): string {
  const accent = (_: string, mark: string, braced?: string, bare?: string) =>
    ((braced ?? bare ?? '') + (LATEX_ACCENTS[mark] ?? '')).normalize('NFC');
  return value
    .replace(/\\([`'^"~=.])\s*(?:\{\s*([A-Za-z])\s*\}|([A-Za-z]))/g, accent) // \'e  \'{e}
    .replace(/\\([cvuH])(?:\s*\{\s*([A-Za-z])\s*\}|\s+([A-Za-z]))/g, accent) // \H{o}  \c c
    .replace(/\\ss\b\{?\}?/g, 'ß')
    .replace(/\\([&%$#_])/g, '$1')
    .replace(/\\textendash\s*|--/g, '–')
    .replace(/\\textemdash\s*|---/g, '—')
    .replace(/\\(emph|textit|textbf|textrm|mathrm)\s*/g, '')
    .replace(/[{}]/g, '')
    .replace(/~/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reads one field value starting at `i` ({...}, "..." or a bare word/number). */
function readValue(text: string, start: number): { value: string; end: number } {
  let i = start;
  while (/\s/.test(text[i] ?? '')) i++;
  const open = text[i];

  if (open === '{') {
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '\\') {
        j++;
        continue;
      }
      if (text[j] === '{') depth++;
      else if (text[j] === '}' && --depth === 0) return { value: text.slice(i + 1, j), end: j + 1 };
    }
    return { value: text.slice(i + 1), end: text.length };
  }

  if (open === '"') {
    let depth = 0;
    for (let j = i + 1; j < text.length; j++) {
      if (text[j] === '\\') {
        j++;
        continue;
      }
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      else if (text[j] === '"' && depth === 0) return { value: text.slice(i + 1, j), end: j + 1 };
    }
    return { value: text.slice(i + 1), end: text.length };
  }

  const match = /^[^,}\s]+/.exec(text.slice(i));
  return { value: match?.[0] ?? '', end: i + (match?.[0].length ?? 0) };
}

/** Splits text into raw entries: { type, key, fields }. Skips @comment / @preamble / @string. */
function tokenize(text: string) {
  const entries: { type: string; key: string; fields: Record<string, string> }[] = [];
  const entryStart = /@(\w+)\s*[{(]/g;
  let match: RegExpExecArray | null;

  while ((match = entryStart.exec(text))) {
    const type = match[1].toLowerCase();
    let i = entryStart.lastIndex;
    if (['comment', 'preamble', 'string'].includes(type)) continue;

    const keyEnd = text.indexOf(',', i);
    if (keyEnd === -1) break;
    const key = text.slice(i, keyEnd).trim();
    i = keyEnd + 1;

    const fields: Record<string, string> = {};
    while (i < text.length) {
      while (/[\s,]/.test(text[i] ?? '')) i++;
      if (text[i] === '}' || text[i] === ')' || i >= text.length) {
        i++;
        break;
      }
      const nameMatch = /^([\w-]+)\s*=/.exec(text.slice(i));
      if (!nameMatch) {
        // malformed field: skip to the next comma
        const next = text.indexOf(',', i);
        i = next === -1 ? text.length : next + 1;
        continue;
      }
      i += nameMatch[0].length;
      // values may be concatenated with #
      let value = '';
      for (;;) {
        const part = readValue(text, i);
        value += part.value;
        i = part.end;
        while (/\s/.test(text[i] ?? '')) i++;
        if (text[i] !== '#') break;
        i++;
      }
      fields[nameMatch[1].toLowerCase()] = value;
    }
    entryStart.lastIndex = i;
    entries.push({ type, key, fields });
  }
  return entries;
}

/** BibTeX "Last, First and First Last" -> ["First Last", "First Last"] */
function parseAuthors(raw: string): string[] {
  return raw
    .split(/\s+and\s+/i)
    .map(a => cleanLatex(a))
    .filter(a => a && a.toLowerCase() !== 'others')
    .map(a => {
      const n = parseName(a);
      return [...n.first, n.last].join(' ').trim();
    });
}

const normalizeDoi = (doi: string) =>
  doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '');

export function parseBibtex(text: string): BibtexParseResult {
  const result: BibtexParseResult = { publications: [], skipped: [] };

  for (const { type, key, fields } of tokenize(text)) {
    const title = cleanLatex(fields.title ?? '');
    const year = parseInt(fields.year ?? '', 10);
    if (!title) {
      result.skipped.push({ key, reason: 'missing title' });
      continue;
    }
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      result.skipped.push({ key, reason: 'missing or invalid year' });
      continue;
    }

    const pubType = TYPE_MAP[type] ?? 'other';
    const booktitle = cleanLatex(fields.booktitle ?? '');
    const keywords = cleanLatex(fields.keywords ?? '');

    result.publications.push({
      title,
      authors: parseAuthors(fields.author ?? fields.editor ?? ''),
      type: pubType,
      year,
      journal: pubType === 'journal' ? cleanLatex(fields.journal ?? fields.journaltitle ?? '') || undefined : undefined,
      conference: pubType === 'conference' ? booktitle || undefined : undefined,
      book:
        pubType === 'chapter' ? booktitle || cleanLatex(fields.title ?? '') : pubType === 'book' ? title : undefined,
      doi: fields.doi ? normalizeDoi(cleanLatex(fields.doi)) : undefined,
      url: fields.url ? fields.url.trim() : undefined,
      abstract: fields.abstract ? cleanLatex(fields.abstract) : undefined,
      tags: keywords ? keywords.split(/[,;]/).map(k => k.trim()).filter(Boolean) : [],
      citations: 0,
    });
  }
  return result;
}

// ------------------------------------------------------------------ export

const REVERSE_TYPE: Record<PublicationType, string> = {
  journal: 'article',
  conference: 'inproceedings',
  book: 'book',
  chapter: 'incollection',
  other: 'misc',
};

const escapeValue = (value: string) => value.replace(/([&%$#_])/g, '\\$1');

function citationKey(p: Publication, used: Set<string>): string {
  const last = parseName(p.authors[0] ?? 'anon').last.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '') || 'anon';
  const word = p.title.toLowerCase().normalize('NFD').replace(/[^a-z\s]/g, '').split(/\s+/).find(w => w.length > 3) ?? 'paper';
  let key = `${last}${p.year}${word}`;
  for (let n = 2; used.has(key); n++) key = `${last}${p.year}${word}${n}`;
  used.add(key);
  return key;
}

export function toBibtex(publications: Publication[]): string {
  const used = new Set<string>();
  return publications
    .map(p => {
      const fields: [string, string | undefined][] = [
        ['title', `{${escapeValue(p.title)}}`],
        ['author', p.authors.length ? escapeValue(p.authors.join(' and ')) : undefined],
        ['journal', p.type === 'journal' ? p.journal : undefined],
        ['booktitle', p.type === 'conference' ? p.conference : p.type === 'chapter' ? p.book : undefined],
        ['year', String(p.year)],
        ['doi', p.doi],
        ['url', p.url],
        ['abstract', p.abstract],
        ['keywords', p.tags?.length ? p.tags.join(', ') : undefined],
      ];
      const body = fields
        .filter((f): f is [string, string] => Boolean(f[1]))
        .map(([name, value]) => `  ${name} = {${name === 'title' || name === 'doi' || name === 'url' ? value : escapeValue(value)}}`)
        .join(',\n');
      return `@${REVERSE_TYPE[p.type]}{${citationKey(p, used)},\n${body}\n}`;
    })
    .join('\n\n');
}
