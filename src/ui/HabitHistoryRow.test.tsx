import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito } from '../store/habits';
import { entriesDeHabito, marcarHabito } from '../store/entries';
import { addDays, hoy } from '../core/dates';
import { HabitHistoryRow } from './HabitHistoryRow';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('HabitHistoryRow', () => {
  it('muestra el heatmap compacto (últimas 8 semanas) cuando está colapsada', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    expect(await screen.findByRole('button', { name: `Meditar: ${hoy()}` })).toBeDefined();
    // 60 días atrás cae fuera de la ventana compacta de 56 días (8 semanas).
    const fueraDeRango = addDays(hoy(), -60);
    expect(screen.queryByRole('button', { name: `Meditar: ${fueraDeRango}` })).toBeNull();
  });

  it('muestra la racha junto al nombre cuando es mayor que cero', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    await marcarHabito(h.id, hoy(), true);
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    expect(await screen.findByText(/🔥 1/)).toBeDefined();
  });

  it('no muestra racha cuando es cero', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    await screen.findByRole('button', { name: `Meditar: ${hoy()}` });
    expect(screen.queryByText(/🔥/)).toBeNull();
  });

  it('al expandir muestra el heatmap completo (182 días) y las estadísticas', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={true} onToggleExpandir={() => {}} />);

    // 60 días atrás cabe en la ventana completa de 182 días, aunque no en la compacta.
    const soloEnCompleto = addDays(hoy(), -60);
    expect(await screen.findByRole('button', { name: `Meditar: ${soloEnCompleto}` })).toBeDefined();
    expect(screen.getByTestId('racha-actual')).toBeDefined();
    expect(screen.getByTestId('racha-maxima')).toBeDefined();
    expect(screen.getByTestId('cumplimiento')).toBeDefined();
  });

  it('al colapsar oculta el heatmap completo y las estadísticas', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    await screen.findByRole('button', { name: `Meditar: ${hoy()}` });
    expect(screen.queryByTestId('racha-actual')).toBeNull();
  });

  it('al pasar de expandida a colapsada, las estadísticas realmente desaparecen', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    const { rerender } = render(
      <HabitHistoryRow habit={h} expandido={true} onToggleExpandir={() => {}} />,
    );
    await screen.findByTestId('racha-actual');

    rerender(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);
    expect(screen.queryByTestId('racha-actual')).toBeNull();
  });

  it('tocar una celda del heatmap compacto abre la tarjeta y persiste sin necesidad de expandir', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    const ayer = addDays(hoy(), -1);
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: `Meditar: ${ayer}` }));
    await userEvent.click(await screen.findByRole('button', { name: /marcar como hecho/i }));

    const guardadas = await entriesDeHabito(h.id);
    expect(guardadas.map((e) => e.fecha)).toContain(ayer);
  });

  it('llama a onToggleExpandir al tocar el nombre del hábito', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    let llamado = false;
    render(
      <HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => { llamado = true; }} />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Meditar' }));
    expect(llamado).toBe(true);
  });
});
