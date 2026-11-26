import type { PublicationInput, PublicationType } from '@/types';
import { cleanLatex } from './bibtex';
import { GENERIC_VENUE_TYPES } from './publicationTypes';

/** Looks up publication details for a DOI using the free Crossref API. */

/** Extracts a bare DOI from "10.x/…", "doi:10.x/…" or "https://doi.org/10.x/…". */
export function normalizeDoi(input: string): string | null {
  const match = /10\.\d{4,9}\/\S+/i.exec(decodeURIComponent(input.trim()));
  return match ? match[0].replace(/[.,;)\]]+$/, '') : null;
}

const TYPE_MAP: Record<string, PublicationType> = {
  'journal-article': 'journal',
  'proceedings-article': 'conference',
  book: 'book',
  monograph: 'book',
  'edited-book': 'book',
  'book-chapter': 'chapter',
  'book-section': 'chapter',
  'book-part': 'chapter',
  dissertation: 'thesis',
  report: 'report',
  'report-component': 'report',
  'posted-content': 'preprint',
};

interface CrossrefWork {
  type?: string;
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  'container-title'?: string[];
  issued?: { 'date-parts'?: (number | null)[][] };
  published?: { 'date-parts'?: (number | null)[][] };
  abstract?: string;
  'is-referenced-by-count'?: number;
  URL?: string;
  subject?: string[];
  DOI?: string;
  institution?: { name?: string }[];
  publisher?: string;
}

/** Removes the JATS XML tags Crossref puts in abstracts. */
const stripTags = (html: string) =>
  html
    .replace(/<jats:title>.*?<\/jats:title>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export async function lookupDoi(input: string, signal?: AbortSignal): Promise<PublicationInput> {
  const doi = normalizeDoi(input);
  if (!doi) throw new Error('That doesn’t look like a DOI. It should start with “10.”, e.g. 10.1038/nature14539');

  let response: Response;
  try {
    response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new Error('Couldn’t reach Crossref. Check your connection and try again.');
  }
  if (response.status === 404) throw new Error(`No publication found for DOI ${doi}.`);
  if (!response.ok) throw new Error('Crossref is not responding right now. Please try again shortly.');

  const { message: work } = (await response.json()) as { message: CrossrefWork };
  const type = TYPE_MAP[work.type ?? ''] ?? 'other';
  const container = cleanLatex(work['container-title']?.[0] ?? '');
  const year = (work.issued ?? work.published)?.['date-parts']?.[0]?.[0] ?? new Date().getFullYear();

  return {
    title: cleanLatex(work.title?.[0] ?? ''),
    authors: (work.author ?? [])
      .map(a => a.name ?? [a.given, a.family].filter(Boolean).join(' '))
      .filter(Boolean),
    type,
    year,
    journal: type === 'journal' ? container || undefined : undefined,
    conference: type === 'conference' ? container || undefined : undefined,
    book: type === 'chapter' || type === 'book' ? container || undefined : undefined,
    venue: GENERIC_VENUE_TYPES.includes(type)
      ? container || work.institution?.[0]?.name || work.publisher || undefined
      : undefined,
    doi: work.DOI ?? doi,
    url: work.URL,
    abstract: work.abstract ? stripTags(work.abstract) : undefined,
    citations: work['is-referenced-by-count'] ?? 0,
    tags: (work.subject ?? []).slice(0, 5),
  };
}

/**
 * Splits imports into new publications and ones already in the library
 * (same DOI, or same title + year when there is no DOI).
 */
export function partitionDuplicates<T extends { title: string; year: number; doi?: string }>(
  incoming: T[],
  existing: { title: string; year: number; doi?: string }[],
): { fresh: T[]; duplicates: T[] } {
  const keyOf = (p: { title: string; year: number; doi?: string }) =>
    p.doi ? `doi:${p.doi.toLowerCase()}` : `title:${p.title.trim().toLowerCase().replace(/\W+/g, ' ')}:${p.year}`;
  const seen = new Set(existing.map(keyOf));
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const p of incoming) {
    const key = keyOf(p);
    if (seen.has(key)) duplicates.push(p);
    else {
      seen.add(key);
      fresh.push(p);
    }
  }
  return { fresh, duplicates };
}
