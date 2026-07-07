import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase is not configured. Copy app/.env.example to app/.env.local and fill in ' +
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from your Supabase project settings.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');

/**
 * Users pick a username, not an email — Supabase Auth needs an email, so we map one
 * deterministically. The domain must use a real public-suffix TLD; Supabase's validator
 * rejects synthetic TLDs like `.local`.
 */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@tripexpense.app`;
}
