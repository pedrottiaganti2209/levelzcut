import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { Store, MonthData } from '../../types';
import type { MonthlyStoreSeriesRow, MonthlyChartRange } from '../../lib/networkData';
import { buildMonthlyStoreSeries, MONTHLY_CHART_RANGES } from '../../lib/networkData';

// H26: "Cortes por mês, por loja" — gráfico de barras agrupadas na Visão
// Geral, admin escolhe entre 3/6/12 últimos meses. Paleta categórica de
// cores por loja (identidade, nunca por ranking) validada com o script
// da skill de dataviz contra a cor de fundo real dos cards deste app
// (#111827, bg-gray-900) — 8 checks: banda de luminosidade, piso de
// croma, separação CVD (daltonismo) ≥ 8 ΔE, piso de visão normal ≥ 15 ΔE
// e contraste ≥ 3:1, todos PASS. Ordem fixa, nunca ciclada — se um dia
// existirem mais de 8 lojas, as excedentes entram como "Outras" em vez
// de reciclar uma cor já usada por outra loja.
const STORE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTHER_COLOR = '#6b7280';
const MAX_COLORED_STORES = STORE_COLORS.length;

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-gray-900 border border-yellow-700 rounded p-3 text-sm shadow-xl">
      <p className="text-yellow-400 font-bold mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: entry.color }} />
          {entry.name}: {entry.value.toLocaleString()} cortes
        </p>
      ))}
    </div>
  );
}

interface Props {
  stores: Store[];
  cutsByStore: Record<string, MonthData[]>;
}

export function NetworkMonthlyChart({ stores, cutsByStore }: Props) {
  const [range, setRange] = useState<MonthlyChartRange>(6);

  const visibleStores = stores.slice(0, MAX_COLORED_STORES);
  const overflowStores = stores.slice(MAX_COLORED_STORES);

  const today = new Date();
  const series: MonthlyStoreSeriesRow[] = buildMonthlyStoreSeries(stores, cutsByStore, today, range);

  // Achata `values` (storeId -> total) pro formato que o Recharts espera:
  // uma chave por loja, direto no objeto de cada linha. Acima de 8 lojas,
  // as excedentes somam numa barra "Outras" — nunca reciclam uma cor já
  // usada por outra loja (identidade tem que ser inequívoca).
  const chartData = series.map((row) => {
    const flat: Record<string, string | number> = { month: row.month };
    visibleStores.forEach((store) => {
      flat[store.id] = row.values[store.id] ?? 0;
    });
    if (overflowStores.length > 0) {
      flat._other = overflowStores.reduce((sum, store) => sum + (row.values[store.id] ?? 0), 0);
    }
    return flat;
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <BarChart3 size={14} /> Cortes por mês, por loja
        </h3>
        <div className="flex gap-1 bg-black rounded-lg p-1 border border-gray-800">
          {MONTHLY_CHART_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === r ? 'bg-yellow-600 text-black' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {r} meses
            </button>
          ))}
        </div>
      </div>

      {stores.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma loja cadastrada ainda.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff', fillOpacity: 0.04 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              {visibleStores.map((store, index) => (
                <Bar
                  key={store.id}
                  dataKey={store.id}
                  name={store.displayName}
                  fill={STORE_COLORS[index]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
              {overflowStores.length > 0 && (
                <Bar dataKey="_other" name="Outras" fill={OTHER_COLOR} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
          {overflowStores.length > 0 && (
            <p className="text-xs text-gray-600">
              "Outras" soma {overflowStores.length}{' '}
              {overflowStores.length === 1 ? 'loja' : 'lojas'} — com mais de {MAX_COLORED_STORES} lojas, cada uma
              com sua própria cor deixaria o gráfico ilegível. Use o ranking acima pra ver o detalhe de cada uma.
            </p>
          )}
        </>
      )}
    </div>
  );
}
