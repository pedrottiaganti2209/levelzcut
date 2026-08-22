import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Login only ever gates the dashboard when BOTH Supabase is configured AND
// the flag is explicitly turned on. Default (flag unset) reproduces the
// pre-auth behavior exactly — this is what H1 got wrong by coupling the
// login gate to isSupabaseConfigured alone, which flipped on for every
// existing user the moment Supabase env vars were present in production.
export function computeIsAuthRequired(supabaseConfigured: boolean, flagValue: string | undefined): boolean {
  return supabaseConfigured && flagValue === 'true';
}

export const isAuthRequired = computeIsAuthRequired(isSupabaseConfigured, import.meta.env.VITE_REQUIRE_AUTH);

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase não está configurado.');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase não está configurado.');
  return supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
