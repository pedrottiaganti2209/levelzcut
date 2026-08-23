import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { Store } from '../types';

// H11: AdminApp é o app de administração, publicado separado do app de
// barbeiro (URL própria, bundle próprio — ver vite.config.admin.ts). Login
// é sempre exigido aqui, incondicionalmente — NÃO fica atrás da feature
// flag VITE_REQUIRE_AUTH, porque publicar este app como um serviço à parte
// já É o passo deliberado de ativação. Só quem tem role='admin' passa da
// tela de login pro painel de Lojas/Barbeiros.

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
  vi.doUnmock('../lib/networkData');
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

describe('AdminApp (H11)', () => {
  it('sem sessão, mostra a tela de login — mesmo sem VITE_REQUIRE_AUTH ligada', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', undefined);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    const { default: AdminApp } = await import('../AdminApp');
    render(<AdminApp />);

    expect(await screen.findByLabelText(/senha/i)).toBeTruthy();
  });

  it('barbeiro comum é bloqueado, com uma mensagem clara, e não vê o painel', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('barber-user-1');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
      fetchMustChangePassword: vi.fn().mockResolvedValue(false),
    }));

    const { default: AdminApp } = await import('../AdminApp');
    render(<AdminApp />);

    expect(await screen.findByText('Essa área é só para administradores.')).toBeTruthy();
    expect(screen.queryByText('Lojas')).toBeNull();
    expect(screen.queryByText('Barbeiros')).toBeNull();
  });

  it('admin vê o painel de Lojas e Barbeiros', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('admin-user-1');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('admin'),
      fetchMustChangePassword: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('../lib/stores', async () => {
      const actual = await vi.importActual<typeof import('../lib/stores')>('../lib/stores');
      return { ...actual, fetchStores: vi.fn().mockResolvedValue([MOEMA]) };
    });
    vi.doMock('../lib/networkData', async () => {
      const actual = await vi.importActual<typeof import('../lib/networkData')>('../lib/networkData');
      return { ...actual, fetchAllCutsData: vi.fn().mockResolvedValue({}) };
    });

    const { default: AdminApp } = await import('../AdminApp');
    render(<AdminApp />);

    expect(await screen.findByText('Administração')).toBeTruthy();
    // H22: "Visão Geral" é a aba padrão (landing) ao abrir — aparece duas
    // vezes (aba + título do painel). Lojas/Barbeiros são só as outras
    // abas, sem painel próprio visível ainda, então cada uma é única.
    expect(screen.getAllByText('Visão Geral').length).toBeGreaterThan(0);
    expect(screen.getByText('Lojas')).toBeTruthy();
    expect(screen.getByText('Barbeiros')).toBeTruthy();
  });

  it('sem Supabase configurado, mostra mensagem de configuração em vez de tela quebrada', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);

    const { default: AdminApp } = await import('../AdminApp');
    render(<AdminApp />);

    expect(await screen.findByText(/configure as vari/i)).toBeTruthy();
  });
});
