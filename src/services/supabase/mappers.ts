import type { DocumentRecord, Profile, Publication, PublicationInput } from '@/types';

/** Row shapes in Postgres (snake_case) and conversions to app types (camelCase). */

export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  affiliation: string | null;
  position: string | null;
  department: string | null;
  avatar_url: string | null;
  bio: string | null;
  research_interests: string[] | null;
  orcid: string | null;
  google_scholar: string | null;
  website: string | null;
}

export interface PublicationRow {
  id: string;
  user_id: string;
  title: string;
  authors: string[];
  type: Publication['type'];
  journal: string | null;
  conference: string | null;
  book: string | null;
  year: number;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  citations: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  publication_id: string | null;
  name: string;
  size_bytes: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value);
const emptyToNull = (value?: string) => (value && value.trim() ? value.trim() : null);

export const profileFromRow = (r: ProfileRow): Profile => ({
  id: r.id,
  name: r.full_name ?? '',
  email: r.email ?? '',
  affiliation: r.affiliation ?? '',
  position: r.position ?? '',
  department: r.department ?? '',
  photoUrl: orUndefined(r.avatar_url),
  bio: orUndefined(r.bio),
  researchInterests: r.research_interests ?? [],
  orcid: orUndefined(r.orcid),
  googleScholar: orUndefined(r.google_scholar),
  website: orUndefined(r.website),
});

export const profileToRow = (p: Partial<Omit<Profile, 'id'>>): Partial<ProfileRow> => {
  const row: Partial<ProfileRow> = {};
  if (p.name !== undefined) row.full_name = p.name.trim();
  if (p.email !== undefined) row.email = p.email.trim();
  if (p.affiliation !== undefined) row.affiliation = emptyToNull(p.affiliation);
  if (p.position !== undefined) row.position = emptyToNull(p.position);
  if (p.department !== undefined) row.department = emptyToNull(p.department);
  if (p.photoUrl !== undefined) row.avatar_url = emptyToNull(p.photoUrl);
  if (p.bio !== undefined) row.bio = emptyToNull(p.bio);
  if (p.researchInterests !== undefined) row.research_interests = p.researchInterests;
  if (p.orcid !== undefined) row.orcid = emptyToNull(p.orcid);
  if (p.googleScholar !== undefined) row.google_scholar = emptyToNull(p.googleScholar);
  if (p.website !== undefined) row.website = emptyToNull(p.website);
  return row;
};

export const publicationFromRow = (r: PublicationRow): Publication => ({
  id: r.id,
  title: r.title,
  authors: r.authors ?? [],
  type: r.type,
  journal: orUndefined(r.journal),
  conference: orUndefined(r.conference),
  book: orUndefined(r.book),
  year: r.year,
  doi: orUndefined(r.doi),
  url: orUndefined(r.url),
  abstract: orUndefined(r.abstract),
  citations: r.citations ?? 0,
  tags: r.tags ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const publicationToRow = (p: PublicationInput) => ({
  title: p.title.trim(),
  authors: p.authors.map(a => a.trim()).filter(Boolean),
  type: p.type,
  journal: emptyToNull(p.journal),
  conference: emptyToNull(p.conference),
  book: emptyToNull(p.book),
  year: p.year,
  doi: emptyToNull(p.doi),
  url: emptyToNull(p.url),
  abstract: emptyToNull(p.abstract),
  citations: p.citations ?? 0,
  tags: p.tags ?? [],
});

export const documentFromRow = (r: DocumentRow): DocumentRecord => ({
  id: r.id,
  name: r.name,
  size: r.size_bytes,
  mimeType: r.mime_type,
  publicationId: r.publication_id,
  storagePath: r.storage_path,
  createdAt: r.created_at,
});
