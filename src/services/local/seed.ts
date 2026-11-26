import { sampleProfile, samplePublications } from '@/data/sampleData';
import type { Profile, Publication, Ticket, TicketMessage } from '@/types';
import { hashPassword, keys, readJson, writeJson } from './storage';

export interface StoredUser {
  id: string;
  email: string;
  salt: string;
  passwordHash: string;
}

/** Demo admin: owns the sample publications and can manage every ticket. */
export const DEMO_EMAIL = 'aryan@example.com';
export const DEMO_PASSWORD = 'aryan';
/** Demo researcher: a regular user with a couple of support tickets. */
export const DEMO_USER_EMAIL = 'priya@example.com';
export const DEMO_USER_PASSWORD = 'priya123';

const DEMO_ADMIN_ID = 'demo-user';
const DEMO_RESEARCHER_ID = 'demo-researcher';
const SEED_VERSION = 2;

async function addUser(users: StoredUser[], id: string, email: string, password: string) {
  if (users.some(u => u.email === email)) return;
  const salt = crypto.randomUUID();
  users.push({ id, email, salt, passwordHash: await hashPassword(password, salt) });
}

/** v1: demo account with sample publications. */
async function seedV1(users: StoredUser[]) {
  if (users.some(u => u.email === DEMO_EMAIL)) return;
  await addUser(users, DEMO_ADMIN_ID, DEMO_EMAIL, DEMO_PASSWORD);
  writeJson(keys.profile(DEMO_ADMIN_ID), { ...sampleProfile, id: DEMO_ADMIN_ID });

  const now = new Date().toISOString();
  const publications: Publication[] = samplePublications.map(p => ({
    ...p,
    title: p.title.trim(),
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }));
  writeJson(keys.publications(DEMO_ADMIN_ID), publications);
}

/** v2: make the demo account an admin and add a researcher with sample tickets. */
async function seedV2(users: StoredUser[]) {
  const admin = users.find(u => u.email === DEMO_EMAIL);
  if (admin) {
    const profile = readJson<Profile | null>(keys.profile(admin.id), null);
    if (profile) writeJson(keys.profile(admin.id), { ...profile, role: 'admin' });
  }

  if (users.some(u => u.email === DEMO_USER_EMAIL)) return;
  await addUser(users, DEMO_RESEARCHER_ID, DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
  writeJson(keys.profile(DEMO_RESEARCHER_ID), {
    id: DEMO_RESEARCHER_ID,
    name: 'Priya Sharma',
    email: DEMO_USER_EMAIL,
    affiliation: 'National Institute of Technology',
    position: 'PhD Scholar',
    department: 'Electrical Engineering',
    role: 'user',
  } satisfies Profile);
  writeJson(keys.publications(DEMO_RESEARCHER_ID), []);

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const base = {
    userId: DEMO_RESEARCHER_ID,
    requesterName: 'Priya Sharma',
    requesterEmail: DEMO_USER_EMAIL,
    assignedTo: null,
    rating: null,
    resolvedAt: null,
    closedAt: null,
  };
  const tickets: Ticket[] = [
    {
      ...base,
      id: crypto.randomUUID(),
      ticketNumber: 1001,
      subject: 'Citation count not updating after edit',
      description:
        'I changed the citation count on one of my journal papers but the dashboard total still shows the old number until I refresh.',
      category: 'bug',
      priority: 'medium',
      status: 'in_progress',
      assignedTo: admin?.id ?? null,
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(5),
    },
    {
      ...base,
      id: crypto.randomUUID(),
      ticketNumber: 1002,
      subject: 'Request: import publications from ORCID',
      description: 'It would save a lot of time if I could pull my publication list directly from my ORCID profile.',
      category: 'feature',
      priority: 'low',
      status: 'open',
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(3),
    },
  ];
  const messages: TicketMessage[] = [
    {
      id: crypto.randomUUID(),
      ticketId: tickets[0].id,
      authorId: admin?.id ?? DEMO_ADMIN_ID,
      authorName: 'Aryan Singh',
      authorRole: 'admin',
      body: 'Thanks for reporting this, Priya. I can reproduce it and I am looking into a fix now.',
      isInternal: false,
      createdAt: hoursAgo(6),
    },
    {
      id: crypto.randomUUID(),
      ticketId: tickets[0].id,
      authorId: admin?.id ?? DEMO_ADMIN_ID,
      authorName: 'Aryan Singh',
      authorRole: 'admin',
      body: 'Internal: stats cards read stale query data. Fix planned for the next release.',
      isInternal: true,
      createdAt: hoursAgo(5),
    },
  ];
  writeJson(keys.tickets, [...tickets, ...readJson<Ticket[]>(keys.tickets, [])]);
  writeJson(keys.ticketMessages, [...readJson<TicketMessage[]>(keys.ticketMessages, []), ...messages]);
  writeJson(keys.ticketSeq, Math.max(readJson<number>(keys.ticketSeq, 1001), 1003));
}

let seeding: Promise<void> | null = null;

/** Creates / upgrades the demo data the first time each seed version runs in this browser. */
export function ensureDemoSeed(): Promise<void> {
  seeding ??= (async () => {
    const version = readJson<number>(keys.seedVersion, 0);
    if (version >= SEED_VERSION) return;

    const users = readJson<StoredUser[]>(keys.users, []);
    await seedV1(users);
    await seedV2(users);
    writeJson(keys.users, users);
    writeJson(keys.seedVersion, SEED_VERSION);
  })();
  return seeding;
}
