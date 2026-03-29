import type { MonthSummary } from '../../types';
import { getBestMonth, getWorstMonth, getAverage } from '../../utils/analytics';

interface Props {
  summaries: MonthSummary[];
}

export function MonthTable({ summaries }: Props) {
  const best = getBestMonth(summaries);
  const worst = getWorstMonth(summaries);
  const avg = getAverage(summaries);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm mb-4">
        Detalhamento por Mês
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 py-2 px-2 font-medium">Mês</th>
              <th className="text-right text-gray-500 py-2 px-2 font-medium">Cortes</th>
              <th className="text-right text-gray-500 py-2 px-2 font-medium">vs. Média</th>
              <th className="text-right text-gray-500 py-2 px-2 font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {[...summaries].reverse().map(s => {
              const isBest = best && s.year === best.year && s.month === best.month;
              const isWorst = worst && s.year === worst.year && s.month === worst.month && s.total > 0;
              const diff = avg > 0 && s.total > 0 ? Math.round(((s.total - avg) / avg) * 100) : null;

              return (
                <tr key={`${s.year}-${s.month}`} className={`border-b border-gray-800/50 ${isBest ? 'bg-yellow-900/10' : isWorst ? 'bg-red-900/10' : ''}`}>
                  <td className="py-2 px-2">
                    <span className={isBest ? 'text-yellow-400 font-semibold' : isWorst ? 'text-red-400' : 'text-gray-300'}>
                      {s.label}
                    </span>
                    {isBest && <span className="ml-1 text-xs">🏆</span>}
                    {isWorst && <span className="ml-1 text-xs">📉</span>}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {s.total > 0 ? <span className="text-white">{s.total}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-xs">
                    {diff !== null ? (
                      <span className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {diff >= 0 ? '+' : ''}{diff}%
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-2 text-right text-xs text-gray-500">
                    {s.isDailyTracked ? 'Diário' : 'Mensal'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
