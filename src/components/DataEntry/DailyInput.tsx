import { useState } from 'react';
import type { MonthSummary } from '../../types';

interface Props {
  summaries: MonthSummary[];
  storeMonths: any[];
  onSave: (year: number, month: number, day: number, cuts: number) => void;
  today: Date;
}

export function DailyInput({ summaries, storeMonths, onSave, today }: Props) {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonth}`);
  const [dayValues, setDayValues] = useState<Record<number, string>>({});

  const dailyMonths = summaries.filter(s => s.isDailyTracked);

  const [selYear, selMonth] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const existingData = storeMonths.find(m => m.year === selYear && m.month === selMonth);
  const dailyCuts = existingData?.dailyCuts || {};

  const getDayValue = (day: number): string => {
    if (dayValues[day] !== undefined) return dayValues[day];
    return dailyCuts[day] !== undefined ? String(dailyCuts[day]) : '';
  };

  const handleDayChange = (day: number, val: string) => {
    setDayValues(prev => ({ ...prev, [day]: val }));
  };

  const handleDaySave = (day: number) => {
    const val = dayValues[day];
    if (val === undefined || val === '') return;
    const cuts = parseInt(val, 10);
    if (isNaN(cuts) || cuts < 0) return;
    onSave(selYear, selMonth, day, cuts);
    setDayValues(prev => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
  };

  const monthTotal = Object.entries(dailyCuts).reduce((sum, [, v]) => sum + (v as number), 0)
    + Object.entries(dayValues).reduce((sum, [day, v]) => {
      if (dailyCuts[Number(day)] !== undefined) return sum; // already counted
      const n = parseInt(v, 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);

  const today_day = today.getDate();
  const isCurrentMonth = selYear === currentYear && selMonth === currentMonth;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm">
          Lançamento Diário (Mar/26 em diante)
        </h3>
        <select
          value={selectedMonth}
          onChange={e => { setSelectedMonth(e.target.value); setDayValues({}); }}
          className="bg-black border border-gray-700 text-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-500"
        >
          {dailyMonths.map(s => (
            <option key={`${s.year}-${s.month}`} value={`${s.year}-${s.month}`}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="ml-auto bg-yellow-900/30 border border-yellow-700 rounded px-3 py-1.5">
          <span className="text-yellow-400 font-bold text-lg">{monthTotal}</span>
          <span className="text-gray-400 text-xs ml-1">cortes no mês</span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const isToday = isCurrentMonth && day === today_day;
          const hasSavedValue = dailyCuts[day] !== undefined;
          const displayValue = getDayValue(day);

          return (
            <div
              key={day}
              className={`rounded p-2 text-center border ${
                isToday ? 'border-yellow-500 bg-yellow-900/30' :
                hasSavedValue ? 'border-green-800 bg-green-900/20' :
                'border-gray-800 bg-gray-900'
              }`}
            >
              <div className={`text-xs mb-1 ${isToday ? 'text-yellow-400 font-bold' : 'text-gray-500'}`}>
                {day}{isToday ? ' ★' : ''}
              </div>
              <input
                type="number"
                min="0"
                value={displayValue}
                onChange={e => handleDayChange(day, e.target.value)}
                onBlur={() => handleDaySave(day)}
                onKeyDown={e => e.key === 'Enter' && handleDaySave(day)}
                placeholder="0"
                className="w-full bg-transparent text-center text-sm text-yellow-300 focus:outline-none placeholder-gray-700"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-600">Pressione Enter ou clique fora do campo para salvar cada dia.</p>
    </div>
  );
}
