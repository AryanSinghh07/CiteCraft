import type {
  AccountType,
  ClassSession,
  ClassSessionInput,
  Course,
  CourseInput,
  GradeEntry,
  GradeEntryInput,
  StudentTask,
  StudentTaskInput,
  AuthUser,
  DocumentRecord,
  Profile,
  Publication,
  PublicationInput,
  PublicProfileData,
  ReadingItem,
  ReadingItemInput,
  StaffMember,
  SummaryOptions,
  SummaryRecord,
  SummarySource,
  Ticket,
  TicketAttachment,
  TicketInput,
  TicketMessage,
  TicketUpdate,
} from '@/types';

/**
 * Contracts every backend implements. The app only talks to these interfaces,
 * so the storage behind them (Supabase or the in-browser demo store) can change
 * without touching any UI code.
 */

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
}

export interface SignUpResult {
  /** false when the account must confirm its email before signing in */
  signedIn: boolean;
}

export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(params: SignUpParams): Promise<SignUpResult>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  /** Returns an unsubscribe function. */
  onAuthChange(callback: (user: AuthUser | null) => void): () => void;
}

export interface ProfileService {
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: Partial<Omit<Profile, 'id'>>): Promise<Profile>;
  uploadAvatar(userId: string, file: File): Promise<string>;
  /** Anyone can call this; returns null unless the profile is public. */
  getPublicProfile(slug: string): Promise<PublicProfileData | null>;
}

/** 3–40 chars of lowercase letters, numbers and single hyphens (matches the database check). */
export const PUBLIC_SLUG_PATTERN = /^(?=.{3,40}$)[a-z0-9]+(-[a-z0-9]+)*$/;

export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

export interface PublicationService {
  list(userId: string): Promise<Publication[]>;
  create(userId: string, input: PublicationInput): Promise<Publication>;
  /** Bulk insert (imports). Callers should remove duplicate DOIs first. */
  createMany(userId: string, inputs: PublicationInput[]): Promise<Publication[]>;
  update(userId: string, publication: Publication): Promise<Publication>;
  remove(userId: string, id: string): Promise<void>;
}

export interface DocumentService {
  list(userId: string): Promise<DocumentRecord[]>;
  upload(userId: string, file: File, publicationId?: string | null): Promise<DocumentRecord>;
  remove(userId: string, doc: DocumentRecord): Promise<void>;
  /** A URL the browser can open or download. */
  getFileUrl(userId: string, doc: DocumentRecord): Promise<string>;
}

/**
 * Support tickets. Permission rules (requester vs admin) are enforced by the
 * backend itself — the database in Supabase mode, the service in demo mode.
 */
export interface TicketService {
  /** Tickets raised by this user. */
  listMine(userId: string): Promise<Ticket[]>;
  /** Every ticket (admins only). */
  listAll(): Promise<Ticket[]>;
  get(ticketId: string): Promise<Ticket | null>;
  create(userId: string, input: TicketInput, files?: File[]): Promise<Ticket>;
  update(ticketId: string, patch: TicketUpdate): Promise<Ticket>;
  /** Internal notes are only returned to admins. */
  listMessages(ticketId: string): Promise<TicketMessage[]>;
  addMessage(
    ticketId: string,
    message: { body: string; isInternal?: boolean; files?: File[] },
  ): Promise<TicketMessage>;
  listAttachments(ticketId: string): Promise<TicketAttachment[]>;
  getAttachmentUrl(attachment: TicketAttachment): Promise<string>;
  /** Admins that tickets can be assigned to (admins only). */
  listStaff(): Promise<StaffMember[]>;
}

export interface ReadingListService {
  list(userId: string): Promise<ReadingItem[]>;
  add(userId: string, input: ReadingItemInput): Promise<ReadingItem>;
  update(userId: string, id: string, patch: Partial<ReadingItemInput>): Promise<ReadingItem>;
  remove(userId: string, id: string): Promise<void>;
}

/** CRUD for a per-user collection of records. */
export interface CollectionService<T, I> {
  list(userId: string): Promise<T[]>;
  create(userId: string, input: I): Promise<T>;
  update(userId: string, id: string, patch: Partial<I>): Promise<T>;
  remove(userId: string, id: string): Promise<void>;
}

/** Daily college tools: courses + attendance, timetable, tasks and grades. */
export interface StudentService {
  courses: CollectionService<Course, CourseInput>;
  sessions: CollectionService<ClassSession, ClassSessionInput>;
  tasks: CollectionService<StudentTask, StudentTaskInput>;
  grades: CollectionService<GradeEntry, GradeEntryInput>;
}

export interface SecurityStatus {
  emailVerified: boolean;
  lastSignInAt?: string;
  /** strength score (0–4) of the password set through CiteCraft, if known */
  passwordScore?: number;
  passwordChangedAt?: string;
  /** authenticator-app (TOTP) factors */
  factors: { id: string; name: string; createdAt: string; verified: boolean }[];
}

/** Account security: two-factor authentication, passwords and sessions. */
export interface SecurityService {
  available: { mfa: boolean; otherDevices: boolean };
  getStatus(): Promise<SecurityStatus>;
  /** Starts authenticator-app set-up; show the QR code, then call verifyTotp. */
  enrollTotp(): Promise<{ factorId: string; qrCode: string; secret: string }>;
  verifyTotp(factorId: string, code: string): Promise<void>;
  removeFactor(factorId: string): Promise<void>;
  /** After password sign-in: does this session still need a 2FA code? */
  mfaRequirement(): Promise<{ required: boolean; factorId?: string }>;
  changePassword(newPassword: string, score: number): Promise<void>;
  recordPasswordStrength(score: number): Promise<void>;
  signOutOtherDevices(): Promise<void>;
}

export interface SummarizeRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  source: SummarySource;
  options: SummaryOptions;
}

/** AI document summarizer (runs on the server; not available in demo mode). */
export interface AiService {
  /** false when AI needs a backend that isn't configured */
  available: boolean;
  /** Streams the summary text through onText; resolves with the saved summary id. */
  summarize(request: SummarizeRequest, onText: (chunk: string) => void, signal?: AbortSignal): Promise<{ id: string | null; truncated: boolean }>;
  listSummaries(userId: string): Promise<SummaryRecord[]>;
  deleteSummary(userId: string, id: string): Promise<void>;
}

export interface Backend {
  auth: AuthService;
  profiles: ProfileService;
  publications: PublicationService;
  documents: DocumentService;
  tickets: TicketService;
  ai: AiService;
  readingList: ReadingListService;
  student: StudentService;
  security: SecurityService;
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_TICKET_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_TICKET_FILES = 3;
export const TICKET_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
