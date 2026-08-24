import { describe, it, expect } from 'vitest';
import { currentStreak, longestStreak } from './streaks';
import type { Entry, EntriesByDate, Habit, IsoDate } from './types';

/** Hábito booleano de lunes, miércoles y viernes. */
const lmv: Habit = {
  id: 'h1', nombre: 'Gimnasio', tipo: 'booleano', objetivo: null,
  dias: [1, 3, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

/** Hábito booleano diario. */
const diario: Habit = { ...lmv, id: 'h2', nombre: 'Leer', dias: [0, 1, 2, 3, 4, 5, 6] };

function hechos(fechas: IsoDate[]): EntriesByDate {
  const m = new Map<IsoDate, Entry>();
  for (const f of fechas) {
    m.set(f, { habit_id: 'h1', fecha: f, valor: true, actualizado_en: `${f}T10:00:00.000Z` });
  }
  return m;
}

describe('currentStreak', () => {
  it('es 0 cuando no hay ninguna anotación', () => {
    expect(currentStreak(diario, new Map(), '2026-08-23')).toBe(0);
  });

  it('cuenta días consecutivos en un hábito diario', () => {
    const e = hechos(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(currentStreak(diario, e, '2026-08-23')).toBe(3);
  });

  it('se detiene en el primer día incumplido', () => {
    const e = hechos(['2026-08-20', '2026-08-21', '2026-08-23']);
    expect(currentStreak(diario, e, '2026-08-23')).toBe(1);
  });

  it('no se rompe por los días no programados intercalados', () => {
    const e = hechos(['2026-08-24', '2026-08-26', '2026-08-28']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(3);
  });

  it('sí se rompe al saltarse un día programado', () => {
    const e = hechos(['2026-08-24', '2026-08-28']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(1);
  });

  it('mantiene la racha si hoy toca pero aún no se ha marcado', () => {
    const e = hechos(['2026-08-24', '2026-08-26']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(2);
  });

  it('es 0 si hoy no está marcado y el día programado anterior tampoco', () => {
    const e = hechos(['2026-08-24']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(0);
  });

  it('no cuenta días anteriores a la creación del hábito', () => {
    const creadoEl21 = { ...diario, creado_en: '2026-08-21T10:00:00.000Z' };
    const e = hechos(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(currentStreak(creadoEl21, e, '2026-08-23')).toBe(3);
  });

  it('atraviesa el cambio de mes', () => {
    const e = hechos(['2026-08-30', '2026-08-31', '2026-09-01']);
    expect(currentStreak(diario, e, '2026-09-01')).toBe(3);
  });

  it('atraviesa el cambio de año', () => {
    const e = hechos(['2026-12-31', '2027-01-01']);
    expect(currentStreak(diario, e, '2027-01-01')).toBe(2);
  });

  it('es 0 para un hábito sin días programados, aunque haya anotaciones', () => {
    const sinDias: Habit = { ...diario, dias: [] };
    const e = hechos(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(currentStreak(sinDias, e, '2026-08-23')).toBe(0);
  });
});

describe('longestStreak', () => {
  it('es 0 sin anotaciones', () => {
    expect(longestStreak(diario, new Map(), '2026-08-01', '2026-08-31')).toBe(0);
  });

  it('encuentra el tramo más largo entre varios', () => {
    const e = hechos([
      '2026-08-01', '2026-08-02',
      '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08',
      '2026-08-12',
    ]);
    expect(longestStreak(diario, e, '2026-08-01', '2026-08-31')).toBe(4);
  });

  it('cuenta sobre días programados en un hábito no diario', () => {
    const e = hechos(['2026-08-03', '2026-08-05', '2026-08-07']);
    expect(longestStreak(lmv, e, '2026-08-01', '2026-08-31')).toBe(3);
  });

  it('un día pasado rellenado reconecta dos tramos', () => {
    const sinPuente = hechos(['2026-08-01', '2026-08-02', '2026-08-04', '2026-08-05']);
    expect(longestStreak(diario, sinPuente, '2026-08-01', '2026-08-31')).toBe(2);

    const conPuente = hechos([
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
    ]);
    expect(longestStreak(diario, conPuente, '2026-08-01', '2026-08-31')).toBe(5);
  });
});
