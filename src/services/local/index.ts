import type { Backend } from '../types';
import { localAuth } from './auth';
import { localDocuments } from './documents';
import { localProfiles } from './profiles';
import { localPublications } from './publications';
import { localTickets } from './tickets';
import { localAi } from './ai';

/** Demo-mode backend: everything is stored in this browser. */
export const localBackend: Backend = {
  auth: localAuth,
  profiles: localProfiles,
  publications: localPublications,
  documents: localDocuments,
  tickets: localTickets,
  ai: localAi,
};
