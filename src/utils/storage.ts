import type { MonthData, StoreData } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = 'levelzcut_data';

// ─── localStorage helpers (fallback) ───────────────────────────────────────

export function loadAllDataLocal(): Record<string, StoreData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveAllDataLocal(data: Record<string, StoreData>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadStoreDataLocal(storeId: string): StoreData {
  const all = loadAllDataLocal();
  return all[storeId] || { storeId, months: [] };
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

export async function loadStoreDataRemote(storeId: string): Promise<StoreData> {
  if (!supabase) return { storeId, months: [] };
  const { data, error } = await supabase
    .from('cuts_data')
    .select('*')
    .eq('store_id', storeId);
  if (error) {
    console.error('Supabase load error:', error);
    return { storeId, months: [] };
  }
  const months: MonthData[] = (data || []).map((row: any) => ({
    year: row.year,
    month: row.month,
    total: row.total ?? undefined,
    dailyCuts: row.daily_cuts ?? undefined,
  }));
  return { storeId, months };
}

export async function saveMonthDataRemote(storeId: string, monthData: MonthData): Promise<void> {
  if (!supabase) return;
  const payload = {
    store_id: storeId,
    year: monthData.year,
    month: monthData.month,
    total: monthData.total ?? null,
    daily_cuts: monthData.dailyCuts ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('cuts_data')
    .upsert(payload, { onConflict: 'store_id,year,month' });
  if (error) console.error('Supabase save error:', error);
}

// ─── Unified API ─────────────────────────────────────────────────────────────

export function loadStoreData(storeId: string): StoreData {
  return loadStoreDataLocal(storeId);
}

export async function loadStoreDataAsync(storeId: string): Promise<StoreData> {
  if (isSupabaseConfigured) {
    return loadStoreDataRemote(storeId);
  }
  return loadStoreDataLocal(storeId);
}

export async function setMonthData(storeId: string, monthData: MonthData): Promise<void> {
  // Always update local
  const all = loadAllDataLocal();
  const storeData = all[storeId] || { storeId, months: [] };
  const idx = storeData.months.findIndex(m => m.year === monthData.year && m.month === monthData.month);
  if (idx >= 0) {
    storeData.months[idx] = monthData;
  } else {
    storeData.months.push(monthData);
  }
  all[storeId] = storeData;
  saveAllDataLocal(all);

  // Also save to Supabase if configured
  if (isSupabaseConfigured) {
    await saveMonthDataRemote(storeId, monthData);
  }
}

export function getMonthData(storeId: string, year: number, month: number): MonthData | undefined {
  const data = loadStoreData(storeId);
  return data.months.find(m => m.year === year && m.month === month);
}

// Keep old sync exports for backward compat with tests
export function saveStoreData(storeData: StoreData): void {
  const all = loadAllDataLocal();
  all[storeData.storeId] = storeData;
  saveAllDataLocal(all);
}

export function loadAllData(): Record<string, StoreData> {
  return loadAllDataLocal();
}

export function saveAllData(data: Record<string, StoreData>): void {
  saveAllDataLocal(data);
}
