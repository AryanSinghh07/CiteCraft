/**
 * Browser storage used by demo mode.
 *  - localStorage: small JSON records (users, profiles, publications, document metadata)
 *  - IndexedDB:    uploaded file contents (too large for localStorage)
 */

const PREFIX = 'citecraft:';

export const keys = {
  users: `${PREFIX}users`,
  session: `${PREFIX}session`,
  profile: (userId: string) => `${PREFIX}profile:${userId}`,
  publications: (userId: string) => `${PREFIX}publications:${userId}`,
  documents: (userId: string) => `${PREFIX}documents:${userId}`,
  tickets: `${PREFIX}tickets`,
  ticketMessages: `${PREFIX}ticket-messages`,
  ticketAttachments: `${PREFIX}ticket-attachments`,
  ticketSeq: `${PREFIX}ticket-seq`,
  seedVersion: `${PREFIX}seed-version`,
  readingList: (userId: string) => `${PREFIX}reading-list:${userId}`,
};

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('localStorage write failed', error);
    throw new Error('Browser storage is full or unavailable. Free up space and try again.');
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** Small delay so loading states are visible and behave like a network call. */
export const simulateLatency = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------- IndexedDB

const DB_NAME = 'citecraft-files';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const fileStore = {
  put: (path: string, blob: Blob) => withStore<void>('readwrite', s => s.put(blob, path)),
  get: (path: string) => withStore<Blob | undefined>('readonly', s => s.get(path)),
  delete: (path: string) => withStore<void>('readwrite', s => s.delete(path)),
};
