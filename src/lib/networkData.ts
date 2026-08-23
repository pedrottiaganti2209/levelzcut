import { supabase } from './supabase';
import { reportError } from './sentry';
import type { MonthData, Store } from '../types';
import { DATA_START } from '../types';
import { getAllMonths, buildSummaries, getAverage } from '../utils/analytics';

// H22: dados e cálculos de faturamento consolidados de TODAS as lojas,
// pra Visão Geral do app de administração. Só usado pelo AdminApp — nunca
// importado pelo App.tsx do app de barbeiro, que sempre carrega uma loja
// por vez (ver loadStoreDataRemote em utils/storage.ts). A policy de RLS
// de cuts_data já permite essa leitura sem filtro pra quem é admin
// (is_admin(auth.uid()) na policy da migration 004), não precisa de
// nenhuma policy nova.
//
// As funções puras de agregação/ranking vivem aqui (não em
// OverviewPanel.tsx) por causa da regra do react-refresh: um arquivo de
// componente só pode exportar componentes. H23 estende os cálculos daqui
// (limiar de "loja em queda"), sem precisar criar nenhum arquivo novo.

type CutsDataRow = {
  store_id: string;
  year: number;
  month: number;
  total: number | null;
  daily_cuts: Record<number, number> | null;
};

export async function fetchAllCutsData(): Promise<Record<string, MonthData[]>> {
  if (!supabase) return {};

  const { data, error } = await supabase.from('cuts_data').select('*');
  if (error) {
    reportError(error, 'networkData.fetchAllCutsData');
    return {};
  }

  const result: Record<string, MonthData[]> = {};
  (data as CutsDataRow[] | null ?? []).forEach((row) => {
    const monthData: MonthData = {
      year: row.year,
      month: row.month,
      total: row.total ?? undefined,
      dailyCuts: row.daily_cuts ?? undefined,
    };
    if (!result[row.store_id]) result[row.store_id] = [];
    result[row.store_id].push(monthData);
  });
  return result;
}

export interface StoreOverviewRow {
  store: Store;
  currentMonthCuts: number;
  /** null = loja sem price_per_cut cadastrado (nunca 0 como se fosse um valor real). */
  revenue: number | null;
  average: number;
  monthsWithData: number;
}

/**
 * Uma linha por loja: cortes do mês corrente, receita (se a loja tem
 * price_per_cut) e média histórica — reaproveita getAverage de
 * utils/analytics.ts, a MESMA função do card "Média Mensal" do app de
 * barbeiro (mesma semântica: inclui o mês corrente na média quando ele já
 * tem dado lançado).
 */
export function buildStoreOverviewRows(
  stores: Store[],
  cutsByStore: Record<string, MonthData[]>,
  today: Date
): StoreOverviewRow[] {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const allMonths = getAllMonths(DATA_START.year, DATA_START.month, currentYear, currentMonth);

  return stores.map((store) => {
    const storeMonths = cutsByStore[store.id] ?? [];
    const summaries = buildSummaries(allMonths, storeMonths);
    const currentSummary = summaries.find((s) => s.year === currentYear && s.month === currentMonth);
    const currentMonthCuts = currentSummary?.total ?? 0;
    const average = getAverage(summaries);
    const monthsWithData = summaries.filter((s) => s.total > 0).length;
    const revenue = store.pricePerCut !== undefined ? currentMonthCuts * store.pricePerCut : null;
    return { store, currentMonthCuts, revenue, average, monthsWithData };
  });
}

export type OverviewSortBy = 'revenue' | 'cuts';

/** Ordena por faturamento só se TODAS as lojas visíveis tiverem preço cadastrado; senão, por cortes. */
export function sortOverviewRows(rows: StoreOverviewRow[]): { rows: StoreOverviewRow[]; sortBy: OverviewSortBy } {
  const sortBy: OverviewSortBy = rows.length > 0 && rows.every((r) => r.revenue !== null) ? 'revenue' : 'cuts';
  const sorted = [...rows].sort((a, b) =>
    sortBy === 'revenue' ? (b.revenue ?? 0) - (a.revenue ?? 0) : b.currentMonthCuts - a.currentMonthCuts
  );
  return { rows: sorted, sortBy };
}

export function computeNetworkTotals(rows: StoreOverviewRow[]) {
  const networkCuts = rows.reduce((sum, r) => sum + r.currentMonthCuts, 0);
  const rowsWithPrice = rows.filter((r) => r.revenue !== null);
  const networkRevenue = rowsWithPrice.reduce((sum, r) => sum + (r.revenue ?? 0), 0);
  const activeStores = rows.filter((r) => r.currentMonthCuts > 0).length;
  return {
    networkCuts,
    networkRevenue,
    storesWithPriceCount: rowsWithPrice.length,
    totalStores: rows.length,
    activeStores,
  };
}
