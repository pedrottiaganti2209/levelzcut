import { describe, it, expect } from 'vitest';
import {
  getMonthTotal,
  getMonthLabel,
  getAllMonths,
  getBestMonth,
  getWorstMonth,
  getAverage,
  getTotalCuts,
  isBeforeDailyTracking,
} from '../utils/analytics';
import type { MonthData } from '../types';

describe('getMonthTotal', () => {
  it('returns 0 for undefined', () => {
    expect(getMonthTotal(undefined)).toBe(0);
  });

  it('returns total field when set', () => {
    const m: MonthData = { year: 2025, month: 1, total: 150 };
    expect(getMonthTotal(m)).toBe(150);
  });

  it('sums daily cuts', () => {
    const m: MonthData = { year: 2026, month: 3, dailyCuts: { 1: 10, 2: 15, 3: 8 } };
    expect(getMonthTotal(m)).toBe(33);
  });

  it('returns 0 for empty dailyCuts', () => {
    const m: MonthData = { year: 2026, month: 3, dailyCuts: {} };
    expect(getMonthTotal(m)).toBe(0);
  });
});

describe('getMonthLabel', () => {
  it('formats January 2025 correctly', () => {
    expect(getMonthLabel(2025, 1)).toBe('Janeiro/25');
  });

  it('formats March 2026 correctly', () => {
    expect(getMonthLabel(2026, 3)).toBe('Março/26');
  });
});

describe('getAllMonths', () => {
  it('returns single month range', () => {
    const months = getAllMonths(2025, 1, 2025, 1);
    expect(months).toHaveLength(1);
    expect(months[0]).toEqual({ year: 2025, month: 1 });
  });

  it('crosses year boundary', () => {
    const months = getAllMonths(2025, 11, 2026, 2);
    expect(months).toHaveLength(4);
    expect(months[0]).toEqual({ year: 2025, month: 11 });
    expect(months[3]).toEqual({ year: 2026, month: 2 });
  });
});

describe('getBestMonth / getWorstMonth', () => {
  const summaries = [
    { year: 2025, month: 1, label: 'Janeiro/25', total: 100, isDailyTracked: false },
    { year: 2025, month: 2, label: 'Fevereiro/25', total: 200, isDailyTracked: false },
    { year: 2025, month: 3, label: 'Março/25', total: 50, isDailyTracked: false },
  ];

  it('finds best month', () => {
    expect(getBestMonth(summaries)?.total).toBe(200);
  });

  it('finds worst month', () => {
    expect(getWorstMonth(summaries)?.total).toBe(50);
  });

  it('returns null for empty list', () => {
    expect(getBestMonth([])).toBeNull();
    expect(getWorstMonth([])).toBeNull();
  });

  it('ignores months with 0 cuts', () => {
    const s = [{ year: 2025, month: 1, label: 'Jan/25', total: 0, isDailyTracked: false }];
    expect(getBestMonth(s)).toBeNull();
  });
});

describe('getAverage', () => {
  it('calculates average correctly', () => {
    const s = [
      { year: 2025, month: 1, label: 'Jan/25', total: 100, isDailyTracked: false },
      { year: 2025, month: 2, label: 'Fev/25', total: 200, isDailyTracked: false },
    ];
    expect(getAverage(s)).toBe(150);
  });

  it('ignores months with 0 cuts', () => {
    const s = [
      { year: 2025, month: 1, label: 'Jan/25', total: 0, isDailyTracked: false },
      { year: 2025, month: 2, label: 'Fev/25', total: 200, isDailyTracked: false },
    ];
    expect(getAverage(s)).toBe(200);
  });

  it('returns 0 for empty', () => {
    expect(getAverage([])).toBe(0);
  });
});

describe('getTotalCuts', () => {
  it('sums all cuts', () => {
    const s = [
      { year: 2025, month: 1, label: 'Jan/25', total: 100, isDailyTracked: false },
      { year: 2025, month: 2, label: 'Fev/25', total: 200, isDailyTracked: false },
    ];
    expect(getTotalCuts(s)).toBe(300);
  });
});

describe('isBeforeDailyTracking', () => {
  it('returns true for Jan 2025', () => {
    expect(isBeforeDailyTracking(2025, 1)).toBe(true);
  });

  it('returns true for Feb 2026', () => {
    expect(isBeforeDailyTracking(2026, 2)).toBe(true);
  });

  it('returns false for Mar 2026', () => {
    expect(isBeforeDailyTracking(2026, 3)).toBe(false);
  });

  it('returns false for Apr 2026', () => {
    expect(isBeforeDailyTracking(2026, 4)).toBe(false);
  });
});
