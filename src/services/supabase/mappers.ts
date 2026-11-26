import type {
  DocumentRecord,
  Profile,
  Publication,
  PublicationInput,
  ReadingItem,
  ReadingItemInput,
  Ticket,
  TicketAttachment,
  TicketMessage,
  UserRole,
} from '@/types';

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
  role?: UserRole;
  is_public?: boolean;
  public_slug?: string | null;
  account_type?: 'researcher' | 'student';
  program?: string | null;
  year_of_study?: string | null;
  supervisor?: string | null;
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
  venue?: string | null;
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
  role: r.role ?? 'user',
  isPublic: r.is_public ?? false,
  publicSlug: orUndefined(r.public_slug ?? null),
  accountType: r.account_type ?? 'researcher',
  program: orUndefined(r.program ?? null),
  yearOfStudy: orUndefined(r.year_of_study ?? null),
  supervisor: orUndefined(r.supervisor ?? null),
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
  if (p.isPublic !== undefined) row.is_public = p.isPublic;
  if (p.accountType !== undefined) row.account_type = p.accountType;
  if (p.program !== undefined) row.program = emptyToNull(p.program);
  if (p.yearOfStudy !== undefined) row.year_of_study = emptyToNull(p.yearOfStudy);
  if (p.supervisor !== undefined) row.supervisor = emptyToNull(p.supervisor);
  if (p.publicSlug !== undefined) row.public_slug = emptyToNull(p.publicSlug)?.toLowerCase() ?? null;
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
  venue: orUndefined(r.venue ?? null),
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
  venue: emptyToNull(p.venue),
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

// ------------------------------------------------------------------ tickets

export interface TicketRow {
  id: string;
  ticket_number: number;
  user_id: string;
  requester_name: string;
  requester_email: string;
  subject: string;
  description: string;
  category: Ticket['category'];
  priority: Ticket['priority'];
  status: Ticket['status'];
  assigned_to: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketMessageRow {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketAttachmentRow {
  id: string;
  ticket_id: string;
  message_id: string | null;
  name: string;
  size_bytes: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export const ticketFromRow = (r: TicketRow): Ticket => ({
  id: r.id,
  ticketNumber: r.ticket_number,
  userId: r.user_id,
  requesterName: r.requester_name,
  requesterEmail: r.requester_email,
  subject: r.subject,
  description: r.description,
  category: r.category,
  priority: r.priority,
  status: r.status,
  assignedTo: r.assigned_to,
  rating: r.rating,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  resolvedAt: r.resolved_at,
  closedAt: r.closed_at,
});

export const ticketMessageFromRow = (r: TicketMessageRow): TicketMessage => ({
  id: r.id,
  ticketId: r.ticket_id,
  authorId: r.author_id,
  authorName: r.author_name,
  authorRole: r.author_role,
  body: r.body,
  isInternal: r.is_internal,
  createdAt: r.created_at,
});

export const ticketAttachmentFromRow = (r: TicketAttachmentRow): TicketAttachment => ({
  id: r.id,
  ticketId: r.ticket_id,
  messageId: r.message_id,
  name: r.name,
  size: r.size_bytes,
  mimeType: r.mime_type,
  storagePath: r.storage_path,
  createdAt: r.created_at,
});

// ------------------------------------------------------------------ reading list

export interface ReadingRow {
  id: string;
  user_id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  url: string | null;
  status: ReadingItem['status'];
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const readingFromRow = (r: ReadingRow): ReadingItem => ({
  id: r.id,
  title: r.title,
  authors: r.authors ?? [],
  year: orUndefined(r.year),
  venue: orUndefined(r.venue),
  doi: orUndefined(r.doi),
  url: orUndefined(r.url),
  status: r.status,
  notes: orUndefined(r.notes),
  tags: r.tags ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const readingToRow = (p: Partial<ReadingItemInput>) => {
  const row: Record<string, unknown> = {};
  if (p.title !== undefined) row.title = p.title.trim();
  if (p.authors !== undefined) row.authors = p.authors.map(a => a.trim()).filter(Boolean);
  if (p.year !== undefined) row.year = p.year ?? null;
  if (p.venue !== undefined) row.venue = emptyToNull(p.venue);
  if (p.doi !== undefined) row.doi = emptyToNull(p.doi);
  if (p.url !== undefined) row.url = emptyToNull(p.url);
  if (p.status !== undefined) row.status = p.status;
  if (p.notes !== undefined) row.notes = emptyToNull(p.notes);
  if (p.tags !== undefined) row.tags = p.tags;
  return row;
};
