import { describe, it, expect } from 'vitest';
import { progresoDelDia } from './dailyProgress';
import type { Entry, Habit } from './types';

function habito(id: string): Habit {
  return {
    id, nombre: id, tipo: 'booleano', objetivo: null,
    dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
    creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
  };
}

function cantidad(id: string, objetivo: number): Habit {
  return { ...habito(id), tipo: 'cantidad', objetivo };
}

function entrada(habit_id: string, valor: boolean | number, actualizado_en: string): Entry {
  return { habit_id, fecha: '2026-08-23', valor, actualizado_en };
}

describe('progresoDelDia', () => {
  it('devuelve vacío si no hay hábitos programados hoy', () => {
    expect(progresoDelDia([], new Map())).toEqual([]);
  });

  it('devuelve vacío si ninguno está completado', () => {
    const habitos = [habito('a'), habito('b')];
    expect(progresoDelDia(habitos, new Map())).toEqual([]);
  });

  it('un solo hábito completado da un único punto al 100%', () => {
    const habitos = [habito('a')];
    const entradas = new Map([['a', entrada('a', true, '2026-08-23T08:30:00.000Z')]]);
    const puntos = progresoDelDia(habitos, entradas);
    expect(puntos).toHaveLength(1);
    expect(puntos[0].porcentaje).toBe(100);
  });

  it('reparte el 100% en partes iguales y ordena por hora de marca', () => {
    const habitos = [habito('a'), habito('b'), habito('c')];
    // 'b' se marcó primero (08:00 UTC), luego 'a' (10:00 UTC), luego 'c' (12:00 UTC).
    const entradas = new Map([
      ['a', entrada('a', true, '2026-08-23T10:00:00.000Z')],
      ['b', entrada('b', true, '2026-08-23T08:00:00.000Z')],
      ['c', entrada('c', true, '2026-08-23T12:00:00.000Z')],
    ]);
    const puntos = progresoDelDia(habitos, entradas);
    expect(puntos).toHaveLength(3);
    // toBeCloseTo en vez de igualdad exacta: sumar 100/3 repetidamente en
    // coma flotante no siempre reconstruye el mismo valor que multiplicar.
    expect(puntos[0].porcentaje).toBeCloseTo(100 / 3);
    expect(puntos[1].porcentaje).toBeCloseTo((100 / 3) * 2);
    expect(puntos[2].porcentaje).toBeCloseTo(100);
    // El orden de los puntos sigue la hora de marca, no el orden de habitos[].
    expect(puntos[0].minutos).toBeLessThan(puntos[1].minutos);
    expect(puntos[1].minutos).toBeLessThan(puntos[2].minutos);
  });

  it('un hábito de cantidad sin alcanzar el objetivo no aporta punto', () => {
    const habitos = [cantidad('agua', 8)];
    const entradas = new Map([['agua', entrada('agua', 5, '2026-08-23T09:00:00.000Z')]]);
    expect(progresoDelDia(habitos, entradas)).toEqual([]);
  });

  it('un hábito de cantidad que alcanza el objetivo aporta punto igual que uno booleano', () => {
    const habitos = [cantidad('agua', 8)];
    const entradas = new Map([['agua', entrada('agua', 8, '2026-08-23T09:00:00.000Z')]]);
    const puntos = progresoDelDia(habitos, entradas);
    expect(puntos).toHaveLength(1);
    expect(puntos[0].porcentaje).toBe(100);
  });

  it('un hábito desmarcado (valor false) no aporta punto aunque tenga marca de tiempo', () => {
    const habitos = [habito('a')];
    const entradas = new Map([['a', entrada('a', false, '2026-08-23T09:00:00.000Z')]]);
    expect(progresoDelDia(habitos, entradas)).toEqual([]);
  });
});
