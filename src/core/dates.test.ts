import { describe, it, expect } from 'vitest';
import {
  toIsoDate,
  fromIsoDate,
  isoDateOf,
  weekdayOf,
  addDays,
  datesBetween,
  hoy,
} from './dates';

// Las pruebas corren con TZ=Europe/Madrid (ver vite.config.ts): en agosto, UTC+2.

describe('toIsoDate', () => {
  it('formatea una fecha local como YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 23))).toBe('2026-08-23');
  });

  it('rellena mes y día con cero a la izquierda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  // Con desfase positivo (Madrid, UTC+2) este es el caso con dientes:
  // 00:30 local es 22:30 UTC del día anterior, así que una implementación
  // basada en UTC devolvería '2026-08-22' y fallaría aquí.
  it('usa el día local, no el UTC, justo después de medianoche', () => {
    expect(toIsoDate(new Date(2026, 7, 23, 0, 30))).toBe('2026-08-23');
  });

  // Caso espejo. Con desfase positivo pasa con cualquier implementación;
  // solo distingue local de UTC bajo desfase negativo. Se conserva por simetría.
  it('usa el día local, no el UTC, justo antes de medianoche', () => {
    expect(toIsoDate(new Date(2026, 7, 23, 23, 30))).toBe('2026-08-23');
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

  it('rechaza un timestamp ISO completo', () => {
    expect(() => fromIsoDate('2026-08-01T10:00:00.000Z')).toThrow(/2026-08-01T10:00:00\.000Z/);
  });

  it('rechaza un día sin cero a la izquierda', () => {
    expect(() => fromIsoDate('2026-8-1')).toThrow(/2026-8-1/);
  });

  it('rechaza una cadena sin sentido', () => {
    expect(() => fromIsoDate('mañana')).toThrow();
  });
});

describe('isoDateOf', () => {
  it('devuelve el día natural local de un timestamp', () => {
    expect(isoDateOf('2026-08-01T10:00:00.000Z')).toBe('2026-08-01');
  });

  it('un timestamp de noche UTC cae en el día local siguiente', () => {
    // 22:30 UTC es 00:30 del día 2 en Madrid (UTC+2 en agosto).
    expect(isoDateOf('2026-08-01T22:30:00.000Z')).toBe('2026-08-02');
  });

  it('lanza error si el timestamp no se puede interpretar', () => {
    expect(() => isoDateOf('no es una fecha')).toThrow(/no es una fecha/);
  });
});

describe('weekdayOf', () => {
  it('devuelve 0 para domingo', () => {
    expect(weekdayOf('2026-08-23')).toBe(0);
  });

  it('devuelve 1 para lunes', () => {
    expect(weekdayOf('2026-08-24')).toBe(1);
  });

  it('devuelve 6 para sábado', () => {
    expect(weekdayOf('2026-08-29')).toBe(6);
  });

  it('lanza error ante un timestamp en vez de un día', () => {
    expect(() => weekdayOf('2026-08-01T10:00:00.000Z')).toThrow();
  });
});

describe('addDays', () => {
  it('suma días dentro del mismo mes', () => {
    expect(addDays('2026-08-23', 3)).toBe('2026-08-26');
  });

  it('devuelve el mismo día al sumar cero', () => {
    expect(addDays('2026-08-23', 0)).toBe('2026-08-23');
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

  it('recorre un año natural completo', () => {
    expect(datesBetween('2026-01-01', '2026-12-31')).toHaveLength(365);
  });
});

describe('hoy', () => {
  it('usa el reloj recibido', () => {
    expect(hoy(new Date(2026, 7, 23, 0, 30))).toBe('2026-08-23');
  });
});
