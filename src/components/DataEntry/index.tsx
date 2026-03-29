import { useState } from 'react';
import type { MonthSummary } from '../../types';
import { MonthlyInput } from './MonthlyInput';
import { DailyInput } from './DailyInput';

interface Props {
  summaries: MonthSummary[];
  storeMonths: any[];
  onSaveMonthTotal: (year: number, month: number, total: number) => void;
  onSaveDailyCuts: (year: number, month: number, day: number, cuts: number) => void;
  today: Date;
}

export function DataEntry({ summaries, storeMonths, onSaveMonthTotal, onSaveDailyCuts, today }: Props) {
  const [tab, setTab] = useState<'monthly' | 'daily'>('monthly');

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex gap-1 mb-6 bg-black rounded-lg p-1 w-fit">
        {(['monthly', 'daily'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t === 'monthly' ? 'Meses Anteriores' : 'Lançamento Diário'}
          </button>
        ))}
      </div>

      {tab === 'monthly' ? (
        <MonthlyInput summaries={summaries} onSave={onSaveMonthTotal} />
      ) : (
        <DailyInput summaries={summaries} storeMonths={storeMonths} onSave={onSaveDailyCuts} today={today} />
      )}
    </div>
  );
}
