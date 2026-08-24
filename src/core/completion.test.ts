import { describe, it, expect } from 'vitest';
import { isComplete } from './completion';
import type { Entry, Habit } from './types';

const booleano: Habit = {
  id: 'h1', nombre: 'Meditar', tipo: 'booleano', objetivo: null,
  dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

const cantidad: Habit = { ...booleano, id: 'h2', nombre: 'Agua', tipo: 'cantidad', objetivo: 8 };

function entrada(valor: boolean | number): Entry {
  return { habit_id: 'h1', fecha: '2026-08-23', valor, actualizado_en: '2026-08-23T10:00:00.000Z' };
}

describe('isComplete', () => {
  it('no está completo si no hay anotación', () => {
    expect(isComplete(booleano, undefined)).toBe(false);
    expect(isComplete(cantidad, undefined)).toBe(false);
  });

  it('booleano: completo cuando el valor es true', () => {
    expect(isComplete(booleano, entrada(true))).toBe(true);
    expect(isComplete(booleano, entrada(false))).toBe(false);
  });

  it('cantidad: completo al alcanzar el objetivo', () => {
    expect(isComplete(cantidad, entrada(8))).toBe(true);
  });

  it('cantidad: completo al superar el objetivo', () => {
    expect(isComplete(cantidad, entrada(10))).toBe(true);
  });

  it('cantidad: incompleto por debajo del objetivo', () => {
    expect(isComplete(cantidad, entrada(7))).toBe(false);
  });

  it('cantidad: un cero no está completo', () => {
    expect(isComplete(cantidad, entrada(0))).toBe(false);
  });

  it('cantidad sin objetivo definido: basta con un valor mayor que cero', () => {
    const sinObjetivo = { ...cantidad, objetivo: null };
    expect(isComplete(sinObjetivo, entrada(1))).toBe(true);
    expect(isComplete(sinObjetivo, entrada(0))).toBe(false);
  });
});
