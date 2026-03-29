export interface Store {
  id: string;
  name: string;
  displayName: string;
}

export interface MonthData {
  year: number;
  month: number; // 1-12
  total?: number; // for historical months (before DAILY_TRACKING_START)
  dailyCuts?: Record<number, number>; // day -> cuts, for current+ months
}

export interface StoreData {
  storeId: string;
  months: MonthData[];
}

export interface MonthSummary {
  year: number;
  month: number;
  label: string;
  total: number;
  isDailyTracked: boolean;
  daysEntered?: number;
}

export const DAILY_TRACKING_START = { year: 2026, month: 3 }; // March 2026
export const DATA_START = { year: 2025, month: 1 }; // January 2025

export const STORES: Store[] = [
  { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema' },
];
