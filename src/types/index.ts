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
  role?: UserRole;
  accountType?: AccountType;
  /** students: degree programme, e.g. "B.Tech Computer Science" */
  program?: string;
  /** students: e.g. "3rd year" */
  yearOfStudy?: string;
  /** students: supervisor or advisor */
  supervisor?: string;
  /** students: 10-point or 4-point grading for CGPA */
  gradeScale?: 4 | 10;
  /** show a shareable page at /u/<publicSlug> */
  isPublic?: boolean;
  publicSlug?: string;
}

/** What visitors see on a public profile page (no email or role). */
export interface PublicProfileData {
  profile: Omit<Profile, 'id' | 'email' | 'role' | 'isPublic'>;
  publications: Publication[];
}

/** @deprecated use Profile */
export type User = Profile;

export type AccountType = 'researcher' | 'student';

export type PublicationType =
  | 'journal'
  | 'conference'
  | 'book'
  | 'chapter'
  | 'thesis'
  | 'report'
  | 'preprint'
  | 'project'
  | 'poster'
  | 'other';

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  journal?: string;
  conference?: string;
  book?: string;
  /** institution, repository, event or course for the other work types */
  venue?: string;
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

// ------------------------------------------------------------------ support tickets

export type UserRole = 'user' | 'admin';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketCategory = 'bug' | 'account' | 'publication' | 'feature' | 'other';

export interface Ticket {
  id: string;
  ticketNumber: number;
  userId: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface TicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

/** Fields support staff can change; requesters may only set status (close/reopen) and rating. */
export type TicketUpdate = Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'assignedTo' | 'rating'>>;

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  messageId: string | null;
  name: string;
  size: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
}

// ------------------------------------------------------------------ AI features

export type SummaryLength = 'brief' | 'standard' | 'detailed';
export type SummaryFocus = 'general' | 'key_findings' | 'methods' | 'literature' | 'action_items' | 'simple' | 'slides';

export interface SummaryOptions {
  length: SummaryLength;
  focus: SummaryFocus;
  language: string;
}

/** What the browser sends to the summarizer after reading the file. */
export type SummarySource =
  | { kind: 'pdf'; data: string; mediaType: 'application/pdf' }
  | { kind: 'image'; data: string; mediaType: string }
  | { kind: 'text'; text: string };

export interface SummaryRecord {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  length: SummaryLength;
  focus: SummaryFocus;
  summary: string;
  createdAt: string;
}

// ------------------------------------------------------------------ reading list

export type ReadingStatus = 'to_read' | 'reading' | 'done';

export interface ReadingItem {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
  status: ReadingStatus;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ReadingItemInput = Omit<ReadingItem, 'id' | 'createdAt' | 'updatedAt'>;

// ------------------------------------------------------------------ college tools

export type CourseColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'orange' | 'slate';

export interface Course {
  id: string;
  name: string;
  code?: string;
  teacher?: string;
  credits: number;
  color: CourseColor;
  attended: number;
  total: number;
  /** minimum attendance % required, e.g. 75 */
  requiredPct: number;
  createdAt: string;
}

export type ClassKind = 'lecture' | 'lab' | 'tutorial' | 'other';

export interface ClassSession {
  id: string;
  courseId: string;
  /** 1 = Monday … 7 = Sunday */
  day: number;
  /** "HH:MM" (24h) */
  start: string;
  end: string;
  room?: string;
  kind: ClassKind;
}

export type TaskKind = 'assignment' | 'exam' | 'quiz' | 'project' | 'lab' | 'presentation' | 'other';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface StudentTask {
  id: string;
  courseId?: string | null;
  title: string;
  kind: TaskKind;
  /** ISO date-time */
  dueAt: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  notes?: string;
  createdAt: string;
}

export interface GradeEntry {
  id: string;
  semester: number;
  courseName: string;
  credits: number;
  gradePoint: number;
  letter?: string;
}

/** Fields the user supplies when creating each record. */
export type CourseInput = Omit<Course, 'id' | 'createdAt'>;
export type ClassSessionInput = Omit<ClassSession, 'id'>;
export type StudentTaskInput = Omit<StudentTask, 'id' | 'createdAt'>;
export type GradeEntryInput = Omit<GradeEntry, 'id'>;
