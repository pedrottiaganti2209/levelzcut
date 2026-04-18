import { useState, useRef } from 'react';
import type { MonthSummary } from '../../types';
import { MONTH_NAMES } from '../../utils/analytics';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

interface Props {
  summaries: MonthSummary[];
  storeMonths: any[];
  onSave: (year: number, month: number, day: number, cuts: number) => void;
  today: Date;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function DailyInput({ summaries, storeMonths, onSave, today }: Props) {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const dailyMonths = summaries.filter(s => s.isDailyTracked);

  // Default to current month index in dailyMonths
  const defaultIdx = Math.max(0, dailyMonths.findIndex(
    s => s.year === currentYear && s.month === currentMonth
  ));
  const [monthIdx, setMonthIdx] = useState(defaultIdx === -1 ? 0 : defaultIdx);

  // Selected day for editing
  const [editDay, setEditDay] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = dailyMonths[monthIdx];
  if (!selected) return <p className="text-gray-500 text-sm">Nenhum mês disponível para lançamento diário.</p>;

  const { year: selYear, month: selMonth } = selected;
  const daysInMonth = new Date(selYear, selMonth, 0).getDate();
  const firstWeekday = new Date(selYear, selMonth - 1, 1).getDay(); // 0=Sun
  const existingData = storeMonths.find(m => m.year === selYear && m.month === selMonth);
  const dailyCuts: Record<number, number> = existingData?.dailyCuts || {};

  const monthTotal = Object.values(dailyCuts).reduce((s, v) => s + (v as number), 0);
  const isCurrentMonth = selYear === currentYear && selMonth === currentMonth;
  const todayDay = today.getDate();

  // Open edit modal for a day
  const openEdit = (day: number) => {
    setEditDay(day);
    setEditValue(dailyCuts[day] !== undefined ? String(dailyCuts[day]) : '');
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const closeEdit = () => { setEditDay(null); setEditValue(''); };

  const confirmEdit = () => {
    if (editDay === null) return;
    const cuts = parseInt(editValue, 10);
    if (!isNaN(cuts) && cuts >= 0) {
      onSave(selYear, selMonth, editDay, cuts);
    }
    closeEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') closeEdit();
  };

  // Build calendar grid: leading empty cells + days
  const totalCells = firstWeekday + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  return (
    <div className="space-y-4">
      {/* Header: month nav + total */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthIdx(i => Math.max(0, i - 1))}
          disabled={monthIdx === 0}
          className="p-2 rounded-full disabled:opacity-30 hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} className="text-yellow-500" />
        </button>

        <div className="text-center">
          <p className="text-white font-bold text-lg">
            {MONTH_NAMES[selMonth - 1]} {selYear}
          </p>
          <p className="text-yellow-400 font-semibold text-sm">
            {monthTotal} <span className="text-gray-400 font-normal">cortes no mês</span>
          </p>
        </div>

        <button
          onClick={() => setMonthIdx(i => Math.min(dailyMonths.length - 1, i + 1))}
          disabled={monthIdx === dailyMonths.length - 1}
          className="p-2 rounded-full disabled:opacity-30 hover:bg-gray-800 transition-colors"
        >
          <ChevronRight size={20} className="text-yellow-500" />
        </button>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-800">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: rows * 7 }, (_, i) => {
            const day = i - firstWeekday + 1;
            const isValid = day >= 1 && day <= daysInMonth;
            const isToday = isCurrentMonth && day === todayDay;
            const hasCuts = isValid && dailyCuts[day] !== undefined;
            const cutsVal = hasCuts ? dailyCuts[day] : null;
            const isFuture = isCurrentMonth && day > todayDay;

            return (
              <button
                key={i}
                disabled={!isValid || isFuture}
                onClick={() => isValid && !isFuture && openEdit(day)}
                className={`
                  relative min-h-[56px] sm:min-h-[64px] flex flex-col items-center justify-start pt-1.5 pb-1 px-0.5
                  border-b border-r border-gray-800/50 transition-colors
                  ${!isValid ? 'opacity-0 pointer-events-none' : ''}
                  ${isFuture ? 'opacity-30 cursor-not-allowed' : ''}
                  ${isValid && !isFuture ? 'active:bg-gray-800 hover:bg-gray-800/60 cursor-pointer' : ''}
                `}
              >
                {isValid && (
                  <>
                    {/* Day number */}
                    <span className={`
                      text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-yellow-500 text-black' : 'text-gray-300'}
                    `}>
                      {day}
                    </span>

                    {/* Cuts value */}
                    {hasCuts && cutsVal !== null && (
                      <span className={`
                        text-xs font-bold mt-0.5
                        ${cutsVal === 0 ? 'text-gray-600' : 'text-yellow-400'}
                      `}>
                        {cutsVal}
                      </span>
                    )}

                    {/* Dot indicator */}
                    {hasCuts && cutsVal !== null && cutsVal > 0 && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-500" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-600 text-center">Toque num dia para lançar os cortes</p>

      {/* Edit modal overlay */}
      {editDay !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-bold text-lg">
                  {MONTH_NAMES[selMonth - 1]} {day_ordinal(editDay)}
                </p>
                <p className="text-gray-400 text-sm">{selYear}</p>
              </div>
              <button onClick={closeEdit} className="p-2 rounded-full hover:bg-gray-800">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-gray-500 text-sm">✂️</span>
                <input
                  ref={inputRef}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="0"
                  className="flex-1 bg-transparent text-white text-xl font-bold focus:outline-none placeholder-gray-700"
                />
                <span className="text-gray-500 text-xs">cortes</span>
              </div>
              <button
                onClick={confirmEdit}
                className="bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl p-3 transition-colors"
              >
                <Check size={22} />
              </button>
            </div>

            {dailyCuts[editDay] !== undefined && (
              <p className="text-gray-500 text-xs mt-3 text-center">
                Valor atual: {dailyCuts[editDay]} cortes
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function day_ordinal(day: number): string {
  return `dia ${day}`;
}
