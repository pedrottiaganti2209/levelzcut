import { supabase, isSupabaseConfigured } from './supabase';
import { reportError } from './sentry';
import type { Store } from '../types';
import { STORES as STORES_FALLBACK } from '../types';

// Lojas deixam de ser um array fixo no código (H6): quando o Supabase está
// configurado, lêem da tabela `stores` (migration 003_stores_roles_barber_access.sql).
// Sem Supabase configurado — ou se a tabela ainda não existir porque a
// migration não foi rodada — cai de volta pro array fixo em `types/index.ts`,
// então o app nunca quebra por causa disso.

type StoreRow = { id: string; name: string; display_name: string };

function rowToStore(row: StoreRow): Store {
  return { id: row.id, name: row.name, displayName: row.display_name };
}

export async function fetchStores(): Promise<Store[]> {
  if (!supabase) return STORES_FALLBACK;

  const { data, error } = await supabase.from('stores').select('*').order('name');
  if (error) {
    // Não trata como erro fatal: provavelmente a migration 003 ainda não
    // rodou nesse projeto. Reporta pro Sentry (sem dado sensível) e usa o
    // fallback, pra não travar ninguém.
    reportError(error, 'stores.fetchStores');
    return STORES_FALLBACK;
  }
  if (!data || data.length === 0) return STORES_FALLBACK;
  return (data as StoreRow[]).map(rowToStore);
}

type BarberStoreRow = { stores: StoreRow | null };

/**
 * Lojas que ESTE usuário (barbeiro) tem acesso liberado, via `barber_stores`
 * (migration 003) — usado pro seletor de loja do topo depois do H9, quando
 * a RLS de `cuts_data` (migration 004) passa a restringir por loja de
 * verdade. Não usar pro painel de administração: lá o admin precisa ver
 * TODAS as lojas (use `fetchStores()`), não só as próprias.
 *
 * Diferente de `fetchStores()`, um resultado vazio aqui é um estado válido
 * (barbeiro convidado mas ainda sem nenhuma loja liberada) — só cai no
 * fallback fixo em caso de erro de verdade (ex.: migration 003/004 ainda
 * não rodou nesse projeto), nunca por causa de lista vazia.
 */
export async function fetchAccessibleStores(userId: string): Promise<Store[]> {
  if (!supabase) return STORES_FALLBACK;

  const { data, error } = await supabase
    .from('barber_stores')
    .select('stores (id, name, display_name)')
    .eq('user_id', userId);

  if (error) {
    reportError(error, 'stores.fetchAccessibleStores');
    return STORES_FALLBACK;
  }

  const rows = (data ?? []) as unknown as BarberStoreRow[];
  return rows
    .map((row) => row.stores)
    .filter((s): s is StoreRow => s !== null)
    .map(rowToStore)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStore(store: Store): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase não está configurado.') };
  const { error } = await supabase.from('stores').insert({
    id: store.id,
    name: store.name,
    display_name: store.displayName,
  });
  if (error) reportError(error, 'stores.createStore');
  return { error: error ? new Error(error.message) : null };
}

export async function updateStore(
  id: string,
  updates: Partial<Pick<Store, 'name' | 'displayName'>>
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase não está configurado.') };
  const payload: Record<string, string> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.displayName !== undefined) payload.display_name = updates.displayName;

  const { error } = await supabase.from('stores').update(payload).eq('id', id);
  if (error) reportError(error, 'stores.updateStore');
  return { error: error ? new Error(error.message) : null };
}

/** Gera um id de loja (slug) a partir do nome — usado como sugestão no formulário, sempre editável. */
const DIACRITIC_MARKS = /[̀-ͯ]/g;

export function slugifyStoreId(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITIC_MARKS, '') // remove marcas de acento (após normalize('NFD'))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export { isSupabaseConfigured };
