import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAllData, loadStoreData, saveStoreData, getMonthData, setMonthData } from '../utils/storage';
import type { StoreData } from '../types';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => { mockStorage[k] = v; },
    removeItem: (k: string) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  });
});

describe('loadAllData', () => {
  it('returns empty object when no data', () => {
    expect(loadAllData()).toEqual({});
  });

  it('returns parsed data', () => {
    mockStorage['levelzcut_data'] = JSON.stringify({ moema: { storeId: 'moema', months: [] } });
    expect(loadAllData()).toEqual({ moema: { storeId: 'moema', months: [] } });
  });
});

describe('loadStoreData', () => {
  it('returns empty store data when not found', () => {
    const data = loadStoreData('moema');
    expect(data).toEqual({ storeId: 'moema', months: [] });
  });
});

describe('saveStoreData / loadStoreData', () => {
  it('saves and loads correctly', () => {
    const store: StoreData = { storeId: 'moema', months: [{ year: 2025, month: 1, total: 100 }] };
    saveStoreData(store);
    const loaded = loadStoreData('moema');
    expect(loaded).toEqual(store);
  });
});

describe('setMonthData / getMonthData', () => {
  it('sets and gets month data', () => {
    setMonthData('moema', { year: 2025, month: 3, total: 75 });
    const data = getMonthData('moema', 2025, 3);
    expect(data).toEqual({ year: 2025, month: 3, total: 75 });
  });

  it('updates existing month data', () => {
    setMonthData('moema', { year: 2025, month: 3, total: 75 });
    setMonthData('moema', { year: 2025, month: 3, total: 90 });
    const data = getMonthData('moema', 2025, 3);
    expect(data?.total).toBe(90);
  });

  it('returns undefined for non-existent month', () => {
    expect(getMonthData('moema', 2025, 6)).toBeUndefined();
  });
});
