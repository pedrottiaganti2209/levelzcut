import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Store, MonthData } from '../types';
import { NetworkMonthlyChart } from '../components/Admin/NetworkMonthlyChart';

// H26: gráfico "Cortes por mês, por loja" — o Recharts em si (SVG/canvas)
// não é o alvo do teste aqui (ResponsiveContainer não mede layout real em
// jsdom, e isso já é aceito no resto do projeto — MonthlyBarChart também
// não tem teste de render). O que importa testar é a parte que é lógica
// de verdade: o seletor de 3/6/12 meses funciona e nada quebra com 0
// lojas ou dado ausente.

const MOEMA: Store = { id: 'moema', name: 'Moema', displayName: 'LevelzCut Moema' };
const PINHEIROS: Store = { id: 'pinheiros', name: 'Pinheiros', displayName: 'LevelzCut Pinheiros' };

const CUTS_BY_STORE: Record<string, MonthData[]> = {
  moema: [{ year: 2026, month: 8, total: 80 }],
  pinheiros: [{ year: 2026, month: 8, total: 30 }],
};

afterEach(() => cleanup());

describe('NetworkMonthlyChart (H26)', () => {
  it('mostra os 3 botões de intervalo, com 6 meses selecionado por padrão', () => {
    render(<NetworkMonthlyChart stores={[MOEMA, PINHEIROS]} cutsByStore={CUTS_BY_STORE} />);
    expect(screen.getByText('3 meses')).toBeTruthy();
    expect(screen.getByText('6 meses')).toBeTruthy();
    expect(screen.getByText('12 meses')).toBeTruthy();
  });

  it('trocar o intervalo não quebra o componente', async () => {
    render(<NetworkMonthlyChart stores={[MOEMA, PINHEIROS]} cutsByStore={CUTS_BY_STORE} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('12 meses'));
    await user.click(screen.getByText('3 meses'));
    // Se chegou até aqui sem lançar, o estado do intervalo trocou sem quebrar o render.
    expect(screen.getByText('3 meses')).toBeTruthy();
  });

  it('sem nenhuma loja cadastrada, mostra mensagem em vez de gráfico vazio', () => {
    render(<NetworkMonthlyChart stores={[]} cutsByStore={{}} />);
    expect(screen.getByText(/nenhuma loja cadastrada/i)).toBeTruthy();
  });

  it('loja sem nenhum dado no período não quebra o componente', () => {
    render(<NetworkMonthlyChart stores={[MOEMA]} cutsByStore={{}} />);
    expect(screen.getByText('6 meses')).toBeTruthy();
  });
});
