
export interface User {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  position: string;
  department: string;
  photoUrl?: string;
}

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  journal?: string;
  conference?: string;
  book?: string;  // Added the book property
  year: number;
  doi?: string;
  url?: string;
  abstract?: string;
  citations?: number;
  type: 'journal' | 'conference' | 'book' | 'chapter' | 'other';
  tags?: string[];
}

export interface PublicationSummary {
  totalPublications: number;
  journalArticles: number;
  conferenceProceedings: number;
  books: number;
  bookChapters: number;
  other: number;
  citationCount: number;
  publicationsByYear: Record<string, number>;
  topJournals: Record<string, number>;
  topConferences: Record<string, number>;
  coAuthors: Record<string, number>;
}
