import type { MonthSummary } from '../types';
import { getBestMonth, getWorstMonth, getAverage, MONTH_NAMES } from './analytics';

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  title: string;
  body: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function generateInsights(summaries: MonthSummary[], today: Date): Insight[] {
  const insights: Insight[] = [];
  const withData = summaries.filter(s => s.total > 0);
  if (withData.length === 0) return [];

  const best = getBestMonth(summaries);
  const worst = getWorstMonth(summaries);
  const avg = getAverage(summaries);

  // Current month projection
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentSummary = summaries.find(s => s.year === currentYear && s.month === currentMonth);
  if (currentSummary && currentSummary.isDailyTracked && currentSummary.total > 0) {
    const dayOfMonth = today.getDate();
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const dailyAvg = currentSummary.total / dayOfMonth;
    const projected = Math.round(dailyAvg * daysInMonth);
    const monthName = MONTH_NAMES[currentMonth - 1];
    if (projected > (best?.total || 0)) {
      insights.push({
        type: 'positive',
        title: `🏆 Melhor mês histórico à vista!`,
        body: `${monthName} está projetado para ${projected} cortes — isso seria um recorde! Com ${currentSummary.total} cortes em ${dayOfMonth} dias, a média diária é de ${dailyAvg.toFixed(1)} cortes/dia.`,
      });
    } else {
      insights.push({
        type: projected >= avg ? 'positive' : 'neutral',
        title: `📊 Projeção de ${monthName}/${currentYear}`,
        body: `Com ${currentSummary.total} cortes em ${dayOfMonth} dias, você está projetado para ${projected} cortes no mês. ${projected >= avg ? `Acima da média mensal (${avg})!` : `A média mensal é ${avg} cortes.`}`,
      });
    }
  }

  // Best month highlight
  if (best) {
    insights.push({
      type: 'positive',
      title: `🥇 Melhor mês: ${best.label}`,
      body: `${best.label} foi seu mês com maior número de atendimentos: ${best.total} cortes. ${avg > 0 ? `Isso é ${Math.round(((best.total - avg) / avg) * 100)}% acima da média mensal.` : ''}`,
    });
  }

  // Worst month
  if (worst && worst.total > 0 && worst.label !== best?.label) {
    insights.push({
      type: 'warning',
      title: `📉 Mês com menor movimento: ${worst.label}`,
      body: `${worst.label} teve apenas ${worst.total} cortes — o menor do período. ${avg > 0 ? `${Math.round(((avg - worst.total) / avg) * 100)}% abaixo da média.` : ''} Vale analisar o que aconteceu nesse período.`,
    });
  }

  // Month-over-month comparison (last 3 months)
  const last3 = withData.slice(-3);
  if (last3.length >= 2) {
    const prev = last3[last3.length - 2];
    const last = last3[last3.length - 1];
    if (prev.total > 0 && last.label !== currentSummary?.label) {
      const diff = last.total - prev.total;
      const pct = Math.round((diff / prev.total) * 100);
      insights.push({
        type: diff >= 0 ? 'positive' : 'negative',
        title: `📈 Comparativo: ${prev.label} vs ${last.label}`,
        body: `${last.label} teve ${Math.abs(diff)} cortes ${diff >= 0 ? 'a mais' : 'a menos'} que ${prev.label} (${diff >= 0 ? '+' : ''}${pct}%). ${diff > 0 ? 'Crescimento consistente!' : 'Queda que merece atenção.'}`,
      });
    }
  }

  // Trend analysis
  if (withData.length >= 3) {
    const recentMonths = withData.slice(-3);
    const isGrowing = recentMonths.every((m, i) => i === 0 || m.total >= recentMonths[i - 1].total);
    const isDeclining = recentMonths.every((m, i) => i === 0 || m.total <= recentMonths[i - 1].total);
    if (isGrowing && recentMonths.length === 3) {
      insights.push({
        type: 'positive',
        title: '📈 Tendência de crescimento',
        body: `Os últimos 3 meses mostram crescimento consistente: ${recentMonths.map(m => `${m.label} (${m.total})`).join(' → ')}. Continue assim!`,
      });
    } else if (isDeclining && recentMonths.length === 3) {
      insights.push({
        type: 'negative',
        title: '📉 Tendência de queda',
        body: `Os últimos 3 meses mostram queda: ${recentMonths.map(m => `${m.label} (${m.total})`).join(' → ')}. Considere ações de marketing ou promoções.`,
      });
    }
  }

  // Average insight
  if (avg > 0) {
    insights.push({
      type: 'neutral',
      title: `📊 Média mensal: ${avg} cortes`,
      body: `A média de atendimentos mensais é de ${avg} cortes. ${withData.filter(s => s.total >= avg).length} de ${withData.length} meses ficaram acima da média.`,
    });
  }

  return insights;
}
