import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchMyRole, fetchMustChangePassword, type UserRole } from '../lib/profile';

/**
 * Papel do usuário logado (admin | barbeiro) e se precisa trocar a senha
 * temporária (H10), derivados da tabela `profiles`. Recebe a sessão de
 * fora (já é rastreada em App.tsx) em vez de duplicar esse controle aqui.
 * `loading` fica true entre a sessão existir e essas informações terem
 * sido resolvidas — App.tsx usa isso pra não deixar o dashboard piscar
 * antes de saber se precisa mostrar a tela de trocar senha.
 */
export function useUserRole(session: Session | null) {
  const [role, setRole] = useState<UserRole>('barbeiro');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(!!session);

  useEffect(() => {
    if (!session) {
      setRole('barbeiro');
      setMustChangePassword(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMyRole(session.user.id), fetchMustChangePassword(session.user.id)]).then(([r, mcp]) => {
      if (!cancelled) {
        setRole(r);
        setMustChangePassword(mcp);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Chamado depois que a senha já foi trocada com sucesso no servidor —
  // evita ter que buscar tudo de novo só pra saber o que a gente mesmo
  // acabou de confirmar.
  const markPasswordChanged = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  return { role, isAdmin: role === 'admin', mustChangePassword, loading, markPasswordChanged };
}
