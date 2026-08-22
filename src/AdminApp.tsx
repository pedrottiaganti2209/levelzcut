import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { AdminPanel } from './components/Admin';
import { useUserRole } from './hooks/useUserRole';
import { getSession, onAuthStateChange, signOut, isSupabaseConfigured } from './lib/supabase';
import { RefreshCw, ShieldAlert } from 'lucide-react';

// H11: app de administração, publicado separado do app de barbeiro (App.tsx)
// — "dois mundos" com URLs diferentes, cada um só com o código que usa.
// Só existe uma porta de entrada aqui: login → checagem de papel. Diferente
// do app de barbeiro, essa checagem NÃO fica atrás da feature flag
// VITE_REQUIRE_AUTH — publicar este app como um serviço à parte já É o passo
// deliberado de ativação (ninguém chega aqui sem saber o endereço), então
// login sempre é exigido, incondicionalmente.
//
// Isso não muda nada da segurança de verdade: quem garante que só um admin
// consegue cadastrar loja/barbeiro continua sendo a RLS do banco e a
// Edge Function `admin-barbers` (que reconfirma o papel no servidor antes
// de fazer qualquer coisa) — a checagem de papel aqui embaixo é só pra não
// mostrar o formulário pra quem não vai conseguir usá-lo mesmo.
export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useUserRole(session);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    getSession().then((s) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data } = onAuthStateChange((s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 text-center">
        <p className="text-gray-400 text-sm max-w-sm">
          Configure as variáveis do Supabase (<code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>) pra usar a administração.
        </p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-yellow-600" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Evita mostrar qualquer coisa do painel antes de saber se essa conta é
  // mesmo admin — mesmo cuidado já usado no app de barbeiro pro gate de
  // troca de senha (H10).
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-yellow-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert size={28} className="text-gray-600" />
        <p className="text-gray-300 font-medium">Essa área é só para administradores.</p>
        <p className="text-gray-500 text-sm max-w-sm">
          Sua conta não tem permissão de administração. Se você é barbeiro, use o app de sempre pra ver relatórios e lançar dados.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-2 text-xs text-gray-400 hover:text-yellow-500 transition-colors uppercase tracking-wider"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header subtitle="Administração" onSignOut={() => signOut()} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <AdminPanel />
      </main>
    </div>
  );
}
