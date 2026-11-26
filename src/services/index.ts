import { backendMode } from '@/config/env';
import { localBackend } from './local';
import { supabaseBackend } from './supabase';
import type { Backend } from './types';

/**
 * The single entry point the UI uses for data.
 * Supabase when configured, otherwise the in-browser demo store.
 */
export const backend: Backend = backendMode === 'supabase' ? supabaseBackend : localBackend;

export const {
  auth: authService,
  profiles: profileService,
  publications: publicationService,
  documents: documentService,
  tickets: ticketService,
  ai: aiService,
} = backend;

export { backendMode };
export * from './types';
