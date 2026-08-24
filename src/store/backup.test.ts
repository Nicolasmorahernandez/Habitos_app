import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbCache } from './db';
import { crearHabito, listarHabitos } from './habits';
import { marcarHabito, entriesDeHabito } from './entries';
import { exportarJSON, importarJSON } from './backup';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('exportarJSON', () => {
  it('incluye versión, hábitos y anotaciones', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    await marcarHabito(h.id, '2026-08-24', true);

    const json = await exportarJSON();
    const datos = JSON.parse(json);
    expect(datos.version).toBe(1);
    expect(datos.habits).toHaveLength(1);
    expect(datos.entries).toHaveLength(1);
  });

  it('produce un JSON que importarJSON acepta', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = await exportarJSON();
    await expect(importarJSON(json)).resolves.toBeUndefined();
  });
});

describe('importarJSON', () => {
  it('restaura hábitos y anotaciones sobre una base vacía', async () => {
    const json = JSON.stringify({
      version: 1,
      habits: [{
        id: 'h1', nombre: 'Leer', tipo: 'booleano', objetivo: null, dias: [1, 2],
        estado: 'nuevo', orden: 0,
        creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
      }],
      entries: [
        { habit_id: 'h1', fecha: '2026-08-24', valor: true, actualizado_en: '2026-08-24T10:00:00.000Z' },
      ],
    });

    await importarJSON(json);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Leer']);
    expect(await entriesDeHabito('h1')).toHaveLength(1);
  });

  it('reemplaza el contenido anterior', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({ version: 1, habits: [], entries: [] });
    await importarJSON(json);
    expect(await listarHabitos()).toEqual([]);
  });

  it('rechaza un JSON mal formado', async () => {
    await expect(importarJSON('{ esto no es json')).rejects.toThrow(/no es un JSON válido/i);
  });

  it('rechaza un JSON sin la forma esperada', async () => {
    await expect(importarJSON(JSON.stringify({ cosas: [] }))).rejects.toThrow(/formato/i);
  });

  it('rechaza una versión desconocida', async () => {
    await expect(
      importarJSON(JSON.stringify({ version: 99, habits: [], entries: [] })),
    ).rejects.toThrow(/versión/i);
  });

  it('no modifica nada si el JSON es inválido', async () => {
    await crearHabito({ nombre: 'Intacto', tipo: 'booleano', objetivo: null, dias: [1] });
    await expect(importarJSON('roto')).rejects.toThrow();
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Intacto']);
  });

  it('rechaza un hábito mal formado sin tocar la base', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [
        {
          id: 'h1', nombre: 'Bueno', tipo: 'booleano', objetivo: null, dias: [1],
          estado: 'nuevo', orden: 0,
          creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
        },
        { nombre: 'SinId' },
      ],
      entries: [],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza una anotación mal formada sin tocar la base', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [],
      entries: [{ habit_id: 'h1', valor: true, actualizado_en: '2026-08-24T10:00:00.000Z' }],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza un hábito de cantidad sin objetivo numérico', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [{
        id: 'h1', nombre: 'Correr', tipo: 'cantidad', objetivo: null, dias: [1],
        estado: 'nuevo', orden: 0,
        creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
      }],
      entries: [],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza un hábito booleano con un objetivo numérico', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [{
        id: 'h1', nombre: 'Meditar', tipo: 'booleano', objetivo: 5, dias: [1],
        estado: 'nuevo', orden: 0,
        creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
      }],
      entries: [],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza un hábito con un día de la semana fuera de rango (7)', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [{
        id: 'h1', nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [7],
        estado: 'nuevo', orden: 0,
        creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
      }],
      entries: [],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza un hábito con un día de la semana fuera de rango (-1)', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [{
        id: 'h1', nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [-1],
        estado: 'nuevo', orden: 0,
        creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
      }],
      entries: [],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza una anotación con una fecha que no es una fecha', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [],
      entries: [{ habit_id: 'h1', fecha: 'no-es-fecha', valor: true, actualizado_en: '2026-08-24T10:00:00.000Z' }],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('rechaza una anotación con una fecha que no existe en el calendario', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({
      version: 1,
      habits: [],
      entries: [{ habit_id: 'h1', fecha: '2026-02-30', valor: true, actualizado_en: '2026-08-24T10:00:00.000Z' }],
    });

    await expect(importarJSON(json)).rejects.toThrow(/formato/i);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Viejo']);
  });

  it('un ciclo completo de exportar e importar conserva hábitos y anotaciones', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    await marcarHabito(h.id, '2026-08-24', true);
    const json = await exportarJSON();

    globalThis.indexedDB = new IDBFactory();
    resetDbCache();

    await importarJSON(json);
    const habitos = await listarHabitos();
    expect(habitos).toHaveLength(1);
    expect(habitos[0].nombre).toBe('Meditar');

    const entries = await entriesDeHabito(h.id);
    expect(entries).toHaveLength(1);
    expect(entries[0].fecha).toBe('2026-08-24');
    expect(entries[0].valor).toBe(true);
  });
});
