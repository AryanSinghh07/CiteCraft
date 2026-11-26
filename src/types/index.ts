/** The signed-in account (identity only). */
export interface AuthUser {
  id: string;
  email: string;
}

/** Academic profile shown on the dashboard and profile page. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  affiliation: string;
  position: string;
  department: string;
  photoUrl?: string;
  bio?: string;
  researchInterests?: string[];
  orcid?: string;
  googleScholar?: string;
  website?: string;
}

/** @deprecated use Profile */
export type User = Profile;

export type PublicationType = 'journal' | 'conference' | 'book' | 'chapter' | 'other';

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  journal?: string;
  conference?: string;
  book?: string;
  year: number;
  doi?: string;
  url?: string;
  abstract?: string;
  citations?: number;
  type: PublicationType;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Fields the user fills in; ids and timestamps are set by the data layer. */
export type PublicationInput = Omit<Publication, 'id' | 'createdAt' | 'updatedAt'>;

export interface DocumentRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  publicationId?: string | null;
  storagePath: string;
  createdAt: string;
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
