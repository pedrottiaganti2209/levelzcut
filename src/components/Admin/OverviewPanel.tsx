import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutGrid, RefreshCw, DollarSign, Scissors, Store as StoreIcon, AlertTriangle } from 'lucide-react';
import { useStores } from '../../hooks/useStores';
import { fetchAllCutsData, buildStoreOverviewRows, sortOverviewRows, computeNetworkTotals } from '../../lib/networkData';
import type { MonthData } from '../../types';

// H22: consolida faturamento/cortes de TODAS as lojas numa tela só —
// hoje o dono de uma rede precisaria abrir o app de barbeiro loja por
// loja pra ter essa visão. Não toca em nenhum arquivo do app de
// barbeiro. Os cálculos puros (ranking, totais de rede, sinal de queda
// do H23) vivem em lib/networkData.ts — este arquivo só exporta o
// componente (regra do react-refresh).
//
// H23: destaque visual pra loja ≥20% abaixo da própria média histórica
// (row.isDeclining, calculado em networkData.ts). Só informativo — nunca
// esconde nem bloqueia a loja do ranking.

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OverviewPanel() {
  const { stores, loading: storesLoading } = useStores();
  const [cutsByStore, setCutsByStore] = useState<Record<string, MonthData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rankingRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCutsData();
      setCutsByStore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados da rede.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const today = new Date();
  const allRows = buildStoreOverviewRows(stores, cutsByStore, today);
  const { rows, sortBy } = sortOverviewRows(allRows);
  const totals = computeNetworkTotals(allRows);
  const decliningCount = allRows.filter((r) => r.isDeclining).length;

  const isLoading = storesLoading || loading;

  const scrollToRanking = () => {
    rankingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <LayoutGrid size={16} /> Visão Geral
        </h2>
        <button onClick={reload} className="text-gray-400 hover:text-yellow-500 transition-colors" title="Atualizar">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      {!isLoading && stores.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center text-sm text-gray-400">
          Nenhuma loja cadastrada ainda. Cadastre uma loja na aba "Lojas" pra ver os números da rede aqui.
        </div>
      )}

      {(isLoading || stores.length > 0) && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-1">
                <DollarSign size={14} /> Faturamento da rede
              </div>
              <div className="text-xl font-bold text-yellow-500">{formatCurrency(totals.networkRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {totals.storesWithPriceCount} de {totals.totalStores} lojas com preço cadastrado
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-1">
                <Scissors size={14} /> Cortes da rede
              </div>
              <div className="text-xl font-bold text-white">{totals.networkCuts.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">mês corrente</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-1">
                <StoreIcon size={14} /> Lojas ativas
              </div>
              <div className="text-xl font-bold text-white">
                {totals.activeStores} / {totals.totalStores}
              </div>
              <div className="text-xs text-gray-500 mt-1">com corte lançado este mês</div>
            </div>
            <button
              type="button"
              onClick={scrollToRanking}
              disabled={decliningCount === 0}
              className={`bg-gray-900 border rounded-lg p-4 text-left transition-colors ${
                decliningCount > 0
                  ? 'border-red-800 hover:border-red-600 cursor-pointer'
                  : 'border-gray-800 cursor-default'
              }`}
            >
              <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-1">
                <AlertTriangle size={14} /> Loja em queda
              </div>
              <div className={`text-xl font-bold ${decliningCount > 0 ? 'text-red-500' : 'text-white'}`}>
                {decliningCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {decliningCount > 0 ? '≥20% abaixo da própria média — ver no ranking' : 'nenhuma loja em queda'}
              </div>
            </button>
          </div>

          <div ref={rankingRef} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider">Ranking de lojas</h3>
              {sortBy === 'cuts' && rows.length > 0 && (
                <span className="text-xs text-gray-500">
                  ordenado por cortes — cadastre o preço de todas as lojas para ordenar por faturamento
                </span>
              )}
            </div>

            {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

            {!isLoading && rows.length > 0 && (
              <div className="space-y-2">
                {rows.map((row, index) => {
                  const maxValue = sortBy === 'revenue' ? rows[0].revenue ?? 0 : rows[0].currentMonthCuts;
                  const value = sortBy === 'revenue' ? row.revenue ?? 0 : row.currentMonthCuts;
                  const barWidth = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
                  const declineTitle = row.isDeclining
                    ? `${row.declinePercent}% abaixo da média histórica desta loja (${row.currentMonthCuts} cortes; média de ${row.average})`
                    : undefined;
                  return (
                    <div
                      key={row.store.id}
                      className={`space-y-1 rounded-md ${
                        row.isDeclining ? 'border border-red-800 bg-red-900/10 p-2' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300 flex items-center">
                          <span className="text-gray-600 mr-2">{index + 1}º</span>
                          <span>{row.store.displayName}</span>
                          {row.isDeclining && (
                            <span title={declineTitle} className="ml-2 text-red-500 cursor-help">
                              <AlertTriangle size={13} />
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400">
                          {row.revenue !== null ? formatCurrency(row.revenue) : '—'} ·{' '}
                          {row.currentMonthCuts.toLocaleString()} cortes
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.isDeclining ? 'bg-red-600' : 'bg-yellow-600'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
