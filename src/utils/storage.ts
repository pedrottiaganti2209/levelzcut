import type { MonthData, StoreData } from '../types';

const STORAGE_KEY = 'levelzcut_data';

export function loadAllData(): Record<string, StoreData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveAllData(data: Record<string, StoreData>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadStoreData(storeId: string): StoreData {
  const all = loadAllData();
  return all[storeId] || { storeId, months: [] };
}

export function saveStoreData(storeData: StoreData): void {
  const all = loadAllData();
  all[storeData.storeId] = storeData;
  saveAllData(all);
}

export function getMonthData(storeId: string, year: number, month: number): MonthData | undefined {
  const data = loadStoreData(storeId);
  return data.months.find(m => m.year === year && m.month === month);
}

export function setMonthData(storeId: string, monthData: MonthData): void {
  const data = loadStoreData(storeId);
  const idx = data.months.findIndex(m => m.year === monthData.year && m.month === monthData.month);
  if (idx >= 0) {
    data.months[idx] = monthData;
  } else {
    data.months.push(monthData);
  }
  saveStoreData(data);
}
