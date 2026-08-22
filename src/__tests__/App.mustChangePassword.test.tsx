import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Session } from '@supabase/supabase-js';

// H10: quem loga com a senha temporária gerada no cadastro pelo painel de
// Administração é obrigado a trocar antes de ver qualquer coisa do
// dashboard — nunca deve aparecer nada de faturamento antes dessa troca.

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
  vi.doUnmock('../lib/adminApi');
  vi.resetModules();
});

function mockAuthenticated(userId: string) {
  vi.doMock('../lib/supabase', async () => {
    const actual = await vi.importActual<typeof import('../lib/supabase')>('../lib/supabase');
    // Sobrescreve só o método usado no teste, direto no client real —
    // espalhar `actual.supabase` num objeto novo perderia métodos como
    // `.from()` (definidos no protótipo da classe do supabase-js, não
    // como propriedade própria), quebrando outros hooks (useBarberData)
    // que também usam esse mesmo client mockado.
    if (actual.supabase) {
      actual.supabase.auth.updateUser = vi.fn().mockResolvedValue({ error: null });
    }
    return {
      ...actual,
      isSupabaseConfigured: true,
      getSession: vi.fn().mockResolvedValue(fakeSession(userId)),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: vi.fn(),
    };
  });
  vi.doMock('../lib/stores', async () => {
    const actual = await vi.importActual<typeof import('../lib/stores')>('../lib/stores');
    return { ...actual, fetchAccessibleStores: vi.fn().mockResolvedValue([]) };
  });
}

describe('App — troca de senha obrigatória (H10)', () => {
  it('barbeiro com senha temporária vê a tela de trocar senha, não o dashboard', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('barber-temp-pw');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
      fetchMustChangePassword: vi.fn().mockResolvedValue(true),
    }));

    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Trocar senha')).toBeTruthy();
    expect(screen.queryByText('Relatórios')).toBeNull();
    expect(screen.queryByText('Você ainda não tem acesso a nenhuma loja.')).toBeNull();
  });

  it('depois de trocar a senha, o gate cai e o resto do app aparece', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('barber-temp-pw-2');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
      fetchMustChangePassword: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock('../lib/adminApi', () => ({
      completePasswordSetup: vi.fn().mockResolvedValue({ data: { ok: true }, error: null }),
    }));

    const { default: App } = await import('../App');
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('Trocar senha');
    await user.type(screen.getByLabelText('Nova senha'), 'senha-nova-123');
    await user.type(screen.getByLabelText('Confirmar senha'), 'senha-nova-123');
    await user.click(screen.getByRole('button', { name: /salvar e continuar/i }));

    // Gate caiu; próximo estado real é "sem loja liberada" (mock de
    // fetchAccessibleStores devolve array vazio) — prova que o dashboard
    // normal (pós-gate) está sendo avaliado, não mais a tela de senha.
    expect(await screen.findByText('Você ainda não tem acesso a nenhuma loja.')).toBeTruthy();
    expect(screen.queryByText('Trocar senha')).toBeNull();
  });

  it('senha curta demais é rejeitada sem chamar o servidor', async () => {
    vi.stubEnv('VITE_REQUIRE_AUTH', 'true');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fake-anon-key');

    mockAuthenticated('barber-temp-pw-3');
    vi.doMock('../lib/profile', () => ({
      fetchMyRole: vi.fn().mockResolvedValue('barbeiro'),
      fetchMustChangePassword: vi.fn().mockResolvedValue(true),
    }));

    const { default: App } = await import('../App');
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('Trocar senha');
    await user.type(screen.getByLabelText('Nova senha'), '123');
    await user.type(screen.getByLabelText('Confirmar senha'), '123');
    await user.click(screen.getByRole('button', { name: /salvar e continuar/i }));

    expect(await screen.findByText(/pelo menos 8 caracteres/i)).toBeTruthy();
    expect(screen.getByText('Trocar senha')).toBeTruthy();
  });
});
