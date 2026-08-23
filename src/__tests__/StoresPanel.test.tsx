import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Store } from '../types';

// H24: busca por nome no painel de Lojas — filtro client-side, sem
// chamada nova ao Supabase (mocka useStores direto, não precisa
// simular o Supabase pra testar o filtro).

const MOEMA: Store = { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema' };
const PINHEIROS: Store = { id: 'pinheiros', name: 'Pinheiros', displayName: 'LevelzCut Pinheiros' };
const VILA: Store = { id: 'vila', name: 'Vila Madalena', displayName: 'LevelzCut Vila Madalena' };

afterEach(() => {
  cleanup();
  vi.doUnmock('../hooks/useStores');
  vi.resetModules();
});

async function renderStoresPanel() {
  vi.doMock('../hooks/useStores', () => ({
    useStores: () => ({ stores: [MOEMA, PINHEIROS, VILA], loading: false, reload: vi.fn() }),
  }));
  const { StoresPanel } = await import('../components/Admin/StoresPanel');
  render(<StoresPanel />);
}

describe('StoresPanel — busca por nome (H24)', () => {
  it('sem digitar nada, mostra a lista completa (comportamento idêntico ao de hoje)', async () => {
    await renderStoresPanel();
    expect(screen.getByText('LevelzCut Moema')).toBeTruthy();
    expect(screen.getByText('LevelzCut Pinheiros')).toBeTruthy();
    expect(screen.getByText('LevelzCut Vila Madalena')).toBeTruthy();
  });

  it('filtra por parte do nome, case-insensitive', async () => {
    await renderStoresPanel();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/buscar loja/i), 'pinh');

    expect(screen.queryByText('LevelzCut Moema')).toBeNull();
    expect(screen.getByText('LevelzCut Pinheiros')).toBeTruthy();
    expect(screen.queryByText('LevelzCut Vila Madalena')).toBeNull();
  });

  it('sem nenhum resultado, mostra mensagem clara em vez de lista vazia sem explicação', async () => {
    await renderStoresPanel();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/buscar loja/i), 'zzz-nao-existe');

    expect(screen.getByText(/nenhuma loja encontrada para "zzz-nao-existe"/i)).toBeTruthy();
    expect(screen.queryByText('LevelzCut Moema')).toBeNull();
  });

  it('limpar o campo de busca traz a lista completa de volta', async () => {
    await renderStoresPanel();
    const user = userEvent.setup();
    const input = screen.getByLabelText(/buscar loja/i);
    await user.type(input, 'pinh');
    expect(screen.queryByText('LevelzCut Moema')).toBeNull();

    await user.clear(input);
    expect(screen.getByText('LevelzCut Moema')).toBeTruthy();
    expect(screen.getByText('LevelzCut Pinheiros')).toBeTruthy();
    expect(screen.getByText('LevelzCut Vila Madalena')).toBeTruthy();
  });
});
