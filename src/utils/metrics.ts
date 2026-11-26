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

/** Publications and citations for every year from the first to the latest (gaps filled with 0). */
export function yearSeries(publications: Publication[]) {
  if (publications.length === 0) return [];
  const years = publications.map(p => p.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const byYear = new Map(citationsByPublicationYear(publications).map(e => [e.year, e]));
  const series: { year: number; publications: number; citations: number }[] = [];
  for (let year = first; year <= last; year++) {
    const entry = byYear.get(year);
    series.push({ year, publications: entry?.publications ?? 0, citations: entry?.citations ?? 0 });
  }
  return series;
}

/** Counts how often each value appears, most common first. */
export function rank(values: string[], limit = 6) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const raw of values) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = counts.get(key) ?? { name, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
}
