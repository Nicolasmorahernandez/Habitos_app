import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HabitDetail } from './HabitDetail';
import type { Entry, EntriesByDate, Habit } from '../core/types';
import { addDays, hoy } from '../core/dates';

const diario: Habit = {
  id: 'h1', nombre: 'Leer', tipo: 'booleano', objetivo: null,
  dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
  creado_en: new Date(`${addDays(hoy(), -30)}T10:00:00.000Z`).toISOString(),
  actualizado_en: '2026-08-01T10:00:00.000Z',
};

function hechos(fechas: string[]): EntriesByDate {
  return new Map<string, Entry>(
    fechas.map((f) => [f, { habit_id: 'h1', fecha: f, valor: true, actualizado_en: `${f}T10:00:00.000Z` }]),
  );
}

describe('HabitDetail', () => {
  it('muestra la racha actual', () => {
    const e = hechos([addDays(hoy(), -2), addDays(hoy(), -1), hoy()]);
    render(<HabitDetail habit={diario} entries={e} />);
    expect(screen.getByTestId('racha-actual').textContent).toBe('3');
  });

  it('muestra la racha más larga', () => {
    const e = hechos([addDays(hoy(), -5), addDays(hoy(), -4), addDays(hoy(), -3), hoy()]);
    render(<HabitDetail habit={diario} entries={e} />);
    expect(screen.getByTestId('racha-maxima').textContent).toBe('3');
  });

  it('muestra el porcentaje de cumplimiento como entero con símbolo', () => {
    const e = hechos([hoy()]);
    render(<HabitDetail habit={diario} entries={e} />);
    expect(screen.getByTestId('cumplimiento').textContent).toMatch(/^\d+%$/);
  });

  it('muestra ceros sin anotaciones', () => {
    render(<HabitDetail habit={diario} entries={new Map()} />);
    expect(screen.getByTestId('racha-actual').textContent).toBe('0');
    expect(screen.getByTestId('cumplimiento').textContent).toBe('0%');
  });
});
