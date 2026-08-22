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
