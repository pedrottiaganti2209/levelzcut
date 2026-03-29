import { useState } from 'react';
import type { MonthSummary } from '../../types';

interface Props {
  summaries: MonthSummary[];
  onSave: (year: number, month: number, total: number) => void;
}

export function MonthlyInput({ summaries, onSave }: Props) {
  const [selected, setSelected] = useState<string>('');
  const [value, setValue] = useState<string>('');

  const historicalMonths = summaries.filter(s => !s.isDailyTracked);

  const handleSave = () => {
    if (!selected || !value) return;
    const [year, month] = selected.split('-').map(Number);
    const total = parseInt(value, 10);
    if (isNaN(total) || total < 0) return;
    onSave(year, month, total);
    setValue('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm">
        Lançamento Mensal (Jan/25 — Fev/26)
      </h3>
      <div className="flex gap-3 flex-wrap">
        <select
          value={selected}
          onChange={e => {
            setSelected(e.target.value);
            if (e.target.value) {
              const [y, m] = e.target.value.split('-').map(Number);
              const existing = historicalMonths.find(s => s.year === y && s.month === m);
              setValue(existing?.total ? String(existing.total) : '');
            }
          }}
          className="bg-black border border-gray-700 text-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 flex-1 min-w-40"
        >
          <option value="">Selecione o mês</option>
          {historicalMonths.map(s => (
            <option key={`${s.year}-${s.month}`} value={`${s.year}-${s.month}`}>
              {s.label} {s.total > 0 ? `(${s.total} cortes)` : ''}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder="Qtd. cortes"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="bg-black border border-gray-700 text-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 w-36"
        />
        <button
          onClick={handleSave}
          disabled={!selected || !value}
          className="bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold px-4 py-2 rounded text-sm transition-colors"
        >
          Salvar
        </button>
      </div>

      {/* Quick overview table */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
        {historicalMonths.map(s => (
          <div
            key={`${s.year}-${s.month}`}
            className={`rounded p-2 text-center text-xs border ${s.total > 0 ? 'border-yellow-800 bg-yellow-900/20' : 'border-gray-800 bg-gray-900'}`}
          >
            <div className="text-gray-400">{s.label}</div>
            <div className={`font-bold ${s.total > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
              {s.total > 0 ? s.total : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
