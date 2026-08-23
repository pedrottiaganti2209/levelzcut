import { describe, it, expect, afterEach, vi } from 'vitest';
import { slugifyStoreId } from '../lib/stores';

describe('slugifyStoreId', () => {
  it('gera um id em minúsculas sem espaços', () => {
    expect(slugifyStoreId('Pinheiros')).toBe('pinheiros');
  });

  it('remove acentos', () => {
    expect(slugifyStoreId('São Paulo')).toBe('sao-paulo');
  });

  it('troca espaços e caracteres especiais por hífen', () => {
    expect(slugifyStoreId('Vila Madalena / Centro')).toBe('vila-madalena-centro');
  });

  it('remove hífens nas pontas', () => {
    expect(slugifyStoreId('  Moema  ')).toBe('moema');
  });
});

describe('fetchStores — fallback quando Supabase não está configurado', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('retorna o array fixo de lojas quando não há Supabase configurado', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);

    const { fetchStores } = await import('../lib/stores');
    const { STORES } = await import('../types');

    const result = await fetchStores();
    expect(result).toEqual(STORES);
  });
});

describe('fetchAccessibleStores — fallback quando Supabase não está configurado (H9)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('retorna o array fixo de lojas quando não há Supabase configurado', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);

    const { fetchAccessibleStores } = await import('../lib/stores');
    const { STORES } = await import('../types');

    const result = await fetchAccessibleStores('any-user-id');
    expect(result).toEqual(STORES);
  });
});

describe('deleteStore — sem Supabase configurado', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('retorna erro em vez de tentar apagar', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);

    const { deleteStore } = await import('../lib/stores');
    const { error } = await deleteStore('moema');
    expect(error).not.toBeNull();
  });
});

describe('price_per_cut (H21)', () => {
  afterEach(() => {
    vi.doUnmock('../lib/supabase');
    vi.resetModules();
  });

  type MockOverrides = {
    selectResult?: { data: unknown[] | null; error: unknown };
    insert?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
  };

  function mockSupabase(overrides: MockOverrides) {
    const order = vi.fn().mockResolvedValue(overrides.selectResult ?? { data: [], error: null });
    const select = vi.fn(() => ({ order }));
    const insert = overrides.insert ?? vi.fn().mockResolvedValue({ data: null, error: null });
    const update =
      overrides.update ?? vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }));
    const from = vi.fn(() => ({ select, insert, update }));
    vi.doMock('../lib/supabase', () => ({ supabase: { from }, isSupabaseConfigured: true }));
    return { insert, update };
  }

  it('fetchStores mapeia price_per_cut quando presente', async () => {
    mockSupabase({
      selectResult: {
        data: [{ id: 'moema', name: 'Moema', display_name: 'LevelzCut Moema', price_per_cut: 45.5 }],
        error: null,
      },
    });
    const { fetchStores } = await import('../lib/stores');
    const result = await fetchStores();
    expect(result[0].pricePerCut).toBe(45.5);
  });

  it('fetchStores deixa pricePerCut undefined quando a coluna vem null', async () => {
    mockSupabase({
      selectResult: {
        data: [{ id: 'moema', name: 'Moema', display_name: 'LevelzCut Moema', price_per_cut: null }],
        error: null,
      },
    });
    const { fetchStores } = await import('../lib/stores');
    const result = await fetchStores();
    expect(result[0].pricePerCut).toBeUndefined();
  });

  it('fetchStores não lança erro mesmo sem a coluna price_per_cut (migration 007 ainda não rodou)', async () => {
    mockSupabase({
      selectResult: {
        data: [{ id: 'moema', name: 'Moema', display_name: 'LevelzCut Moema' }],
        error: null,
      },
    });
    const { fetchStores } = await import('../lib/stores');
    await expect(fetchStores()).resolves.toEqual([
      { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema', pricePerCut: undefined },
    ]);
  });

  it('createStore inclui price_per_cut no payload quando informado', async () => {
    const { insert } = mockSupabase({});
    const { createStore } = await import('../lib/stores');
    await createStore({ id: 'pinheiros', name: 'Pinheiros', displayName: 'LevelzCut Pinheiros', pricePerCut: 50 });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ price_per_cut: 50 }));
  });

  it('createStore não inclui price_per_cut no payload quando não informado', async () => {
    const { insert } = mockSupabase({});
    const { createStore } = await import('../lib/stores');
    await createStore({ id: 'pinheiros', name: 'Pinheiros', displayName: 'LevelzCut Pinheiros' });
    const payload = insert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('price_per_cut');
  });

  it('updateStore grava price_per_cut, e null limpa o valor', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({ eq }));
    mockSupabase({ update });
    const { updateStore } = await import('../lib/stores');
    await updateStore('pinheiros', { pricePerCut: null });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ price_per_cut: null }));
  });

  it('updateStore não mexe em price_per_cut quando não informado', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({ eq }));
    mockSupabase({ update });
    const { updateStore } = await import('../lib/stores');
    await updateStore('pinheiros', { name: 'Pinheiros Novo' });
    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).not.toHaveProperty('price_per_cut');
  });
});
