import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Store } from '../types';
import { STORES as STORES_FALLBACK } from '../types';
import { fetchStores, fetchAccessibleStores } from '../lib/stores';
import { isAuthRequired } from '../lib/supabase';

/**
 * Lojas que o usuário ATUAL pode ver/selecionar no topo do app (H9).
 *
 * - Flag de login desligada: todas as lojas, igual sempre foi — H9 não
 *   muda nada da experiência de quem já usa o painel hoje.
 * - Flag ligada e usuário é admin: também todas as lojas — admin não fica
 *   restrito por `barber_stores` (isso é só pro painel de Administração,
 *   ver `useStores`, que continua sendo usado lá).
 * - Flag ligada e usuário é barbeiro: só as lojas vinculadas a ele. Pode
 *   vir vazio, se ainda não tiver sido liberado pra nenhuma — ver o
 *   tratamento desse estado em App.tsx.
 */
export function useAccessibleStores(session: Session | null, isAdmin: boolean) {
  const [stores, setStores] = useState<Store[]>(STORES_FALLBACK);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let result: Store[];
    if (!isAuthRequired || isAdmin) {
      result = await fetchStores();
    } else if (session) {
      result = await fetchAccessibleStores(session.user.id);
    } else {
      result = [];
    }
    setStores(result);
    setLoading(false);
  }, [session, isAdmin]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stores, loading, reload };
}
