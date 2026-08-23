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

/**
 * Cadastra um barbeiro com senha temporária gerada pelo servidor (H10) —
 * substitui o convite por email do H8. O `tempPassword` retornado só
 * aparece essa uma vez; a UI precisa mostrar/copiar na hora, porque não
 * tem como recuperar depois.
 */
export function createBarber(email: string, storeIds: string[]) {
  return invoke<{ userId: string; email: string; tempPassword: string }>('create_barber', { email, storeIds });
}

export function updateBarberAccess(userId: string, storeIds: string[]) {
  return invoke<{ ok: true }>('update_access', { userId, storeIds });
}

/**
 * Cadastra outro admin, mesmo fluxo de senha temporária do H10 (H25) —
 * sem seleção de loja: admin nunca é restringido por loja em nenhuma
 * tela nem policy.
 */
export function createAdmin(email: string) {
  return invoke<{ userId: string; email: string; tempPassword: string }>('create_admin', { email });
}

/** Apaga a conta do barbeiro (Supabase Auth) — a função no servidor recusa se for a própria conta de quem chamou. */
export function deleteBarber(userId: string) {
  return invoke<{ ok: true }>('delete_barber', { userId });
}

/**
 * Chamado pelo próprio barbeiro (não precisa ser admin) depois de trocar
 * a senha temporária — limpa a flag `must_change_password` da própria
 * linha em `profiles` (H10). Ver ação `complete_password_setup` na Edge
 * Function.
 */
export function completePasswordSetup() {
  return invoke<{ ok: true }>('complete_password_setup');
}
