import { supabase } from './supabase';
import { reportError } from './sentry';

// Wrapper pra Edge Function `admin-barbers` (H8). `supabase.functions.invoke`
// já anexa o JWT da sessão atual automaticamente — a função do lado do
// servidor é quem confirma que quem está chamando é admin antes de fazer
// qualquer coisa.

export interface Barber {
  userId: string;
  email?: string;
  role: 'admin' | 'barbeiro';
  storeIds: string[];
}

async function invoke<T>(action: string, payload: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  if (!supabase) return { data: null, error: 'Supabase não está configurado.' };

  const { data, error } = await supabase.functions.invoke('admin-barbers', {
    body: { action, ...payload },
  });

  if (error) {
    reportError(error, `adminApi.${action}`);
    return { data: null, error: error.message ?? 'Erro ao chamar a função de administração.' };
  }
  if (data?.error) {
    return { data: null, error: data.error as string };
  }
  return { data: data as T, error: null };
}

export function listBarbers() {
  return invoke<Barber[]>('list');
}

export function inviteBarber(email: string, storeIds: string[]) {
  return invoke<{ userId: string; email: string }>('invite', { email, storeIds });
}

export function updateBarberAccess(userId: string, storeIds: string[]) {
  return invoke<{ ok: true }>('update_access', { userId, storeIds });
}
