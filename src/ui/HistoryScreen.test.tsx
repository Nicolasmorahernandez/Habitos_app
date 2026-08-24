import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito } from '../store/habits';
import { entriesDeHabito } from '../store/entries';
import { addDays, hoy } from '../core/dates';
import { HistoryScreen } from './HistoryScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('HistoryScreen', () => {
  it('avisa cuando no hay hábitos', async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/no tienes hábitos/i)).toBeDefined();
  });

  it('muestra el heatmap del primer hábito', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });
    render(<HistoryScreen />);
    expect(await screen.findByRole('button', { name: hoy() })).toBeDefined();
  });

  it('permite marcar un día pasado desde el heatmap', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    const ayer = addDays(hoy(), -1);

    render(<HistoryScreen />);
    await userEvent.click(await screen.findByRole('button', { name: ayer }));
    await userEvent.click(await screen.findByRole('button', { name: /marcar como hecho/i }));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(h.id);
      expect(guardadas.map((e) => e.fecha)).toContain(ayer);
    });
  });

  it('permite cambiar de hábito con el selector', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    await crearHabito({ nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [2] });

    render(<HistoryScreen />);
    const selector = await screen.findByLabelText(/hábito/i);
    await userEvent.selectOptions(selector, 'Correr');
    expect((selector as HTMLSelectElement).selectedOptions[0].textContent).toBe('Correr');
  });
});
