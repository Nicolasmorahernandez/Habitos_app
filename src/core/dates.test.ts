import { describe, it, expect } from 'vitest';
import { toIsoDate, fromIsoDate, weekdayOf, addDays, datesBetween } from './dates';

describe('toIsoDate', () => {
  it('formatea una fecha local como YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 23))).toBe('2026-08-23');
  });

  it('rellena mes y día con cero a la izquierda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('usa el día local, no el UTC, justo después de medianoche', () => {
    expect(toIsoDate(new Date(2026, 7, 23, 0, 30))).toBe('2026-08-23');
  });
});

describe('fromIsoDate', () => {
  it('devuelve la medianoche local del día indicado', () => {
    const d = fromIsoDate('2026-08-23');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(23);
    expect(d.getHours()).toBe(0);
  });

  it('es la inversa de toIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-02-28'))).toBe('2026-02-28');
    expect(toIsoDate(fromIsoDate('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('weekdayOf', () => {
  it('devuelve 0 para domingo', () => {
    expect(weekdayOf('2026-08-23')).toBe(0);
  });

  it('devuelve 1 para lunes', () => {
    expect(weekdayOf('2026-08-24')).toBe(1);
  });
});

describe('addDays', () => {
  it('suma días dentro del mismo mes', () => {
    expect(addDays('2026-08-23', 3)).toBe('2026-08-26');
  });

  it('cruza el límite de mes', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('cruza el límite de año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('resta con números negativos', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('maneja febrero de un año bisiesto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('datesBetween', () => {
  it('incluye ambos extremos', () => {
    expect(datesBetween('2026-08-23', '2026-08-26')).toEqual([
      '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26',
    ]);
  });

  it('devuelve un solo día cuando los extremos coinciden', () => {
    expect(datesBetween('2026-08-23', '2026-08-23')).toEqual(['2026-08-23']);
  });

  it('devuelve vacío si el fin es anterior al inicio', () => {
    expect(datesBetween('2026-08-26', '2026-08-23')).toEqual([]);
  });
});
