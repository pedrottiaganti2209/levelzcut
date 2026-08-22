import { supabase } from './supabase';
import { reportError } from './sentry';

export type UserRole = 'admin' | 'barbeiro';

/**
 * Papel do usuário logado. Retorna 'barbeiro' (o menos privilegiado) sempre
 * que não der pra determinar com certeza — sem sessão, sem Supabase, erro
 * de rede, ou usuário sem linha em `profiles` ainda. Nunca assume admin por
 * omissão.
 */
export async function fetchMyRole(userId: string | undefined): Promise<UserRole> {
  if (!supabase || !userId) return 'barbeiro';

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // Não é necessariamente um erro grave — pode ser só a migration 003
    // ainda não ter rodado nesse projeto (tabela profiles não existe).
    reportError(error, 'profile.fetchMyRole');
    return 'barbeiro';
  }
  if (!data) return 'barbeiro';
  return data.role === 'admin' ? 'admin' : 'barbeiro';
}
