import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const getSupabaseUrl = () => import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const getSupabaseAnonKey = () => import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

let supabaseClient: SupabaseClient | null = null;

export const isSupabaseConfigured = () => Boolean(getSupabaseUrl() && getSupabaseAnonKey());

export const getSupabaseConfig = () => ({
  url: getSupabaseUrl(),
  anonKey: getSupabaseAnonKey(),
});

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured for this app.');
  }

  if (!supabaseClient) {
    const { url, anonKey } = getSupabaseConfig();

    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return supabaseClient;
};
