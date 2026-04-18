import type { MonthSummary } from '../../types';
import { StatsCards } from './StatsCards';
import { MonthlyBarChart } from './BarChart';
import { MonthTable } from './MonthTable';

interface Props {
  summaries: MonthSummary[];
  today: Date;
}

export function Reports({ summaries, today }: Props) {
  const hasData = summaries.some(s => s.total > 0);

  if (!hasData) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
        <p className="text-gray-500 text-lg">Nenhum dado lançado ainda.</p>
        <p className="text-gray-600 text-sm mt-2">Adicione os cortes mensais para ver os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsCards summaries={summaries} today={today} />
      <MonthlyBarChart summaries={summaries} today={today} />
      <MonthTable summaries={summaries} today={today} />
    </div>
  );
}
