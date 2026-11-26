/**
 * Runtime configuration read from Vite env variables (see .env.example).
 *
 * When the Supabase variables are missing the app runs in "demo mode":
 * accounts and data are stored in this browser only.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const env = {
  supabaseUrl: supabaseUrl?.trim() || '',
  supabaseAnonKey: supabaseAnonKey?.trim() || '',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export type BackendMode = 'supabase' | 'demo';
export const backendMode: BackendMode = isSupabaseConfigured ? 'supabase' : 'demo';
