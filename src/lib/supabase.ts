import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/config/env';

/** Supabase client, or null when running in demo mode. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

/** Storage buckets (created by the SQL files in supabase/migrations). */
export const BUCKETS = {
  avatars: 'avatars',
  documents: 'documents',
  ticketAttachments: 'ticket-attachments',
} as const;
