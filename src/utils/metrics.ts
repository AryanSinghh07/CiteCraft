import type { Publication } from '@/types';

/** Research impact metrics calculated from each publication's citation count. */

/** Largest h such that h publications have at least h citations each. */
export function hIndex(publications: Publication[]): number {
  const counts = publications.map(p => p.citations ?? 0).sort((a, b) => b - a);
  let h = 0;
  while (h < counts.length && counts[h] >= h + 1) h++;
  return h;
}

/** Number of publications with at least 10 citations (Google Scholar's i10-index). */
export function i10Index(publications: Publication[]): number {
  return publications.filter(p => (p.citations ?? 0) >= 10).length;
}

/** Total citations grouped by the year each paper was published, oldest first. */
export function citationsByPublicationYear(publications: Publication[]) {
  const byYear = new Map<number, { year: number; citations: number; publications: number }>();
  for (const p of publications) {
    const entry = byYear.get(p.year) ?? { year: p.year, citations: 0, publications: 0 };
    entry.citations += p.citations ?? 0;
    entry.publications += 1;
    byYear.set(p.year, entry);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export interface ResearchMetrics {
  hIndex: number;
  i10Index: number;
  totalCitations: number;
  averageCitations: number;
  mostCited: Publication | null;
}

export function researchMetrics(publications: Publication[]): ResearchMetrics {
  const totalCitations = publications.reduce((sum, p) => sum + (p.citations ?? 0), 0);
  const mostCited = publications.reduce<Publication | null>(
    (best, p) => ((p.citations ?? 0) > (best?.citations ?? -1) ? p : best),
    null,
  );
  return {
    hIndex: hIndex(publications),
    i10Index: i10Index(publications),
    totalCitations,
    averageCitations: publications.length ? totalCitations / publications.length : 0,
    mostCited: mostCited && (mostCited.citations ?? 0) > 0 ? mostCited : null,
  };
}
