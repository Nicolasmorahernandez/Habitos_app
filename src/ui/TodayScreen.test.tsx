import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito, actualizarHabito } from '../store/habits';
import { entriesDeHabito } from '../store/entries';
import { hoy } from '../core/dates';
import { weekdayOf } from '../core/dates';
import { TodayScreen } from './TodayScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

/** Días de la semana que garantizan que el hábito esté programado hoy. */
function hoyProgramado() {
  return [weekdayOf(hoy())];
}

describe('TodayScreen', () => {
  it('muestra un mensaje cuando no hay hábitos', async () => {
    render(<TodayScreen />);
    expect(await screen.findByText(/no tienes hábitos/i)).toBeDefined();
  });

  it('muestra los hábitos programados para hoy', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);
    expect(await screen.findByText('Meditar')).toBeDefined();
  });

  it('oculta los hábitos no programados para hoy', async () => {
    const otroDia = ((weekdayOf(hoy()) + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    await crearHabito({ nombre: 'Gimnasio', tipo: 'booleano', objetivo: null, dias: [otroDia] });
    render(<TodayScreen />);
    await screen.findByText(/no toca ningún hábito|no tienes hábitos/i);
    expect(screen.queryByText('Gimnasio')).toBeNull();
  });

  it('separa los hábitos nuevos de los consolidados', async () => {
    await crearHabito({ nombre: 'Nuevo1', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    const c = await crearHabito({ nombre: 'Viejo1', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    await actualizarHabito(c.id, { estado: 'consolidado' });

    render(<TodayScreen />);
    expect(await screen.findByText(/en formación/i)).toBeDefined();
    expect(screen.getByText(/consolidados/i)).toBeDefined();
  });

  it('persiste la marca al pulsar un hábito', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /meditar/i }));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(h.id);
      expect(guardadas).toHaveLength(1);
      expect(guardadas[0].valor).toBe(true);
      expect(guardadas[0].fecha).toBe(hoy());
    });
  });
});
