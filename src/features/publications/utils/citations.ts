import type { Publication } from '@/types';
import { GENERIC_VENUE_TYPES, PUBLICATION_TYPES, venueOf } from './publicationTypes';

/** Plain-text citations in common styles, for copying into papers and CVs. */

export type CitationStyle = 'apa' | 'mla' | 'ieee' | 'harvard' | 'chicago';

export const CITATION_STYLES: Record<CitationStyle, string> = {
  apa: 'APA (7th)',
  mla: 'MLA (9th)',
  ieee: 'IEEE',
  harvard: 'Harvard',
  chicago: 'Chicago (author-date)',
};

interface Name {
  first: string[];
  last: string;
}

/** Accepts "First Middle Last" or "Last, First Middle". */
export function parseName(raw: string): Name {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.includes(',')) {
    const [last, rest = ''] = name.split(',', 2);
    return { last: last.trim(), first: rest.trim().split(' ').filter(Boolean) };
  }
  const parts = name.split(' ');
  return { last: parts.pop() ?? '', first: parts };
}

const initials = (first: string[], sep = ' ') =>
  first.map(part => part.split('-').map(p => `${p[0]?.toUpperCase()}.`).join('-')).join(sep);

const venue = (p: Publication) => venueOf(p);
/** "[Thesis]", "[Preprint]"… for work types that aren't journal / conference / book items */
const typeNote = (p: Publication) =>
  GENERIC_VENUE_TYPES.includes(p.type) && p.type !== 'other' ? ` [${PUBLICATION_TYPES[p.type].short}]` : '';
const doiUrl = (p: Publication) => (p.doi ? `https://doi.org/${p.doi}` : p.url || '');
const endWith = (text: string, mark: string) => (/[.?!]$/.test(text) ? text : `${text}${mark}`);

function joinList(items: string[], conjunction: string, serialComma = true): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}${serialComma ? ',' : ''} ${conjunction} ${items[items.length - 1]}`;
}

function apa(p: Publication): string {
  const names = p.authors.filter(Boolean).map(parseName);
  const formatted = names.map(n => (n.first.length ? `${n.last}, ${initials(n.first)}` : n.last));
  let authors: string;
  if (formatted.length > 20) {
    authors = `${formatted.slice(0, 19).join(', ')}, . . . ${formatted[formatted.length - 1]}`;
  } else if (formatted.length > 1) {
    authors = `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
  } else {
    authors = formatted[0] ?? '';
  }
  const parts = [authors && endWith(authors, '.'), `(${p.year}).`, endWith(`${p.title.trim()}${typeNote(p)}`, '.')];
  if (p.type === 'chapter' && p.book) parts.push(`In ${p.book}.`);
  else if (venue(p)) parts.push(`${venue(p)}.`);
  if (doiUrl(p)) parts.push(doiUrl(p));
  return parts.filter(Boolean).join(' ');
}

function mla(p: Publication): string {
  const names = p.authors.filter(Boolean).map(parseName);
  const full = (n: Name) => [...n.first, n.last].join(' ');
  const inverted = (n: Name) => (n.first.length ? `${n.last}, ${n.first.join(' ')}` : n.last);
  let authors = '';
  if (names.length === 1) authors = inverted(names[0]);
  else if (names.length === 2) authors = `${inverted(names[0])}, and ${full(names[1])}`;
  else if (names.length > 2) authors = `${inverted(names[0])}, et al`;

  const title = `“${endWith(p.title.trim(), '.')}”`;
  const container = venue(p);
  const tail = [container, String(p.year)].filter(Boolean).join(', ');
  const link = p.doi ? `https://doi.org/${p.doi}` : p.url;
  return [authors && endWith(authors, '.'), title, link ? `${tail}, ${link}.` : `${tail}.`]
    .filter(Boolean)
    .join(' ');
}

function ieee(p: Publication): string {
  const names = p.authors.filter(Boolean).map(parseName);
  const formatted = names.map(n => [initials(n.first), n.last].filter(Boolean).join(' '));
  const authors = formatted.length > 6 ? `${formatted[0]} et al.` : joinList(formatted, 'and');
  const parts = [authors ? `${authors},` : '', `“${p.title.trim()},”`];
  if (p.type === 'conference' && p.conference) parts.push(`in ${p.conference},`);
  else if (p.type === 'chapter' && p.book) parts.push(`in ${p.book},`);
  else if (venue(p)) parts.push(`${venue(p)},`);
  parts.push(p.doi ? `${p.year}, doi: ${p.doi}.` : `${p.year}.`);
  return parts.filter(Boolean).join(' ');
}

function harvard(p: Publication): string {
  const names = p.authors.filter(Boolean).map(parseName);
  const formatted = names.map(n => (n.first.length ? `${n.last}, ${initials(n.first, '')}` : n.last));
  const authors = formatted.length > 3 ? `${formatted[0]} et al.` : joinList(formatted, 'and', false);
  const parts = [`${authors || 'Anon.'} (${p.year})`, `'${p.title.trim()}'${typeNote(p)},`];
  if (p.type === 'chapter' && p.book) parts.push(`in ${p.book}.`);
  else if (venue(p)) parts.push(`${venue(p)}.`);
  else parts[parts.length - 1] = parts[parts.length - 1].replace(/,$/, '.');
  if (p.doi) parts.push(`doi:${p.doi}.`);
  else if (p.url) parts.push(`Available at: ${p.url}.`);
  return parts.join(' ');
}

function chicago(p: Publication): string {
  const names = p.authors.filter(Boolean).map(parseName);
  const full = (n: Name) => [...n.first, n.last].join(' ');
  const first = names[0] ? (names[0].first.length ? `${names[0].last}, ${names[0].first.join(' ')}` : names[0].last) : '';
  let authors = first;
  if (names.length > 10) authors = `${first}, et al`;
  else if (names.length > 1) authors = joinList([first, ...names.slice(1).map(full)], 'and');
  const parts = [authors && endWith(authors, '.'), `${p.year}.`, `“${endWith(p.title.trim(), '.')}”`];
  if (p.type === 'chapter' && p.book) parts.push(`In ${p.book}.`);
  else if (venue(p)) parts.push(`${venue(p)}${typeNote(p)}.`);
  if (doiUrl(p)) parts.push(`${doiUrl(p)}.`);
  return parts.filter(Boolean).join(' ');
}

export function formatCitation(publication: Publication, style: CitationStyle): string {
  switch (style) {
    case 'apa':
      return apa(publication);
    case 'mla':
      return mla(publication);
    case 'ieee':
      return ieee(publication);
    case 'harvard':
      return harvard(publication);
    case 'chicago':
      return chicago(publication);
  }
}

/** A numbered (IEEE) or alphabetical (APA / MLA) reference list. */
export function formatBibliography(publications: Publication[], style: CitationStyle): string {
  if (style === 'ieee') {
    return publications.map((p, i) => `[${i + 1}] ${ieee(p)}`).join('\n');
  }
  return publications
    .map(p => formatCitation(p, style))
    .sort((a, b) => a.localeCompare(b))
    .join('\n\n');
}
