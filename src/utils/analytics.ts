import type { MonthData, MonthSummary } from '../types';
import { DAILY_TRACKING_START } from '../types';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function isBeforeDailyTracking(year: number, month: number): boolean {
  if (year < DAILY_TRACKING_START.year) return true;
  if (year === DAILY_TRACKING_START.year && month < DAILY_TRACKING_START.month) return true;
  return false;
}

export function getMonthTotal(monthData: MonthData | undefined): number {
  if (!monthData) return 0;
  if (monthData.total !== undefined) return monthData.total;
  if (monthData.dailyCuts) {
    return Object.values(monthData.dailyCuts).reduce((sum, v) => sum + v, 0);
  }
  return 0;
}

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]}/${String(year).slice(2)}`;
}

export function getAllMonths(startYear: number, startMonth: number, endYear: number, endMonth: number): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

export function buildSummaries(months: Array<{ year: number; month: number }>, storeMonths: MonthData[]): MonthSummary[] {
  return months.map(({ year, month }) => {
    const data = storeMonths.find(m => m.year === year && m.month === month);
    const total = getMonthTotal(data);
    const isDailyTracked = !isBeforeDailyTracking(year, month);
    const daysEntered = isDailyTracked && data?.dailyCuts ? Object.keys(data.dailyCuts).length : undefined;
    return {
      year,
      month,
      label: getMonthLabel(year, month),
      total,
      isDailyTracked,
      daysEntered,
    };
  });
}

export function getBestMonth(summaries: MonthSummary[]): MonthSummary | null {
  const withData = summaries.filter(s => s.total > 0);
  if (!withData.length) return null;
  return withData.reduce((best, s) => s.total > best.total ? s : best);
}

export function getWorstMonth(summaries: MonthSummary[]): MonthSummary | null {
  const withData = summaries.filter(s => s.total > 0);
  if (!withData.length) return null;
  return withData.reduce((worst, s) => s.total < worst.total ? s : worst);
}

export function getAverage(summaries: MonthSummary[]): number {
  const withData = summaries.filter(s => s.total > 0);
  if (!withData.length) return 0;
  const sum = withData.reduce((acc, s) => acc + s.total, 0);
  return Math.round(sum / withData.length);
}

export function getTotalCuts(summaries: MonthSummary[]): number {
  return summaries.reduce((acc, s) => acc + s.total, 0);
}
