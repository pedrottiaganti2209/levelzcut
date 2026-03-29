import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MonthSummary } from '../../types';
import { getBestMonth, getWorstMonth } from '../../utils/analytics';

interface Props {
  summaries: MonthSummary[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-yellow-700 rounded p-3 text-sm">
        <p className="text-yellow-400 font-bold">{label}</p>
        <p className="text-white">{payload[0].value} cortes</p>
      </div>
    );
  }
  return null;
};

export function MonthlyBarChart({ summaries }: Props) {
  const best = getBestMonth(summaries);
  const worst = getWorstMonth(summaries);
  const data = summaries.map(s => ({ name: s.label, cuts: s.total, year: s.year, month: s.month }));

  const getColor = (entry: any) => {
    if (best && entry.year === best.year && entry.month === best.month) return '#D4AF37';
    if (worst && entry.year === worst.year && entry.month === worst.month && entry.cuts > 0) return '#7f1d1d';
    return '#374151';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm mb-4">
        Cortes por Mês
      </h3>
      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500 inline-block"></span> Melhor mês</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-900 inline-block"></span> Menor movimento</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-700 inline-block"></span> Demais meses</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="cuts" radius={[3, 3, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={getColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
