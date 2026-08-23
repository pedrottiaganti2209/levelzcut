import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Store } from '../types';
import type { Barber } from '../lib/adminApi';

// H24: busca por email no painel de Barbeiros — filtro client-side sobre a
// lista que listBarbers() já buscou, sem chamada nova ao Supabase.

const MOEMA: Store = { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema' };
const PINHEIROS: Store = { id: 'pinheiros', name: 'Pinheiros', displayName: 'LevelzCut Pinheiros' };

const JOAO: Barber = { userId: 'user-1', email: 'joao@levelzcut.com', role: 'barbeiro', storeIds: ['moema'] };
const MARIA: Barber = { userId: 'user-2', email: 'maria@levelzcut.com', role: 'barbeiro', storeIds: [] };

afterEach(() => {
  cleanup();
  vi.doUnmock('../hooks/useStores');
  vi.doUnmock('../lib/adminApi');
  vi.resetModules();
});

async function renderBarbersPanel(overrides: Partial<Record<keyof typeof import('../lib/adminApi'), unknown>> = {}) {
  vi.doMock('../hooks/useStores', () => ({
    useStores: () => ({ stores: [MOEMA, PINHEIROS], loading: false, reload: vi.fn() }),
  }));
  vi.doMock('../lib/adminApi', async () => {
    const actual = await vi.importActual<typeof import('../lib/adminApi')>('../lib/adminApi');
    return {
      ...actual,
      listBarbers: vi.fn().mockResolvedValue({ data: [JOAO, MARIA], error: null }),
      ...overrides,
    };
  });
  const { BarbersPanel } = await import('../components/Admin/BarbersPanel');
  render(<BarbersPanel />);
  await screen.findByText('joao@levelzcut.com');
}

describe('BarbersPanel — busca por email (H24)', () => {
  it('sem digitar nada, mostra a lista completa (comportamento idêntico ao de hoje)', async () => {
    await renderBarbersPanel();
    expect(screen.getByText('joao@levelzcut.com')).toBeTruthy();
    expect(screen.getByText('maria@levelzcut.com')).toBeTruthy();
  });

  it('filtra por parte do email, case-insensitive', async () => {
    await renderBarbersPanel();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/buscar barbeiro/i), 'JOAO');

    expect(screen.getByText('joao@levelzcut.com')).toBeTruthy();
    expect(screen.queryByText('maria@levelzcut.com')).toBeNull();
  });

  it('sem nenhum resultado, mostra mensagem clara em vez de lista vazia sem explicação', async () => {
    await renderBarbersPanel();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/buscar barbeiro/i), 'zzz-nao-existe');

    expect(screen.getByText(/nenhum barbeiro encontrado para "zzz-nao-existe"/i)).toBeTruthy();
  });

  it('limpar o campo de busca traz a lista completa de volta', async () => {
    await renderBarbersPanel();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/buscar barbeiro/i);
    await user.type(input, 'joao');
    expect(screen.queryByText('maria@levelzcut.com')).toBeNull();

    await user.clear(input);
    expect(screen.getByText('joao@levelzcut.com')).toBeTruthy();
    expect(screen.getByText('maria@levelzcut.com')).toBeTruthy();
  });

  it('busca ativa não interfere na edição de acesso — salva os dados corretos do barbeiro filtrado', async () => {
    const updateBarberAccess = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    await renderBarbersPanel({ updateBarberAccess });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/buscar barbeiro/i), 'joao');
    expect(screen.queryByText('maria@levelzcut.com')).toBeNull();

    await user.click(screen.getByText('Editar acesso'));
    await user.click(screen.getByText('LevelzCut Pinheiros'));
    await user.click(screen.getByText('Salvar'));

    await waitFor(() => {
      expect(updateBarberAccess).toHaveBeenCalledWith('user-1', ['moema', 'pinheiros']);
    });
  });
});
