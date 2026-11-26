import type { AuthUser } from '@/types';
import type { AuthService } from '../types';
import { ensureDemoSeed, type StoredUser } from './seed';
import {
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

  onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};
