import type { AuthUser } from '@/types';
import type { AuthService } from '../types';
import { ensureDemoSeed, type StoredUser } from './seed';
import {
  fileStore,
  hashPassword,
  keys,
  newId,
  readJson,
  removeKey,
  simulateLatency,
  writeJson,
} from './storage';

type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();

const toAuthUser = (u: StoredUser): AuthUser => ({ id: u.id, email: u.email });
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function currentUser(): AuthUser | null {
  const sessionId = readJson<string | null>(keys.session, null);
  if (!sessionId) return null;
  const user = readJson<StoredUser[]>(keys.users, []).find(u => u.id === sessionId);
  return user ? toAuthUser(user) : null;
}

function emit(user: AuthUser | null) {
  listeners.forEach(listener => listener(user));
}

export const localAuth: AuthService = {
  async getCurrentUser() {
    await ensureDemoSeed();
    return currentUser();
  },

  async signIn(email, password) {
    await ensureDemoSeed();
    await simulateLatency(500);
    const user = readJson<StoredUser[]>(keys.users, []).find(
      u => u.email === normalizeEmail(email),
    );
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }
    writeJson(keys.session, user.id);
    const authUser = toAuthUser(user);
    emit(authUser);
    return authUser;
  },

  async signUp({ name, email, password, accountType }) {
    await ensureDemoSeed();
    await simulateLatency(500);
    const normalized = normalizeEmail(email);
    const users = readJson<StoredUser[]>(keys.users, []);
    if (users.some(u => u.email === normalized)) {
      throw new Error('An account with this email already exists.');
    }

    const salt = newId();
    const user: StoredUser = {
      id: newId(),
      email: normalized,
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    writeJson(keys.users, [...users, user]);
    writeJson(keys.profile(user.id), {
      id: user.id,
      name: name.trim(),
      email: normalized,
      affiliation: '',
      position: '',
      department: '',
      accountType,
    });
    writeJson(keys.publications(user.id), []);
    writeJson(keys.session, user.id);
    emit(toAuthUser(user));
    return { signedIn: true };
  },

  async signOut() {
    removeKey(keys.session);
    emit(null);
  },

  async sendPasswordReset() {
    throw new Error(
      'Password reset emails are not available in demo mode. The demo account password is "aryan".',
    );
  },

  async updatePassword(newPassword) {
    const session = currentUser();
    if (!session) throw new Error('You need to be signed in to change your password.');
    const users = readJson<StoredUser[]>(keys.users, []);
    const salt = newId();
    const passwordHash = await hashPassword(newPassword, salt);
    writeJson(
      keys.users,
      users.map(u => (u.id === session.id ? { ...u, salt, passwordHash } : u)),
    );
  },

  async deleteAccount() {
    const session = currentUser();
    if (!session) throw new Error('Please sign in again.');
    const id = session.id;
    // Files kept in IndexedDB for this user's documents.
    const docs = readJson<{ storagePath: string }[]>(keys.documents(id), []);
    await Promise.allSettled(docs.map(d => fileStore.delete(d.storagePath)));
    // Everything stored under this user's id.
    const prefixes = ['profile', 'publications', 'documents', 'reading-list', 'courses', 'class-sessions', 'tasks', 'grades', 'summaries', 'security'];
    prefixes.forEach(p => removeKey(`citecraft:${p}:${id}`));
    try {
      sessionStorage.removeItem(`citecraft:assistant:v2:${id}`);
    } catch {
      /* ignore */
    }
    // Their tickets and messages.
    const tickets = readJson<{ id: string; userId: string }[]>(keys.tickets, []);
    const mine = new Set(tickets.filter(t => t.userId === id).map(t => t.id));
    writeJson(keys.tickets, tickets.filter(t => !mine.has(t.id)));
    writeJson(
      keys.ticketMessages,
      readJson<{ ticketId: string; authorId: string }[]>(keys.ticketMessages, []).filter(m => !mine.has(m.ticketId) && m.authorId !== id),
    );
    writeJson(keys.ticketAttachments, readJson<{ ticketId: string }[]>(keys.ticketAttachments, []).filter(a => !mine.has(a.ticketId)));
    // Finally the account itself.
    writeJson(keys.users, readJson<StoredUser[]>(keys.users, []).filter(u => u.id !== id));
    removeKey(keys.session);
    emit(null);
  },

  onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};
