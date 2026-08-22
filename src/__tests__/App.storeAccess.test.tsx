import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { Store } from '../types';

// H9: cuts_data passa a ser restrito por loja via barber_stores. O seletor
// de loja no topo do app precisa refletir isso — um barbeiro só pode ver
// as lojas que tiver liberadas, e não deve sobrar uma tela vazia/quebrada
// quando ele ainda não tem nenhuma.

function fakeSession(userId: string): Session {
  return {
    user: { id: userId },
  } as unknown as Session;
}

const VILA: Store = { id: 'vila-madalena', name: 'Vila Madalena', displayName: 'LevelzCut Vila Madalena' };
const MOEMA: Store = { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema' };

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.doUnmock('../lib/supabase');
  vi.doUnmock('../lib/profile');
  vi.doUnmock('../lib/stores');
  vi.resetModules();
});

function mockAuthenticated(userId: string) {
  vi.doMock('../lib/supabase', async () => {
    const actual = await vi.importActual<typeof import('../lib/supabase')>('../lib/supabase');
    return {
      ...actual,
      isSupabaseConfigured: true,
      getSession: vi.fn().mockResolvedValue(fakeSession(userId)),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: vi.fn(),
    };
  });
}

describe('App — acesso a lojas por barbeiro (H9)', () => {
  it('barbeiro sem nenhuma loja liberada vê um aviso, não o dashboard vazio', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('barber-sem-acesso');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
    }));
    vi.doMock('../lib/stores', async () => {
      const actual = await vi.importActual<typeof import('../lib/stores')>('../lib/stores');
      return { ...actual, fetchAccessibleStores: vi.fn().mockResolvedValue([]) };
    });

    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Você ainda não tem acesso a nenhuma loja.')).toBeTruthy();
    expect(screen.queryByText('Administração')).toBeNull();
    expect(screen.queryByText('Relatórios')).toBeNull();
  });

  it('barbeiro com uma loja liberada só vê essa loja no seletor', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('barber-vila');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
    }));
    vi.doMock('../lib/stores', async () => {
      const actual = await vi.importActual<typeof import('../lib/stores')>('../lib/stores');
      return { ...actual, fetchAccessibleStores: vi.fn().mockResolvedValue([VILA]) };
    });

    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('LevelzCut Vila Madalena')).toBeTruthy();
    expect(screen.queryByText('LevelzCut Moema')).toBeNull();
    expect(screen.queryByText('Administração')).toBeNull();
    expect(screen.queryByText('Você ainda não tem acesso a nenhuma loja.')).toBeNull();
  });

  it('admin continua vendo todas as lojas, não só as próprias', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('admin-user');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('admin'),
    }));
    vi.doMock('../lib/stores', async () => {
      const actual = await vi.importActual<typeof import('../lib/stores')>('../lib/stores');
      return { ...actual, fetchStores: vi.fn().mockResolvedValue([MOEMA, VILA]) };
    });

    const { default: App } = await import('../App');
    render(<App />);

    await waitFor(() => expect(screen.getByText('LevelzCut Moema')).toBeTruthy());
    expect(screen.getByText('LevelzCut Vila Madalena')).toBeTruthy();
    expect(await screen.findByText('Administração')).toBeTruthy();
  });
});
