import { useState, useCallback, useEffect } from 'react';
import type { MonthData, StoreData } from '../types';
import { DATA_START } from '../types';
import { loadStoreDataAsync, setMonthData as setMonthDataStorage } from '../utils/storage';
import { getAllMonths, buildSummaries } from '../utils/analytics';
import { isSupabaseConfigured } from '../lib/supabase';

export function useBarberData(storeId: string) {
  const [storeData, setStoreData] = useState<StoreData>({ storeId, months: [] });
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await loadStoreDataAsync(storeId);
    setStoreData(data);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allMonths = getAllMonths(DATA_START.year, DATA_START.month, currentYear, currentMonth);
  const summaries = buildSummaries(allMonths, storeData.months);

  const setMonthTotal = useCallback(async (year: number, month: number, total: number) => {
    // Only pass total — storage layer merges, preserving any existing dailyCuts
    const monthData: MonthData = { year, month, total };
    await setMonthDataStorage(storeId, monthData);
    setStoreData(prev => {
      const months = [...prev.months];
      const idx = months.findIndex(m => m.year === year && m.month === month);
      if (idx >= 0) {
        months[idx] = { ...months[idx], total }; // preserve dailyCuts
      } else {
        months.push(monthData);
      }
      return { ...prev, months };
    });
  }, [storeId]);

  const setDailyCuts = useCallback(async (year: number, month: number, day: number, cuts: number) => {
    setStoreData(prev => {
      const months = [...prev.months];
      const idx = months.findIndex(m => m.year === year && m.month === month);
      let updatedMonthData: MonthData;
      if (idx >= 0) {
        updatedMonthData = {
          ...months[idx],
          dailyCuts: { ...(months[idx].dailyCuts || {}), [day]: cuts },
          // Do NOT clear total: if a consolidated monthly total exists it stays
          // as the source of truth; daily entries are supplementary detail.
        };
        months[idx] = updatedMonthData;
      } else {
        updatedMonthData = { year, month, dailyCuts: { [day]: cuts } };
        months.push(updatedMonthData);
      }
      // async save
      setMonthDataStorage(storeId, updatedMonthData);
      return { ...prev, months };
    });
  }, [storeId]);

  return { summaries, storeData, setMonthTotal, setDailyCuts, allMonths, today, loading, isSupabaseConfigured, refreshData: loadData };
}
