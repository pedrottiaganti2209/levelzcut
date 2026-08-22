import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

// H6–H8: a aba "Administração" só pode aparecer pra quem está autenticado
// (flag VITE_REQUIRE_AUTH ligada) E tem role='admin' em `profiles`. Mocka
// lib/supabase e lib/profile pra não depender de rede real nos testes.

function fakeSession(userId: string): Session {
  return {
    user: { id: userId },
  } as unknown as Session;
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.doUnmock('../lib/supabase');
  vi.doUnmock('../lib/profile');
  vi.resetModules();
});

describe('App — aba de Administração', () => {
  it('nunca aparece com a flag de login desligada (padrão)', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', undefined);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    const { default: App } = await import('../App');
    render(<App />);

    expect(screen.queryByText('Administração')).toBeNull();
  });

  it('aparece pra quem tem role=admin, com a flag ligada', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    vi.doMock('../lib/supabase', async () => {
      const actual = await vi.importActual<typeof import('../lib/supabase')>('../lib/supabase');
      return {
        ...actual,
        isSupabaseConfigured: true,
        getSession: vi.fn().mockResolvedValue(fakeSession('admin-user-1')),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: vi.fn(),
      };
    });
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('admin'),
    }));

    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Administração')).toBeTruthy();
  });

  it('NÃO aparece pra um barbeiro comum, mesmo com a flag ligada e sessão válida', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    vi.doMock('../lib/supabase', async () => {
      const actual = await vi.importActual<typeof import('../lib/supabase')>('../lib/supabase');
      return {
        ...actual,
        isSupabaseConfigured: true,
        getSession: vi.fn().mockResolvedValue(fakeSession('barber-user-1')),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: vi.fn(),
      };
    });
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
    }));

    const { default: App } = await import('../App');
    render(<App />);

    await waitFor(() => expect(screen.getByText('LevelzCut')).toBeTruthy());
    expect(screen.queryByText('Administração')).toBeNull();
  });
});
