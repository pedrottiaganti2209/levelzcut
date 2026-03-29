import type { MonthSummary } from '../types';
import { generateInsights } from '../utils/insights';
import { Sparkles } from 'lucide-react';

interface Props {
  summaries: MonthSummary[];
  today: Date;
}

const typeColors = {
  positive: 'border-green-800 bg-green-900/20 text-green-300',
  negative: 'border-red-800 bg-red-900/20 text-red-300',
  neutral: 'border-blue-800 bg-blue-900/20 text-blue-300',
  warning: 'border-yellow-800 bg-yellow-900/20 text-yellow-300',
};

export function AIInsights({ summaries, today }: Props) {
  const insights = generateInsights(summaries, today);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-yellow-500" />
        <h3 className="text-yellow-500 font-semibold uppercase tracking-wider text-sm">
          Insights de IA
        </h3>
      </div>

      {insights.length === 0 ? (
        <p className="text-gray-600 text-sm">Lance dados para ver os insights.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-lg border p-4 ${typeColors[insight.type]}`}>
              <p className="font-semibold text-sm mb-1">{insight.title}</p>
              <p className="text-xs opacity-80 leading-relaxed">{insight.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
