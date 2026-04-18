import { useState } from 'react';
import { Header } from './components/Header';
import { StoreSelector } from './components/StoreSelector';
import { DataEntry } from './components/DataEntry';
import { Reports } from './components/Reports';
import { AIInsights } from './components/AIInsights';
import { useBarberData } from './hooks/useBarberData';
import type { Store } from './types';
import { STORES } from './types';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedStore, setSelectedStore] = useState<Store>(STORES[0]);
  const [activeTab, setActiveTab] = useState<'entry' | 'reports'>('reports');
  const { summaries, storeData, setMonthTotal, setDailyCuts, today, loading, isSupabaseConfigured, refreshData } = useBarberData(selectedStore.id);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1">
            <StoreSelector selectedStore={selectedStore} onSelect={setSelectedStore} />
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
          {([['reports', 'Relatórios'], ['entry', 'Lançar Dados']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
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
            <Reports summaries={summaries} today={today} />
            <AIInsights summaries={summaries} today={today} />
          </>
        )}
      </main>
    </div>
  );
}
