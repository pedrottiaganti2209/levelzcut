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
  // Only include fields that are explicitly defined so PostgREST's partial upsert
  // won't overwrite existing columns on conflict (e.g. don't null out daily_cuts
  // when saving only a monthly total, and vice-versa).
  const payload: Record<string, unknown> = {
    store_id: storeId,
    year: monthData.year,
    month: monthData.month,
    updated_at: new Date().toISOString(),
  };
  if (monthData.total !== undefined) payload.total = monthData.total;
  if (monthData.dailyCuts !== undefined) payload.daily_cuts = monthData.dailyCuts;

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

/** Merge two MonthData records: only overwrite a field when the update explicitly provides it. */
function mergeMonthData(existing: MonthData, update: MonthData): MonthData {
  const merged: MonthData = { year: update.year, month: update.month };
  const total = update.total !== undefined ? update.total : existing.total;
  const dailyCuts = update.dailyCuts !== undefined ? update.dailyCuts : existing.dailyCuts;
  if (total !== undefined) merged.total = total;
  if (dailyCuts !== undefined) merged.dailyCuts = dailyCuts;
  return merged;
}

export async function setMonthData(storeId: string, monthData: MonthData): Promise<void> {
  // Always update local
  const all = loadAllDataLocal();
  const storeData = all[storeId] || { storeId, months: [] };
  const idx = storeData.months.findIndex(m => m.year === monthData.year && m.month === monthData.month);
  if (idx >= 0) {
    // Merge: don't wipe a field just because the update doesn't include it
    storeData.months[idx] = mergeMonthData(storeData.months[idx], monthData);
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
