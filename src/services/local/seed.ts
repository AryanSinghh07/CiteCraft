import { sampleProfile, samplePublications } from '@/data/sampleData';
import type { Publication } from '@/types';
import { hashPassword, keys, readJson, writeJson } from './storage';

export interface StoredUser {
  id: string;
  email: string;
  salt: string;
  passwordHash: string;
}

export const DEMO_EMAIL = 'aryan@example.com';
export const DEMO_PASSWORD = 'aryan';
const DEMO_USER_ID = 'demo-user';

let seeding: Promise<void> | null = null;

/** Creates the demo account (with sample publications) the first time the app runs. */
export function ensureDemoSeed(): Promise<void> {
  seeding ??= (async () => {
    const users = readJson<StoredUser[]>(keys.users, []);
    if (users.some(u => u.email === DEMO_EMAIL)) return;

    const salt = crypto.randomUUID();
    users.push({
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      salt,
      passwordHash: await hashPassword(DEMO_PASSWORD, salt),
    });
    writeJson(keys.users, users);

    writeJson(keys.profile(DEMO_USER_ID), { ...sampleProfile, id: DEMO_USER_ID });

    const now = new Date().toISOString();
    const publications: Publication[] = samplePublications.map(p => ({
      ...p,
      title: p.title.trim(),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    writeJson(keys.publications(DEMO_USER_ID), publications);
  })();
  return seeding;
}
