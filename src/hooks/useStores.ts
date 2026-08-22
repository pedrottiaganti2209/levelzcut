import { useCallback, useEffect, useState } from 'react';
import type { Store } from '../types';
import { STORES as STORES_FALLBACK } from '../types';
import { fetchStores } from '../lib/stores';

/**
 * Lista de lojas — da tabela `stores` quando o Supabase está configurado e
 * a migration 003 já rodou, com fallback pro array fixo de `types/index.ts`
 * em qualquer outro caso (ver fetchStores em lib/stores.ts).
 */
export function useStores() {
  const [stores, setStores] = useState<Store[]>(STORES_FALLBACK);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await fetchStores();
    setStores(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stores, loading, reload };
}
