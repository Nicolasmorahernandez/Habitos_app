import { describe, it, expect } from 'vitest';
import { buildHeatmap } from './heatmap';
import type { Entry, EntriesByDate, Habit } from './types';

const lmv: Habit = {
  id: 'h1', nombre: 'Gimnasio', tipo: 'booleano', objetivo: null,
  dias: [1, 3, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

const entries: EntriesByDate = new Map<string, Entry>([
  ['2026-08-24', { habit_id: 'h1', fecha: '2026-08-24', valor: true, actualizado_en: 'x' }],
]);

describe('buildHeatmap', () => {
  it('devuelve una celda por día natural del rango', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas).toHaveLength(7);
    expect(celdas[0].fecha).toBe('2026-08-24');
    expect(celdas[6].fecha).toBe('2026-08-30');
  });

  it('marca como programados solo los días del plan', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas.map((c) => c.programado)).toEqual([
      true, false, true, false, true, false, false,
    ]);
  });

  it('marca como completo solo el día con anotación cumplida', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas[0].completo).toBe(true);
    expect(celdas[2].completo).toBe(false);
  });

  it('expone el día de la semana para alinear la cuadrícula', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas[0].weekday).toBe(1);
    expect(celdas[6].weekday).toBe(0);
  });

  it('marca como completo un día de cantidad solo si alcanza el objetivo', () => {
    const vasos: Habit = {
      id: 'h3', nombre: 'Agua', tipo: 'cantidad', objetivo: 8,
      dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
      creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
    };
    const entradasCantidad: EntriesByDate = new Map<string, Entry>([
      ['2026-08-24', { habit_id: 'h3', fecha: '2026-08-24', valor: 8, actualizado_en: 'x' }],
      ['2026-08-25', { habit_id: 'h3', fecha: '2026-08-25', valor: 5, actualizado_en: 'x' }],
    ]);
    const celdas = buildHeatmap(vasos, entradasCantidad, '2026-08-24', '2026-08-25');
    expect(celdas[0].completo).toBe(true);
    expect(celdas[1].completo).toBe(false);
  });
});
