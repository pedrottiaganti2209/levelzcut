import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchMyRole, type UserRole } from '../lib/profile';

/**
 * Papel do usuário logado (admin | barbeiro), derivado da tabela `profiles`.
 * Recebe a sessão de fora (já é rastreada em App.tsx) em vez de duplicar
 * esse controle aqui. `loading` fica true entre a sessão existir e o papel
 * ter sido resolvido — usado pra não piscar a aba de admin antes da hora.
 */
export function useUserRole(session: Session | null) {
  const [role, setRole] = useState<UserRole>('barbeiro');
  const [loading, setLoading] = useState(!!session);

  useEffect(() => {
    if (!session) {
      setRole('barbeiro');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMyRole(session.user.id).then((r) => {
      if (!cancelled) {
        setRole(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { role, isAdmin: role === 'admin', loading };
}
