import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MonthSummary, MonthData } from '../../types';
import { getBestMonth, getWorstMonth, getProjection } from '../../utils/analytics';
import { DayCalendarModal } from './DayCalendarModal';

interface Props {
  summaries: MonthSummary[];
  today: Date;
  storeMonths: MonthData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const actual = payload.find((p: any) => p.dataKey === 'cuts')?.value ?? 0;
    const projected = payload.find((p: any) => p.dataKey === 'projectedRemaining')?.value ?? 0;
    const isOngoing = projected > 0;
    return (
      <div className="bg-gray-900 border border-yellow-700 rounded p-3 text-sm shadow-xl">
        <p className="text-yellow-400 font-bold mb-1">{label}</p>
        {isOngoing ? (
          <>
            <p className="text-white">{actual} cortes realizados</p>
            <p className="text-yellow-400/70">~{(actual + projected).toLocaleString()} projetado</p>
          </>
        ) : (
          <p className="text-white">{actual} cortes</p>
        )}
      </div>
    );
  }
  return null;
};

interface ModalState {
  year: number;
  month: number;
  dailyCuts: Record<number, number>;
}

export function MonthlyBarChart({ summaries, today, storeMonths }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const best = getBestMonth(summaries);
  const worst = getWorstMonth(summaries);

  const data = summaries.map(s => {
    const isCurrentMonth =
      s.year === today.getFullYear() && s.month === today.getMonth() + 1;
    const projection = isCurrentMonth ? getProjection(s, today) : null;
    const projectedRemaining = projection && projection > s.total ? projection - s.total : 0;
    return {
      name: s.label,
      cuts: s.total,
      projectedRemaining,
      year: s.year,
      month: s.month,
      isCurrentMonth,
    };
  });

  const getActualColor = (entry: any) => {
    if (entry.isCurrentMonth) return '#D4AF37';
    if (best && entry.year === best.year && entry.month === best.month) return '#D4AF37';
    if (worst && entry.year === worst.year && entry.month === worst.month && entry.cuts > 0) return '#7f1d1d';
    return '#374151';
  };

  const handleBarClick = (barData: any) => {
    if (!barData) return;
    const { year, month } = barData;
    const monthEntry = storeMonths.find(m => m.year === year && m.month === month);
    if (!monthEntry?.dailyCuts || Object.keys(monthEntry.dailyCuts).length === 0) return;
    setModal({ year, month, dailyCuts: monthEntry.dailyCuts });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm mb-4">
        Cortes por Mês
      </h3>
      <div className="flex gap-4 text-xs text-gray-500 mb-3 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block"></span> Melhor mês / Vigente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500/30 border border-yellow-500/50 inline-block"></span> Projeção</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-900 inline-block"></span> Menor movimento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-700 inline-block"></span> Demais meses</span>
      </div>
      <p className="text-xs text-gray-600 mb-2 italic">
        Toque numa barra com dados diários para ver o calendário detalhado
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          {/* Barra real */}
          <Bar dataKey="cuts" stackId="a" radius={[0, 0, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
            {data.map((entry, idx) => {
              const hasDailyData = storeMonths.some(
                m => m.year === entry.year && m.month === entry.month && m.dailyCuts && Object.keys(m.dailyCuts).length > 0
              );
              return (
                <Cell
                  key={`actual-${idx}`}
                  fill={getActualColor(entry)}
                  style={{ cursor: hasDailyData ? 'pointer' : 'default' }}
                />
              );
            })}
          </Bar>
          {/* Barra projetada (trecho restante) */}
          <Bar dataKey="projectedRemaining" stackId="a" radius={[3, 3, 0, 0]} fill="#D4AF37" fillOpacity={0.25} stroke="#D4AF37" strokeOpacity={0.5} strokeWidth={1} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
        </BarChart>
      </ResponsiveContainer>

      {modal && (
        <DayCalendarModal
          year={modal.year}
          month={modal.month}
          dailyCuts={modal.dailyCuts}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
