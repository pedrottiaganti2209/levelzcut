import { useState, useCallback, useEffect } from 'react';
import type { MonthData, StoreData } from '../types';
import { DATA_START } from '../types';
import { loadStoreData, saveStoreData } from '../utils/storage';
import { getAllMonths, buildSummaries } from '../utils/analytics';

export function useBarberData(storeId: string) {
  const [storeData, setStoreData] = useState<StoreData>(() => loadStoreData(storeId));

  useEffect(() => {
    setStoreData(loadStoreData(storeId));
  }, [storeId]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const allMonths = getAllMonths(DATA_START.year, DATA_START.month, currentYear, currentMonth);

  const summaries = buildSummaries(allMonths, storeData.months);

  const setMonthTotal = useCallback((year: number, month: number, total: number) => {
    const newData = { ...storeData };
    const idx = newData.months.findIndex(m => m.year === year && m.month === month);
    const monthData: MonthData = { year, month, total };
    if (idx >= 0) {
      newData.months = [...newData.months];
      newData.months[idx] = monthData;
    } else {
      newData.months = [...newData.months, monthData];
    }
    setStoreData(newData);
    saveStoreData(newData);
  }, [storeData]);

  const setDailyCuts = useCallback((year: number, month: number, day: number, cuts: number) => {
    const newData = { ...storeData };
    const idx = newData.months.findIndex(m => m.year === year && m.month === month);
    if (idx >= 0) {
      newData.months = [...newData.months];
      const existing = newData.months[idx];
      newData.months[idx] = {
        ...existing,
        dailyCuts: { ...(existing.dailyCuts || {}), [day]: cuts },
        total: undefined,
      };
    } else {
      newData.months = [...newData.months, {
        year, month,
        dailyCuts: { [day]: cuts },
      }];
    }
    setStoreData(newData);
    saveStoreData(newData);
  }, [storeData]);

  return { summaries, storeData, setMonthTotal, setDailyCuts, allMonths, today };
}
