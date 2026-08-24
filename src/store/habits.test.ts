import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbCache } from './db';
import { crearHabito, listarHabitos, actualizarHabito, archivarHabito } from './habits';

beforeEach(() => {
  // Base de datos limpia por test.
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('crearHabito', () => {
  it('asigna id, marcas de tiempo y estado inicial "nuevo"', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1, 2, 3, 4, 5] });
    expect(h.id).toBeTruthy();
    expect(h.estado).toBe('nuevo');
    expect(h.creado_en).toBeTruthy();
    expect(h.actualizado_en).toBe(h.creado_en);
  });

  it('asigna órdenes crecientes', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    const b = await crearHabito({ nombre: 'B', tipo: 'booleano', objetivo: null, dias: [1] });
    expect(b.orden).toBeGreaterThan(a.orden);
  });

  it('rechaza un hábito de cantidad sin objetivo', async () => {
    await expect(
      crearHabito({ nombre: 'Agua', tipo: 'cantidad', objetivo: null, dias: [1] }),
    ).rejects.toThrow(/objetivo/i);
  });

  it('rechaza un nombre vacío', async () => {
    await expect(
      crearHabito({ nombre: '   ', tipo: 'booleano', objetivo: null, dias: [1] }),
    ).rejects.toThrow(/nombre/i);
  });
});

describe('listarHabitos', () => {
  it('devuelve vacío al principio', async () => {
    expect(await listarHabitos()).toEqual([]);
  });

  it('devuelve los hábitos ordenados por orden', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    const b = await crearHabito({ nombre: 'B', tipo: 'booleano', objetivo: null, dias: [1] });
    await actualizarHabito(a.id, { orden: 10 });
    const lista = await listarHabitos();
    expect(lista.map((h) => h.nombre)).toEqual(['B', 'A']);
  });

  it('excluye los archivados salvo que se pidan', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    await archivarHabito(a.id);
    expect(await listarHabitos()).toEqual([]);
    expect((await listarHabitos({ incluirArchivados: true })).map((h) => h.nombre)).toEqual(['A']);
  });
});

describe('actualizarHabito', () => {
  it('aplica los cambios y refresca actualizado_en', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    const actualizado = await actualizarHabito(a.id, { nombre: 'A2', estado: 'consolidado' });
    expect(actualizado.nombre).toBe('A2');
    expect(actualizado.estado).toBe('consolidado');
    expect(actualizado.actualizado_en >= a.actualizado_en).toBe(true);
  });

  it('falla si el hábito no existe', async () => {
    await expect(actualizarHabito('inexistente', { nombre: 'X' })).rejects.toThrow(/no existe/i);
  });
});

describe('archivarHabito', () => {
  it('cambia el estado a archivado sin borrar el registro', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    await archivarHabito(a.id);
    const todos = await listarHabitos({ incluirArchivados: true });
    expect(todos[0].estado).toBe('archivado');
  });
});
