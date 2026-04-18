import { X, TrendingUp, TrendingDown, Scissors } from 'lucide-react';
import { MONTH_NAMES } from '../../utils/analytics';

interface Props {
  year: number;
  month: number;
  dailyCuts: Record<number, number>;
  onClose: () => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function DayCalendarModal({ year, month, dailyCuts, onClose }: Props) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  // Stats
  const entries = Object.entries(dailyCuts)
    .map(([d, v]) => ({ day: Number(d), cuts: v as number }))
    .filter(e => e.cuts > 0);

  const total = Object.values(dailyCuts).reduce((s, v) => s + (v as number), 0);
  const avg = entries.length > 0 ? (total / entries.length).toFixed(1) : '—';
  const bestEntry = entries.length > 0 ? entries.reduce((a, b) => b.cuts > a.cuts ? b : a) : null;
  const worstEntry = entries.length > 1 ? entries.reduce((a, b) => b.cuts < a.cuts ? b : a) : null;

  const rows = Math.ceil((firstWeekday + daysInMonth) / 7);

  const getDayStyle = (day: number) => {
    if (bestEntry && day === bestEntry.day) return 'bg-yellow-500 text-black font-bold ring-2 ring-yellow-400';
    if (worstEntry && day === worstEntry.day) return 'bg-red-900 text-red-200 ring-2 ring-red-700';
    if (dailyCuts[day] !== undefined && (dailyCuts[day] as number) > 0) return 'bg-green-900/40 text-green-300';
    if (dailyCuts[day] === 0) return 'bg-gray-800/50 text-gray-600';
    return 'text-gray-400';
  };

  const getCutsColor = (day: number) => {
    if (bestEntry && day === bestEntry.day) return 'text-black font-bold';
    if (worstEntry && day === worstEntry.day) return 'text-red-300';
    if (dailyCuts[day] !== undefined && (dailyCuts[day] as number) > 0) return 'text-green-400';
    return 'text-gray-600';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold text-xl">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">{total.toLocaleString()} cortes no mês</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-px bg-gray-800 border-b border-gray-800">
          <div className="bg-gray-950 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={13} className="text-yellow-500" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Melhor dia</span>
            </div>
            {bestEntry ? (
              <>
                <p className="text-yellow-400 font-bold text-lg">Dia {bestEntry.day}</p>
                <p className="text-yellow-600 text-xs">{bestEntry.cuts} cortes</p>
              </>
            ) : <p className="text-gray-600 text-sm">—</p>}
          </div>

          <div className="bg-gray-950 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Scissors size={13} className="text-blue-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Média/dia</span>
            </div>
            <p className="text-blue-400 font-bold text-lg">{avg}</p>
            <p className="text-blue-600 text-xs">{entries.length} dias trabalhados</p>
          </div>

          <div className="bg-gray-950 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown size={13} className="text-red-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Menor dia</span>
            </div>
            {worstEntry ? (
              <>
                <p className="text-red-400 font-bold text-lg">Dia {worstEntry.day}</p>
                <p className="text-red-600 text-xs">{worstEntry.cuts} cortes</p>
              </>
            ) : <p className="text-gray-600 text-sm">—</p>}
          </div>
        </div>

        {/* Calendário */}
        <div className="px-3 py-3">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-600 uppercase py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: rows * 7 }, (_, i) => {
              const day = i - firstWeekday + 1;
              const isValid = day >= 1 && day <= daysInMonth;
              const cuts = isValid ? (dailyCuts[day] as number | undefined) : undefined;

              return (
                <div
                  key={i}
                  className={`
                    rounded-lg aspect-square flex flex-col items-center justify-center text-center
                    ${!isValid ? 'opacity-0' : ''}
                    ${isValid ? getDayStyle(day) : ''}
                  `}
                >
                  {isValid && (
                    <>
                      <span className="text-xs leading-tight">{day}</span>
                      {cuts !== undefined && (
                        <span className={`text-xs font-bold leading-tight mt-0.5 ${getCutsColor(day)}`}>
                          {cuts > 0 ? cuts : '·'}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="px-5 pb-5 pt-1 flex items-center justify-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-yellow-500 inline-block"></span>
            Melhor dia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-900 inline-block"></span>
            Com cortes
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-900 inline-block"></span>
            Menor dia
          </span>
        </div>
      </div>
    </div>
  );
}
