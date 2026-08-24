import { describe, it, expect } from 'vitest';
import { completionRate } from './stats';
import type { Entry, EntriesByDate, Habit, IsoDate } from './types';

const lmv: Habit = {
  id: 'h1', nombre: 'Gimnasio', tipo: 'booleano', objetivo: null,
  dias: [1, 3, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

function hechos(fechas: IsoDate[]): EntriesByDate {
  const m = new Map<IsoDate, Entry>();
  for (const f of fechas) {
    m.set(f, { habit_id: 'h1', fecha: f, valor: true, actualizado_en: `${f}T10:00:00.000Z` });
  }
  return m;
}

describe('completionRate', () => {
  it('es 0 cuando el rango no tiene días programados', () => {
    expect(completionRate(lmv, new Map(), '2026-08-25', '2026-08-25')).toBe(0);
  });

  it('es 1 cuando se cumplen todos los días programados', () => {
    const e = hechos(['2026-08-24', '2026-08-26', '2026-08-28']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBe(1);
  });

  it('divide entre días programados, no entre días naturales', () => {
    const e = hechos(['2026-08-24', '2026-08-26']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBeCloseTo(2 / 3);
  });

  it('ignora anotaciones en días no programados', () => {
    const e = hechos(['2026-08-24', '2026-08-25']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBeCloseTo(1 / 3);
  });

  it('es 0 cuando no se cumple ninguno', () => {
    expect(completionRate(lmv, new Map(), '2026-08-24', '2026-08-30')).toBe(0);
  });

  it('no cuenta días anteriores a la creación del hábito', () => {
    // Creado hace 3 días (2026-08-28), se pide el rango de los últimos 30 días
    // (hasta 2026-08-31), que se extiende mucho antes de que el hábito existiera.
    const creadoHaceTresDias: Habit = { ...lmv, creado_en: '2026-08-28T10:00:00.000Z' };
    const e = hechos(['2026-08-28', '2026-08-31']); // días programados (viernes y lunes)
    expect(completionRate(creadoHaceTresDias, e, '2026-08-02', '2026-08-31')).toBe(1);
  });

  it('no cambia el comportamiento cuando desde ya es posterior a la creación', () => {
    const e = hechos(['2026-08-24', '2026-08-26']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBeCloseTo(2 / 3);
  });
});
