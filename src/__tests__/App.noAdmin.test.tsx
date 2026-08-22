import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { Store } from '../types';

// H11: administração virou um app à parte, publicado separado (ver
// src/AdminApp.tsx e vite.config.admin.ts) — o app de barbeiro (App.tsx)
// não importa mais nenhum código de Lojas/Barbeiros e não deve mostrar nada
// relacionado a isso em nenhuma circunstância, nem pra quem loga com
// role='admin'. Antes do H11 essa era a regra "a aba só aparece pra
// admin"; agora é "a aba não existe mais aqui, ponto".

const MOEMA: Store = { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema' };

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
  vi.doUnmock('../lib/stores');
  vi.resetModules();
});

describe('App — sem administração (H11)', () => {
  it('nunca mostra nada de administração, mesmo pra quem tem role=admin', async () => {
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
      fetchMustChangePassword: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('../lib/stores', async () => {
      const actual = await vi.importActual<typeof import('../lib/stores')>('../lib/stores');
      return { ...actual, fetchStores: vi.fn().mockResolvedValue([MOEMA]) };
    });

    const { default: App } = await import('../App');
    render(<App />);

    // Espera especificamente pela aba "Relatórios" (só existe no estado
    // final, depois do papel resolvido) — esperar só por "LevelzCut" seria
    // ambíguo: esse texto já aparece numa renderização intermediária, antes
    // do papel (admin/barbeiro) terminar de resolver.
    expect(await screen.findByText('Relatórios')).toBeTruthy();
    expect(screen.queryByText('Administração')).toBeNull();
    expect(screen.queryByText('Cadastrar barbeiro')).toBeNull();
    expect(screen.queryByText('Lojas')).toBeNull();
  });

  it('com a flag de login desligada, comportamento continua idêntico ao de sempre', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', undefined);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    const { default: App } = await import('../App');
    render(<App />);

    expect(screen.queryByText('Administração')).toBeNull();
    expect(screen.getByText('Relatórios')).toBeTruthy();
  });
});
