import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('no deja que un valor sin confirmar de un día se filtre al entrar de otro día', async () => {
    const h = await crearHabito({
      nombre: 'Agua', tipo: 'cantidad', objetivo: 8, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    const diaA = addDays(hoy(), -2);
    const diaB = addDays(hoy(), -1);

    render(<HistoryScreen />);

    // Abre el día A y escribe un valor sin confirmarlo con blur.
    await userEvent.click(await screen.findByRole('button', { name: diaA }));
    const campoDiaA = await screen.findByLabelText('Cantidad');
    fireEvent.change(campoDiaA, { target: { value: '7' } });

    // Cambia al día B sin haber perdido el foco del campo anterior.
    await userEvent.click(await screen.findByRole('button', { name: diaB }));

    // El usuario hace clic en otro lugar: dispara el blur del campo que ve ahora.
    fireEvent.blur(screen.getByLabelText('Cantidad'));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(h.id);
      const entradaB = guardadas.find((e) => e.fecha === diaB);
      expect(entradaB?.valor).not.toBe(7);
    });
  });
});
