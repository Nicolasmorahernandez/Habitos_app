import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbCache } from './db';
import { marcarHabito, entriesDeFecha, entriesDeHabito, mapaDeEntries } from './entries';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('marcarHabito', () => {
  it('crea la anotación con su marca de tiempo', async () => {
    const e = await marcarHabito('h1', '2026-08-23', true);
    expect(e.habit_id).toBe('h1');
    expect(e.fecha).toBe('2026-08-23');
    expect(e.valor).toBe(true);
    expect(e.actualizado_en).toBeTruthy();
  });

  it('sobrescribe el valor del mismo día en vez de duplicarlo', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h1', '2026-08-23', false);
    const todas = await entriesDeHabito('h1');
    expect(todas).toHaveLength(1);
    expect(todas[0].valor).toBe(false);
  });

  it('acepta valores numéricos para hábitos de cantidad', async () => {
    const e = await marcarHabito('h2', '2026-08-23', 5);
    expect(e.valor).toBe(5);
  });

  it('permite anotar un día pasado', async () => {
    await marcarHabito('h1', '2026-07-04', true);
    const todas = await entriesDeHabito('h1');
    expect(todas[0].fecha).toBe('2026-07-04');
  });
});

describe('entriesDeFecha', () => {
  it('devuelve las anotaciones de todos los hábitos de ese día', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h2', '2026-08-23', 3);
    await marcarHabito('h1', '2026-08-22', true);

    const delDia = await entriesDeFecha('2026-08-23');
    expect(delDia.map((e) => e.habit_id).sort()).toEqual(['h1', 'h2']);
  });

  it('devuelve vacío en un día sin anotaciones', async () => {
    expect(await entriesDeFecha('2026-08-23')).toEqual([]);
  });
});

describe('entriesDeHabito', () => {
  it('devuelve solo las de ese hábito', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h2', '2026-08-23', true);
    const deH1 = await entriesDeHabito('h1');
    expect(deH1).toHaveLength(1);
    expect(deH1[0].habit_id).toBe('h1');
  });
});

describe('mapaDeEntries', () => {
  it('indexa por fecha para consumo de core/', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h1', '2026-08-24', true);
    const mapa = await mapaDeEntries('h1');
    expect(mapa.get('2026-08-23')?.valor).toBe(true);
    expect(mapa.get('2026-08-25')).toBeUndefined();
  });
});
