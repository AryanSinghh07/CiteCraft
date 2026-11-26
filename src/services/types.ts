import type { AuthUser, DocumentRecord, Profile, Publication, PublicationInput } from '@/types';

/**
 * Contracts every backend implements. The app only talks to these interfaces,
 * so the storage behind them (Supabase or the in-browser demo store) can change
 * without touching any UI code.
 */

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
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
}

export interface PublicationService {
  list(userId: string): Promise<Publication[]>;
  create(userId: string, input: PublicationInput): Promise<Publication>;
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

export interface Backend {
  auth: AuthService;
  profiles: ProfileService;
  publications: PublicationService;
  documents: DocumentService;
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
