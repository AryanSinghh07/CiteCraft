import type { Publication, PublicationSummary } from '@/types';

/**
 * Builds summary statistics for a list of publications.
 * @param ownerName excluded from the co-author counts
 */
export const generatePublicationSummary = (
  publications: Publication[],
  ownerName?: string,
): PublicationSummary => {
  const summary: PublicationSummary = {
    totalPublications: publications.length,
    journalArticles: publications.filter(p => p.type === 'journal').length,
    conferenceProceedings: publications.filter(p => p.type === 'conference').length,
    books: publications.filter(p => p.type === 'book').length,
    bookChapters: publications.filter(p => p.type === 'chapter').length,
    other: publications.filter(p => p.type === 'other').length,
    citationCount: publications.reduce((sum, pub) => sum + (pub.citations || 0), 0),
    publicationsByYear: {},
    topJournals: {},
    topConferences: {},
    coAuthors: {},
  };

  const owner = ownerName?.trim().toLowerCase();

  for (const pub of publications) {
    const year = pub.year.toString();
    summary.publicationsByYear[year] = (summary.publicationsByYear[year] || 0) + 1;

    if (pub.journal) {
      summary.topJournals[pub.journal] = (summary.topJournals[pub.journal] || 0) + 1;
    }
    if (pub.conference) {
      summary.topConferences[pub.conference] = (summary.topConferences[pub.conference] || 0) + 1;
    }
    for (const author of pub.authors) {
      const name = author.trim();
      if (!name || name.toLowerCase() === owner) continue;
      summary.coAuthors[name] = (summary.coAuthors[name] || 0) + 1;
    }
  }

  return summary;
};
