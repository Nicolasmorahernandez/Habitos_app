import { describe, it, expect } from 'vitest';
import { isScheduled, scheduledDates } from './schedule';
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
