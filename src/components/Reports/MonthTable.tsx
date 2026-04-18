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
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm mb-4">
        Detalhamento por Mês
      </h3>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-500 py-2 px-3 font-medium whitespace-nowrap min-w-[130px]">Mês</th>
              <th className="text-right text-gray-500 py-2 px-3 font-medium whitespace-nowrap">Cortes</th>
              <th className="text-right text-gray-500 py-2 px-3 font-medium whitespace-nowrap">vs. Média</th>
              <th className="text-right text-gray-500 py-2 px-3 font-medium whitespace-nowrap hidden sm:table-cell">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {[...summaries].reverse().map(s => {
              const isBest = best && s.year === best.year && s.month === best.month;
              const isWorst = worst && s.year === worst.year && s.month === worst.month && s.total > 0;
              const diff = avg > 0 && s.total > 0 ? Math.round(((s.total - avg) / avg) * 100) : null;

              return (
                <tr key={`${s.year}-${s.month}`} className={`border-b border-gray-800/50 ${isBest ? 'bg-yellow-900/10' : isWorst ? 'bg-red-900/10' : ''}`}>
                  <td className="py-2 px-3 whitespace-nowrap min-w-[130px]">
                    <span className={isBest ? 'text-yellow-400 font-semibold' : isWorst ? 'text-red-400' : 'text-gray-300'}>
                      {s.label}
                    </span>
                    {isBest && <span className="ml-1 text-xs">🏆</span>}
                    {isWorst && <span className="ml-1 text-xs">📉</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                    {s.total > 0 ? <span className="text-white">{s.total}</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-3 text-right text-xs whitespace-nowrap">
                    {diff !== null ? (
                      <span className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {diff >= 0 ? '+' : ''}{diff}%
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="py-2 px-3 text-right text-xs text-gray-500 whitespace-nowrap hidden sm:table-cell">
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
