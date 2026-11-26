import type { Backend } from '../types';
import { supabaseAuth } from './auth';
import { supabaseDocuments } from './documents';
import { supabaseProfiles } from './profiles';
import { supabasePublications } from './publications';
import { supabaseTickets } from './tickets';
import { supabaseAi } from './ai';

/** Cloud backend: Supabase Auth + Postgres + Storage. */
export const supabaseBackend: Backend = {
  auth: supabaseAuth,
  profiles: supabaseProfiles,
  publications: supabasePublications,
  documents: supabaseDocuments,
  tickets: supabaseTickets,
  ai: supabaseAi,
};
