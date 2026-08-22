import { useState } from 'react';
import { StoresPanel } from './StoresPanel';
import { BarbersPanel } from './BarbersPanel';

export function AdminPanel() {
  const [tab, setTab] = useState<'stores' | 'barbers'>('stores');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit border border-gray-800">
        {([
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
      {tab === 'stores' ? <StoresPanel /> : <BarbersPanel />}
    </div>
  );
}
