import { useState } from 'react';
import { OverviewPanel } from './OverviewPanel';
import { StoresPanel } from './StoresPanel';
import { BarbersPanel } from './BarbersPanel';

export function AdminPanel() {
  const [tab, setTab] = useState<'overview' | 'stores' | 'barbers'>('overview');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit border border-gray-800">
        {([
          ['overview', 'Visão Geral'],
          ['stores', 'Lojas'],
          ['barbers', 'Barbeiros'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2 rounded text-sm font-medium transition-colors ${
              tab === id ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewPanel />}
      {tab === 'stores' && <StoresPanel />}
      {tab === 'barbers' && <BarbersPanel />}
    </div>
  );
}
