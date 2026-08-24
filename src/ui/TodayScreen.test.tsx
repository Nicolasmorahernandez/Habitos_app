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
    await screen.findByText(/no toca ningún hábito/i);
    expect(screen.queryByText('Gimnasio')).toBeNull();
  });

  it('muestra "no toca ningún hábito" (y no "no tienes hábitos") cuando hay hábitos pero ninguno programado hoy', async () => {
    const otroDia = ((weekdayOf(hoy()) + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    await crearHabito({ nombre: 'Gimnasio', tipo: 'booleano', objetivo: null, dias: [otroDia] });
    render(<TodayScreen />);
    expect(await screen.findByText(/no toca ningún hábito/i)).toBeDefined();
    expect(screen.queryByText(/no tienes hábitos/i)).toBeNull();
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

  it('muestra "Día completo." cuando todos los hábitos programados están completos', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /meditar/i }));
    expect(await screen.findByText(/día completo/i)).toBeDefined();
  });

  it('no muestra "Día completo." si algún hábito programado sigue pendiente', async () => {
    const meditar = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    await crearHabito({ nombre: 'Leer', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /meditar/i }));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(meditar.id);
      expect(guardadas).toHaveLength(1);
    });
    expect(screen.queryByText(/día completo/i)).toBeNull();
  });

  it('marca un hábito de tipo cantidad al pulsar sumar', async () => {
    const h = await crearHabito({
      nombre: 'Flexiones',
      tipo: 'cantidad',
      objetivo: 10,
      dias: hoyProgramado(),
    });
    render(<TodayScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /sumar uno a flexiones/i }));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(h.id);
      expect(guardadas).toHaveLength(1);
      expect(guardadas[0].valor).toBe(1);
      expect(guardadas[0].fecha).toBe(hoy());
    });
  });

  it('muestra la gráfica de progreso y sube al marcar un hábito', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);

    expect(await screen.findByRole('img', { name: /progreso de hoy: 0%/i })).toBeDefined();

    await userEvent.click(await screen.findByRole('button', { name: /meditar/i }));

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /progreso de hoy: 100%/i })).toBeDefined();
    });
  });
});
