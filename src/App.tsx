import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { StoreSelector } from './components/StoreSelector';
import { DataEntry } from './components/DataEntry';
import { Reports } from './components/Reports';
import { AIInsights } from './components/AIInsights';
import { AdminPanel } from './components/Admin';
import { useBarberData } from './hooks/useBarberData';
import { useStores } from './hooks/useStores';
import { useUserRole } from './hooks/useUserRole';
import type { Store } from './types';
import { STORES } from './types';
import { isAuthRequired, getSession, onAuthStateChange, signOut } from './lib/supabase';
import { Cloud, CloudOff, RefreshCw, Shield } from 'lucide-react';

export default function App() {
  const [selectedStore, setSelectedStore] = useState<Store>(STORES[0]);
  const [activeTab, setActiveTab] = useState<'entry' | 'reports' | 'admin'>('reports');
  const { summaries, storeData, setMonthTotal, setDailyCuts, today, loading, isSupabaseConfigured, refreshData } = useBarberData(selectedStore.id);
  const { stores } = useStores();

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isAuthRequired);
  const { isAdmin } = useUserRole(session);

  useEffect(() => {
    if (!isAuthRequired) return;
    getSession().then((s) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data } = onAuthStateChange((s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Se a loja selecionada não existir mais na lista carregada (ex.: veio do
  // fallback fixo e depois o Supabase respondeu com uma lista diferente),
  // cai pra primeira loja disponível.
  useEffect(() => {
    if (stores.length === 0) return;
    if (!stores.some((s) => s.id === selectedStore.id)) {
      setSelectedStore(stores[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores]);

  // Aba de administração só existe pra quem está autenticado E é admin —
  // sem a flag de auth ligada, isAdmin nunca é true (ver useUserRole),
  // então isso não muda nada da experiência atual.
  const showAdminTab = isAuthRequired && isAdmin;

  useEffect(() => {
    if (activeTab === 'admin' && !showAdminTab) setActiveTab('reports');
  }, [activeTab, showAdminTab]);

  if (isAuthRequired && authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-yellow-600" />
      </div>
    );
  }

  if (isAuthRequired && !session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header onSignOut={isAuthRequired ? () => signOut() : undefined} />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <StoreSelector stores={stores} selectedStore={selectedStore} onSelect={setSelectedStore} />
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${isSupabaseConfigured ? 'border-green-800 bg-green-900/20 text-green-400' : 'border-yellow-800 bg-yellow-900/20 text-yellow-500'}`}>
            {isSupabaseConfigured ? <Cloud size={14} /> : <CloudOff size={14} />}
            {isSupabaseConfigured ? 'Sincronizado na nuvem' : 'Modo local'}
            {isSupabaseConfigured && (
              <button onClick={refreshData} className="ml-1 hover:text-green-200 transition-colors" title="Atualizar dados">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit border border-gray-800">
          {([
            ['reports', 'Relatórios'],
            ['entry', 'Lançar Dados'],
            ...(showAdminTab ? ([['admin', 'Administração']] as const) : []),
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-2 rounded text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === id ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {id === 'admin' && <Shield size={14} />}
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'admin' && showAdminTab ? (
          <AdminPanel />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={32} className="animate-spin text-yellow-600" />
          </div>
        ) : activeTab === 'entry' ? (
          <DataEntry
            summaries={summaries}
            storeMonths={storeData.months}
            onSaveMonthTotal={setMonthTotal}
            onSaveDailyCuts={setDailyCuts}
            today={today}
          />
        ) : (
          <>
            <Reports summaries={summaries} today={today} storeMonths={storeData.months} />
            <AIInsights summaries={summaries} today={today} />
          </>
        )}
      </main>
    </div>
  );
}
