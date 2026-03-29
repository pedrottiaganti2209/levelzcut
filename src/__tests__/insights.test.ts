import { describe, it, expect } from 'vitest';
import { generateInsights } from '../utils/insights';
import type { MonthSummary } from '../types';

const makeSummary = (year: number, month: number, total: number, isDailyTracked = false): MonthSummary => ({
  year, month, total, isDailyTracked, label: `${month}/${year}`,
});

describe('generateInsights', () => {
  it('returns empty array when no data', () => {
    const today = new Date('2026-03-29');
    const insights = generateInsights([], today);
    expect(insights).toHaveLength(0);
  });

  it('generates insights with data', () => {
    const summaries: MonthSummary[] = [
      makeSummary(2025, 1, 100),
      makeSummary(2025, 2, 150),
      makeSummary(2025, 3, 120),
    ];
    const today = new Date('2026-03-29');
    const insights = generateInsights(summaries, today);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('identifies best month insight', () => {
    const summaries: MonthSummary[] = [
      makeSummary(2025, 1, 100),
      makeSummary(2025, 2, 300),
      makeSummary(2025, 3, 150),
    ];
    const today = new Date('2026-03-29');
    const insights = generateInsights(summaries, today);
    const bestInsight = insights.find(i => i.title.includes('Melhor mês'));
    expect(bestInsight).toBeDefined();
    expect(bestInsight?.body).toContain('300');
  });

  it('generates current month projection for daily tracked month', () => {
    const currentSummary: MonthSummary = {
      year: 2026, month: 3, total: 290, isDailyTracked: true,
      label: 'Março/26', daysEntered: 29,
    };
    const summaries: MonthSummary[] = [
      makeSummary(2025, 1, 100),
      currentSummary,
    ];
    const today = new Date('2026-03-29');
    const insights = generateInsights(summaries, today);
    const projection = insights.find(i => i.title.includes('Projeção') || i.title.includes('recorde') || i.title.includes('histórico'));
    expect(projection).toBeDefined();
  });

  it('detects growth trend', () => {
    const summaries: MonthSummary[] = [
      makeSummary(2025, 1, 100),
      makeSummary(2025, 2, 150),
      makeSummary(2025, 3, 200),
    ];
    const today = new Date('2026-03-29');
    const insights = generateInsights(summaries, today);
    const trend = insights.find(i => i.title.toLowerCase().includes('crescimento'));
    expect(trend).toBeDefined();
    expect(trend?.type).toBe('positive');
  });
});
