import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { MonthData, Store } from '../types';
import { buildStoreOverviewRows, sortOverviewRows, computeNetworkTotals } from '../lib/networkData';

// H22: Visão Geral consolidada da rede — testa as funções puras de
// agregação/ranking isoladamente (mais direto que montar o componente
// inteiro pra cada cenário de negócio) e faz uma checagem de render pros
// estados de carregamento/vazio.

const TODAY = new Date(2026, 7, 22); // Agosto/2026 (mês 8, index 7)

const MOEMA: Store = { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema', pricePerCut: 50 };
const PINHEIROS: Store = { id: 'pinheiros', name: 'Pinheiros', displayName: 'LevelzCut Pinheiros' }; // sem preço
const VILA: Store = { id: 'vila', name: 'Vila Madalena', displayName: 'LevelzCut Vila Madalena', pricePerCut: 40 };

function months(entries: Array<[number, number, number]>): MonthData[] {
  return entries.map(([year, month, total]) => ({ year, month, total }));
}

describe('buildStoreOverviewRows', () => {
  it('calcula cortes do mês corrente, receita (com preço) e média histórica', () => {
    const cutsByStore = {
      moema: months([
        [2026, 6, 100],
        [2026, 7, 120],
        [2026, 8, 80],
      ]),
    };
    const [row] = buildStoreOverviewRows([MOEMA], cutsByStore, TODAY);
    expect(row.currentMonthCuts).toBe(80);
    expect(row.revenue).toBe(80 * 50);
    expect(row.monthsWithData).toBe(3);
  });

  it('loja sem price_per_cut tem revenue null (nunca 0 como se fosse valor real)', () => {
    const cutsByStore = { pinheiros: months([[2026, 8, 30]]) };
    const [row] = buildStoreOverviewRows([PINHEIROS], cutsByStore, TODAY);
    expect(row.revenue).toBeNull();
    expect(row.currentMonthCuts).toBe(30);
  });

  it('loja recém-criada sem nenhum cuts_data ainda: 0 cortes, sem quebrar', () => {
    const [row] = buildStoreOverviewRows([MOEMA], {}, TODAY);
    expect(row.currentMonthCuts).toBe(0);
    expect(row.revenue).toBe(0);
    expect(row.monthsWithData).toBe(0);
    expect(row.average).toBe(0);
  });

  it('loja sem dado no mês corrente (mas com histórico) não quebra o cálculo', () => {
    const cutsByStore = { moema: months([[2026, 5, 90]]) }; // nada em ago/2026
    const [row] = buildStoreOverviewRows([MOEMA], cutsByStore, TODAY);
    expect(row.currentMonthCuts).toBe(0);
    expect(row.revenue).toBe(0);
    expect(row.monthsWithData).toBe(1);
  });
});

describe('loja em queda (H23)', () => {
  it('≥ 2 meses de histórico e queda de ~25% frente à própria média: marcada', () => {
    // 5 meses anteriores com 100 cortes, mês corrente com 75 — queda real
    // frente à média (que inclui o mês corrente, mesma semântica de
    // getAverage/"Média Mensal" do app de barbeiro).
    const cutsByStore = {
      moema: months([
        [2026, 3, 100],
        [2026, 4, 100],
        [2026, 5, 100],
        [2026, 6, 100],
        [2026, 7, 100],
        [2026, 8, 75],
      ]),
    };
    const [row] = buildStoreOverviewRows([MOEMA], cutsByStore, TODAY);
    expect(row.monthsWithData).toBe(6);
    expect(row.isDeclining).toBe(true);
    expect(row.declinePercent).toBeGreaterThanOrEqual(20);
  });

  it('exatamente 20% abaixo da média: marcada (regra é "≥ 20%", sem oscilar por arredondamento)', () => {
    // 1 mês anterior com 30, mês corrente com 20 → média (30+20)/2 = 25;
    // (25-20)/25 = 0.2 exatamente, em número bruto, não arredondado.
    const cutsByStore = { moema: months([[2026, 7, 30], [2026, 8, 20]]) };
    const [row] = buildStoreOverviewRows([MOEMA], cutsByStore, TODAY);
    expect(row.average).toBe(25);
    expect(row.isDeclining).toBe(true);
    expect(row.declinePercent).toBe(20);
  });

  it('19,6% abaixo da média (menor que 20%): não marcada', () => {
    // 1 mês anterior com 30, mês corrente com 21 → média 25,5;
    // (25,5-21)/25,5 ≈ 17,6% — abaixo do limiar.
    const cutsByStore = { moema: months([[2026, 7, 30], [2026, 8, 21]]) };
    const [row] = buildStoreOverviewRows([MOEMA], cutsByStore, TODAY);
    expect(row.isDeclining).toBe(false);
    expect(row.declinePercent).toBeNull();
  });

  it('loja com só 1 mês de histórico nunca é marcada, mesmo com "queda" de 100% no cálculo bruto', () => {
    // Único mês com dado é um mês passado (200); mês corrente sem
    // lançamento nenhum (0) — sem a checagem de >= 2 meses, isso pareceria
    // uma queda de 100%.
    const cutsByStore = { moema: months([[2026, 5, 200]]) };
    const [row] = buildStoreOverviewRows([MOEMA], cutsByStore, TODAY);
    expect(row.monthsWithData).toBe(1);
    expect(row.isDeclining).toBe(false);
    expect(row.declinePercent).toBeNull();
  });

  it('loja recém-criada sem nenhum histórico nunca é marcada', () => {
    const [row] = buildStoreOverviewRows([MOEMA], {}, TODAY);
    expect(row.isDeclining).toBe(false);
  });

  it('o total de lojas em queda bate com a quantidade de linhas marcadas', () => {
    const cutsByStore = {
      moema: months([[2026, 7, 30], [2026, 8, 20]]), // 20% — em queda
      pinheiros: months([[2026, 7, 30], [2026, 8, 21]]), // ~17,6% — não
      vila: months([[2026, 3, 50], [2026, 8, 20]]), // ~43% — em queda
    };
    const rows = buildStoreOverviewRows([MOEMA, PINHEIROS, VILA], cutsByStore, TODAY);
    const decliningRows = rows.filter((r) => r.isDeclining);
    expect(decliningRows.length).toBe(2);
    expect(decliningRows.map((r) => r.store.id).sort()).toEqual(['moema', 'vila']);
  });
});

describe('sortOverviewRows', () => {
  it('com preços mistos (algumas lojas sem preço), ordena por cortes', () => {
    const rows = buildStoreOverviewRows(
      [MOEMA, PINHEIROS],
      { moema: months([[2026, 8, 80]]), pinheiros: months([[2026, 8, 200]]) },
      TODAY
    );
    const { sortBy, rows: sorted } = sortOverviewRows(rows);
    expect(sortBy).toBe('cuts');
    expect(sorted[0].store.id).toBe('pinheiros'); // 200 cortes > 80
  });

  it('com todas as lojas com preço cadastrado, ordena por faturamento', () => {
    const rows = buildStoreOverviewRows(
      [MOEMA, VILA],
      { moema: months([[2026, 8, 80]]), vila: months([[2026, 8, 150]]) }, // moema: 80*50=4000, vila: 150*40=6000
      TODAY
    );
    const { sortBy, rows: sorted } = sortOverviewRows(rows);
    expect(sortBy).toBe('revenue');
    expect(sorted[0].store.id).toBe('vila');
  });

  it('rede sem nenhuma loja: não quebra, retorna lista vazia', () => {
    const { rows, sortBy } = sortOverviewRows([]);
    expect(rows).toEqual([]);
    expect(sortBy).toBe('cuts');
  });
});

describe('computeNetworkTotals', () => {
  it('soma faturamento só das lojas com preço, cortes de todas', () => {
    const rows = buildStoreOverviewRows(
      [MOEMA, PINHEIROS],
      { moema: months([[2026, 8, 80]]), pinheiros: months([[2026, 8, 30]]) },
      TODAY
    );
    const totals = computeNetworkTotals(rows);
    expect(totals.networkRevenue).toBe(80 * 50); // só moema entra (pinheiros sem preço)
    expect(totals.networkCuts).toBe(110); // 80 + 30
    expect(totals.storesWithPriceCount).toBe(1);
    expect(totals.totalStores).toBe(2);
  });

  it('lojas ativas conta só quem tem corte lançado no mês corrente', () => {
    const rows = buildStoreOverviewRows(
      [MOEMA, PINHEIROS],
      { moema: months([[2026, 8, 80]]) }, // pinheiros sem nenhum dado
      TODAY
    );
    const totals = computeNetworkTotals(rows);
    expect(totals.activeStores).toBe(1);
  });
});

describe('OverviewPanel (render)', () => {
  // O import estático no topo do arquivo (pras funções puras acima) já
  // carrega OverviewPanel.tsx e suas dependências no cache de módulos —
  // sem resetar antes de cada teste aqui, o `vi.doMock` abaixo não pega,
  // porque o `import()` dinâmico devolveria a versão real já em cache.
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.doUnmock('../hooks/useStores');
    vi.doUnmock('../lib/networkData');
    vi.resetModules();
  });

  it('rede sem nenhuma loja cadastrada: mostra mensagem de estado vazio, não tela quebrada', async () => {
    vi.doMock('../hooks/useStores', () => ({
      useStores: () => ({ stores: [], loading: false, reload: vi.fn() }),
    }));
    vi.doMock('../lib/networkData', async () => {
      const actual = await vi.importActual<typeof import('../lib/networkData')>('../lib/networkData');
      return { ...actual, fetchAllCutsData: vi.fn().mockResolvedValue({}) };
    });

    const { OverviewPanel } = await import('../components/Admin/OverviewPanel');
    render(<OverviewPanel />);

    expect(await screen.findByText(/nenhuma loja cadastrada/i)).toBeTruthy();
  });

  it('com lojas, mostra o ranking e os cards de rede', async () => {
    vi.doMock('../hooks/useStores', () => ({
      useStores: () => ({ stores: [MOEMA, PINHEIROS], loading: false, reload: vi.fn() }),
    }));
    vi.doMock('../lib/networkData', async () => {
      const actual = await vi.importActual<typeof import('../lib/networkData')>('../lib/networkData');
      return {
        ...actual,
        fetchAllCutsData: vi.fn().mockResolvedValue({
          moema: months([[2026, 8, 80]]),
          pinheiros: months([[2026, 8, 30]]),
        }),
      };
    });

    const { OverviewPanel } = await import('../components/Admin/OverviewPanel');
    render(<OverviewPanel />);

    expect(await screen.findByText('LevelzCut Moema')).toBeTruthy();
    expect(screen.getByText('LevelzCut Pinheiros')).toBeTruthy();
    expect(screen.getByText(/ordenado por cortes/i)).toBeTruthy();
  });

  it('H23: o número no card "Loja em queda" bate com a quantidade de linhas destacadas no ranking', async () => {
    vi.doMock('../hooks/useStores', () => ({
      useStores: () => ({ stores: [MOEMA, PINHEIROS], loading: false, reload: vi.fn() }),
    }));
    vi.doMock('../lib/networkData', async () => {
      const actual = await vi.importActual<typeof import('../lib/networkData')>('../lib/networkData');
      return {
        ...actual,
        // moema: 30 → 20 = 20% de queda (marcada). pinheiros: 30 → 21 ≈ 17,6% (não marcada).
        fetchAllCutsData: vi.fn().mockResolvedValue({
          moema: months([[2026, 7, 30], [2026, 8, 20]]),
          pinheiros: months([[2026, 7, 30], [2026, 8, 21]]),
        }),
      };
    });

    const { OverviewPanel } = await import('../components/Admin/OverviewPanel');
    render(<OverviewPanel />);

    await screen.findByText('LevelzCut Moema');
    // Card "Loja em queda" mostra 1 (só moema está em queda).
    expect(screen.getByText('Loja em queda').closest('button')?.textContent).toContain('1');
    // Só a linha da Moema tem o ícone/tooltip de queda — Pinheiros não.
    expect(screen.getByTitle(/abaixo da média histórica desta loja/i)).toBeTruthy();
  });
});
