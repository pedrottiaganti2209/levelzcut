import type { MonthSummary } from '../../types';
import { getBestMonth, getWorstMonth, getAverage, getTotalCuts, getProjection } from '../../utils/analytics';
import { TrendingUp, TrendingDown, Scissors, BarChart2, Target } from 'lucide-react';

interface Props {
  summaries: MonthSummary[];
  today: Date;
}

export function StatsCards({ summaries, today }: Props) {
  const best = getBestMonth(summaries);
  const worst = getWorstMonth(summaries);
  const avg = getAverage(summaries);
  const total = getTotalCuts(summaries);

  // Projeção do mês vigente
  const currentSummary = summaries.find(
    s => s.year === today.getFullYear() && s.month === today.getMonth() + 1
  );
  const projection = currentSummary ? getProjection(currentSummary, today) : null;
  const daysElapsed = today.getDate();
  const daysInMonth = currentSummary
    ? new Date(currentSummary.year, currentSummary.month, 0).getDate()
    : 0;
  const dailyAvg = currentSummary && daysElapsed > 0
    ? (currentSummary.total / daysElapsed).toFixed(1)
    : null;

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
    <div className="space-y-4">
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

      {/* Card de projeção do mês vigente */}
      {projection !== null && currentSummary && (
        <div className="rounded-lg border border-yellow-600 bg-gradient-to-r from-yellow-900/30 to-yellow-800/10 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-600/20">
                <Target size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-yellow-600 uppercase tracking-wider font-semibold">
                  Projeção de Fechamento — {currentSummary.label}
                </p>
                <p className="text-3xl font-bold text-yellow-400 mt-0.5">
                  ~{projection.toLocaleString()} cortes
                </p>
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xs text-gray-500">Realizados</p>
                <p className="text-xl font-bold text-white">{currentSummary.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Dias passados</p>
                <p className="text-xl font-bold text-white">{daysElapsed}/{daysInMonth}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Média/dia</p>
                <p className="text-xl font-bold text-white">{dailyAvg}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">vs. Média mensal</p>
                <p className={`text-xl font-bold ${projection >= avg ? 'text-green-400' : 'text-red-400'}`}>
                  {projection >= avg ? '+' : ''}{Math.round(((projection - avg) / avg) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{currentSummary.total} cortes até hoje</span>
              <span>meta estimada: {projection.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (currentSummary.total / projection) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
