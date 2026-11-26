import type { Publication } from '@/types';
import { toBibtex } from './bibtex';
import { PUBLICATION_TYPES, venueOf } from './publicationTypes';
import { formatBibliography, type CitationStyle } from './citations';

/** File exports for a publication list. */

const csvCell = (value: string | number | undefined) => {
  const text = value === undefined ? '' : String(value);
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function toCsv(publications: Publication[]): string {
  const header = ['Title', 'Authors', 'Type', 'Venue', 'Year', 'Citations', 'DOI', 'URL', 'Tags'];
  const rows = publications.map(p => [
    p.title,
    p.authors.join('; '),
    PUBLICATION_TYPES[p.type].label,
    venueOf(p),
    p.year,
    p.citations ?? 0,
    p.doi,
    p.url,
    (p.tags ?? []).join('; '),
  ]);
  // BOM so Excel opens UTF-8 (accented names) correctly.
  return '﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export const exportCsv = (pubs: Publication[]) =>
  downloadFile(`citecraft-publications-${stamp()}.csv`, toCsv(pubs), 'text/csv;charset=utf-8');

export const exportBibtex = (pubs: Publication[]) =>
  downloadFile(`citecraft-publications-${stamp()}.bib`, toBibtex(pubs), 'application/x-bibtex;charset=utf-8');

export const exportBibliography = (pubs: Publication[], style: CitationStyle) =>
  downloadFile(
    `citecraft-references-${style}-${stamp()}.txt`,
    formatBibliography(pubs, style),
    'text/plain;charset=utf-8',
  );
