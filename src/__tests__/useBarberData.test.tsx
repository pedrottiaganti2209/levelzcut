import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBarberData } from '../hooks/useBarberData';

// Cobertura do hook principal do app (antes com 0 testes). Foco especial no
// cenário crítico de negócio: salvar o total mensal consolidado NÃO pode
// apagar os lançamentos diários (dailyCuts) que já foram feitos naquele
// mês, e vice-versa — são fontes complementares, não substitutas.

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mockStorage[k] ?? null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = v;
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  });
});

describe('useBarberData', () => {
  it('inicia com loading=true e termina com loading=false e sem meses', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.storeData.months).toEqual([]);
  });

  it('salva o total mensal e reflete no estado', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMonthTotal(2026, 3, 5000);
    });

    const month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 3);
    expect(month?.total).toBe(5000);
  });

  it('salva um lançamento diário e reflete no estado', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setDailyCuts(2026, 3, 10, 12);
    });

    const month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 3);
    expect(month?.dailyCuts).toEqual({ 10: 12 });
  });

  it('CRÍTICO: salvar o total mensal não apaga dailyCuts já lançados (merge parcial)', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Lança cortes diários primeiro, ao longo do mês
    await act(async () => {
      await result.current.setDailyCuts(2026, 3, 5, 8);
    });
    await act(async () => {
      await result.current.setDailyCuts(2026, 3, 6, 10);
    });

    let month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 3);
    expect(month?.dailyCuts).toEqual({ 5: 8, 6: 10 });

    // No fim do mês, lança o total consolidado
    await act(async () => {
      await result.current.setMonthTotal(2026, 3, 4500);
    });

    month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 3);
    expect(month?.total).toBe(4500);
    expect(month?.dailyCuts).toEqual({ 5: 8, 6: 10 }); // não apagado
  });

  it('CRÍTICO: lançar um dailyCut novo não apaga o total mensal já salvo', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMonthTotal(2026, 4, 6000);
    });
    await act(async () => {
      await result.current.setDailyCuts(2026, 4, 1, 15);
    });

    const month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 4);
    expect(month?.total).toBe(6000); // preservado
    expect(month?.dailyCuts).toEqual({ 1: 15 });
  });

  it('CRÍTICO: um novo dailyCut não apaga dailyCuts de outros dias já lançados', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setDailyCuts(2026, 5, 1, 4);
    });
    await act(async () => {
      await result.current.setDailyCuts(2026, 5, 2, 7);
    });

    const month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 5);
    expect(month?.dailyCuts).toEqual({ 1: 4, 2: 7 });
  });

  it('persiste no localStorage e recarrega corretamente num novo mount (ex.: refresh da página)', async () => {
    const { result, unmount } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setDailyCuts(2026, 3, 1, 20);
    });
    await act(async () => {
      await result.current.setMonthTotal(2026, 3, 3000);
    });
    unmount();

    const { result: reloaded } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(reloaded.current.loading).toBe(false));

    const month = reloaded.current.storeData.months.find((m) => m.year === 2026 && m.month === 3);
    expect(month?.total).toBe(3000);
    expect(month?.dailyCuts).toEqual({ 1: 20 });
  });

  it('isola dados entre lojas diferentes', async () => {
    const { result: storeA } = renderHook(() => useBarberData('store-a'));
    await waitFor(() => expect(storeA.current.loading).toBe(false));
    await act(async () => {
      await storeA.current.setMonthTotal(2026, 3, 1000);
    });

    const { result: storeB } = renderHook(() => useBarberData('store-b'));
    await waitFor(() => expect(storeB.current.loading).toBe(false));

    expect(storeB.current.storeData.months).toEqual([]);
    const monthA = storeA.current.storeData.months.find((m) => m.year === 2026 && m.month === 3);
    expect(monthA?.total).toBe(1000);
  });

  it('refreshData recarrega os dados do storage', async () => {
    const { result } = renderHook(() => useBarberData('store-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setMonthTotal(2026, 6, 2500);
    });

    await act(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    const month = result.current.storeData.months.find((m) => m.year === 2026 && m.month === 6);
    expect(month?.total).toBe(2500);
  });
});
