import type { MonthSummary } from '../../types';
import { getBestMonth, getWorstMonth, getAverage, getTotalCuts } from '../../utils/analytics';
import { TrendingUp, TrendingDown, Scissors, BarChart2 } from 'lucide-react';

interface Props {
  summaries: MonthSummary[];
}

export function StatsCards({ summaries }: Props) {
  const best = getBestMonth(summaries);
  const worst = getWorstMonth(summaries);
  const avg = getAverage(summaries);
  const total = getTotalCuts(summaries);

  const cards = [
    { label: 'Total de Cortes', value: total.toLocaleString(), sub: 'desde Jan/2025', icon: Scissors, color: 'yellow' },
    { label: 'Média Mensal', value: avg.toLocaleString(), sub: 'cortes por mês', icon: BarChart2, color: 'blue' },
    { label: 'Melhor Mês', value: best ? best.label : '—', sub: best ? `${best.total} cortes` : 'sem dados', icon: TrendingUp, color: 'green' },
    { label: 'Menor Movimento', value: worst ? worst.label : '—', sub: worst ? `${worst.total} cortes` : 'sem dados', icon: TrendingDown, color: 'red' },
  ];

  const colorMap: Record<string, string> = {
    yellow: 'border-yellow-700 bg-yellow-900/10 text-yellow-400',
    blue: 'border-blue-700 bg-blue-900/10 text-blue-400',
    green: 'border-green-700 bg-green-900/10 text-green-400',
    red: 'border-red-800 bg-red-900/10 text-red-400',
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className={`rounded-lg border p-4 ${colorMap[color]}`}>
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <Icon size={16} className="opacity-60" />
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}
