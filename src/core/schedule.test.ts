import { describe, it, expect } from 'vitest';
import { isScheduled, previousScheduled, scheduledDates } from './schedule';
import type { Habit } from './types';

function habito(dias: Habit['dias']): Habit {
  return {
    id: 'h1',
    nombre: 'Gimnasio',
    tipo: 'booleano',
    objetivo: null,
    dias,
    estado: 'nuevo',
    orden: 0,
    creado_en: '2026-08-01T10:00:00.000Z',
    actualizado_en: '2026-08-01T10:00:00.000Z',
  };
}

describe('isScheduled', () => {
  it('es true en un día programado', () => {
    expect(isScheduled(habito([1, 3, 5]), '2026-08-24')).toBe(true);
  });

  it('es false en un día no programado', () => {
    expect(isScheduled(habito([1, 3, 5]), '2026-08-25')).toBe(false);
  });

  it('es true todos los días si están los siete', () => {
    const h = habito([0, 1, 2, 3, 4, 5, 6]);
    expect(isScheduled(h, '2026-08-23')).toBe(true);
    expect(isScheduled(h, '2026-08-25')).toBe(true);
  });

  it('es false siempre si no hay días programados', () => {
    expect(isScheduled(habito([]), '2026-08-24')).toBe(false);
  });
});

describe('scheduledDates', () => {
  it('devuelve solo los días programados del rango, en orden', () => {
    expect(scheduledDates(habito([1, 3, 5]), '2026-08-24', '2026-08-30')).toEqual([
      '2026-08-24', '2026-08-26', '2026-08-28',
    ]);
  });

  it('devuelve vacío si ningún día del rango está programado', () => {
    expect(scheduledDates(habito([0]), '2026-08-24', '2026-08-26')).toEqual([]);
  });
});

describe('previousScheduled', () => {
  it('devuelve el día programado anterior dentro de la semana', () => {
    // Desde el miércoles 2026-08-26 con dias [1,3,5]: el lunes 2026-08-24.
    expect(previousScheduled(habito([1, 3, 5]), '2026-08-26')).toBe('2026-08-24');
  });

  it('cruza el fin de semana', () => {
    // Desde el lunes 2026-08-24: el viernes anterior, 2026-08-21.
    expect(previousScheduled(habito([1, 3, 5]), '2026-08-24')).toBe('2026-08-21');
  });

  it('cruza el límite de mes', () => {
    // 2026-09-01 es martes; el lunes anterior es 2026-08-31.
    expect(previousScheduled(habito([1]), '2026-09-01')).toBe('2026-08-31');
  });

  it('cruza el límite de año', () => {
    // 2027-01-01 es viernes; el jueves anterior es 2026-12-31.
    expect(previousScheduled(habito([4]), '2027-01-01')).toBe('2026-12-31');
  });

  it('devuelve null si el hábito no tiene días programados', () => {
    expect(previousScheduled(habito([]), '2026-08-26')).toBeNull();
  });

  it('un hábito diario devuelve el día anterior', () => {
    expect(previousScheduled(habito([0, 1, 2, 3, 4, 5, 6]), '2026-08-23')).toBe('2026-08-22');
  });

  it('es estrictamente anterior: no devuelve la propia fecha', () => {
    expect(previousScheduled(habito([1]), '2026-08-24')).toBe('2026-08-17');
  });
});
