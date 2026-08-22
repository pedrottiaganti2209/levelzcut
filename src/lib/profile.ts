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

/**
 * Indica se este usuário precisa trocar a senha antes de usar o app (H10)
 * — true só pra quem foi cadastrado via o painel de Administração com
 * senha temporária e ainda não trocou (ver migration 005). `false` é o
 * padrão seguro em qualquer situação incerta (sem Supabase, sem userId,
 * erro de leitura, sem linha em `profiles`): nunca bloqueia alguém do
 * dashboard por causa de uma falha de leitura, só quando a flag está
 * explicitamente ligada no banco.
 */
export async function fetchMustChangePassword(userId: string | undefined): Promise<boolean> {
  if (!supabase || !userId) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    reportError(error, 'profile.fetchMustChangePassword');
    return false;
  }
  return data?.must_change_password === true;
}
