import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Barber } from '../lib/adminApi';

// H25: admin cadastra outro admin — mesma UX de senha temporária do H10,
// sem seleção de loja. A lista só mostra quem já é admin (a ação 'list'
// da Edge Function devolve todo mundo, com o papel de cada um).

const ADMIN_ATUAL: Barber = { userId: 'user-1', email: 'dono@levelzcut.com', role: 'admin', storeIds: [] };
const BARBEIRO: Barber = { userId: 'user-2', email: 'joao@levelzcut.com', role: 'barbeiro', storeIds: ['moema'] };

afterEach(() => {
  cleanup();
  vi.doUnmock('../lib/adminApi');
  vi.resetModules();
});

async function renderAdminsPanel(overrides: Partial<Record<keyof typeof import('../lib/adminApi'), unknown>> = {}) {
  vi.doMock('../lib/adminApi', async () => {
    const actual = await vi.importActual<typeof import('../lib/adminApi')>('../lib/adminApi');
    return {
      ...actual,
      listBarbers: vi.fn().mockResolvedValue({ data: [ADMIN_ATUAL, BARBEIRO], error: null }),
      ...overrides,
    };
  });
  const { AdminsPanel } = await import('../components/Admin/AdminsPanel');
  render(<AdminsPanel />);
  await screen.findByText('dono@levelzcut.com');
}

describe('AdminsPanel (H25)', () => {
  it('lista só quem já é admin — barbeiro não aparece aqui', async () => {
    await renderAdminsPanel();
    expect(screen.getByText('dono@levelzcut.com')).toBeTruthy();
    expect(screen.queryByText('joao@levelzcut.com')).toBeNull();
  });

  it('cadastra um novo admin e mostra a senha temporária uma vez', async () => {
    const createAdmin = vi
      .fn()
      .mockResolvedValue({ data: { userId: 'user-3', email: 'novo@levelzcut.com', tempPassword: 'abc123xyz789' }, error: null });
    await renderAdminsPanel({ createAdmin });

    const user = userEvent.setup();
    await user.click(screen.getByText('Cadastrar admin'));
    await user.type(screen.getByLabelText('Email'), 'novo@levelzcut.com');
    await user.click(screen.getByText('Cadastrar'));

    await waitFor(() => {
      expect(createAdmin).toHaveBeenCalledWith('novo@levelzcut.com');
    });
    expect(await screen.findByText('abc123xyz789')).toBeTruthy();
  });

  it('email inválido não chega a chamar createAdmin', async () => {
    const createAdmin = vi.fn();
    await renderAdminsPanel({ createAdmin });

    const user = userEvent.setup();
    await user.click(screen.getByText('Cadastrar admin'));
    await user.type(screen.getByLabelText('Email'), 'nao-e-um-email');
    // fireEvent.submit em vez de clicar no botão: um clique de verdade
    // seria barrado antes pela validação nativa do <input type="email">
    // (o jsdom simula isso), então o handler React nem rodaria — o que
    // este teste quer exercitar é a validação própria do componente.
    fireEvent.submit(screen.getByLabelText('Email').closest('form')!);

    expect(await screen.findByText(/digite um email válido/i)).toBeTruthy();
    expect(createAdmin).not.toHaveBeenCalled();
  });

  it('apaga um admin depois de confirmar', async () => {
    const deleteBarber = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    await renderAdminsPanel({ deleteBarber });

    const user = userEvent.setup();
    await user.click(screen.getByTitle('Apagar admin'));
    await user.click(screen.getByText('Confirmar exclusão'));

    await waitFor(() => {
      expect(deleteBarber).toHaveBeenCalledWith('user-1');
    });
  });
});
