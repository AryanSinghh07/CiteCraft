import type { Backend } from '../types';
import { supabaseAuth } from './auth';
import { supabaseDocuments } from './documents';
import { supabaseProfiles } from './profiles';
import { supabasePublications } from './publications';
import { supabaseTickets } from './tickets';
import { supabaseAi } from './ai';
import { supabaseReadingList } from './readingList';
import { supabaseStudent } from './student';
import { supabaseSecurity } from './security';

/** Cloud backend: Supabase Auth + Postgres + Storage. */
export const supabaseBackend: Backend = {
  auth: supabaseAuth,
  profiles: supabaseProfiles,
  publications: supabasePublications,
  documents: supabaseDocuments,
  tickets: supabaseTickets,
  ai: supabaseAi,
  readingList: supabaseReadingList,
  student: supabaseStudent,
  security: supabaseSecurity,
};
