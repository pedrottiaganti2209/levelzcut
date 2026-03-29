import { useState } from 'react';
import { Header } from './components/Header';
import { StoreSelector } from './components/StoreSelector';
import { DataEntry } from './components/DataEntry';
import { Reports } from './components/Reports';
import { AIInsights } from './components/AIInsights';
import { useBarberData } from './hooks/useBarberData';
import type { Store } from './types';
import { STORES } from './types';

export default function App() {
  const [selectedStore, setSelectedStore] = useState<Store>(STORES[0]);
  const [activeTab, setActiveTab] = useState<'entry' | 'reports'>('reports');
  const { summaries, storeData, setMonthTotal, setDailyCuts, today } = useBarberData(selectedStore.id);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <StoreSelector selectedStore={selectedStore} onSelect={setSelectedStore} />

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

        {activeTab === 'entry' ? (
          <DataEntry
            summaries={summaries}
            storeMonths={storeData.months}
            onSaveMonthTotal={setMonthTotal}
            onSaveDailyCuts={setDailyCuts}
            today={today}
          />
        ) : (
          <>
            <Reports summaries={summaries} />
            <AIInsights summaries={summaries} today={today} />
          </>
        )}
      </main>
    </div>
  );
}
