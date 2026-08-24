import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import { resetDbCache, isStorageAvailable } from '../store/db';
import { App } from './App';

// Los módulos ESM no se pueden espiar con vi.spyOn sobre el namespace: hay que
// interceptar el módulo entero y conservar el resto de exportaciones reales.
vi.mock('../store/db', async () => {
  const real = await vi.importActual<typeof import('../store/db')>('../store/db');
  return { ...real, isStorageAvailable: vi.fn(real.isStorageAvailable) };
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
  vi.mocked(isStorageAvailable).mockResolvedValue(true);
});

describe('App', () => {
  it('no muestra aviso cuando el almacenamiento funciona', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Hoy' });
    expect(screen.queryByText(/no se guardarán/i)).toBeNull();
  });

  it('avisa cuando IndexedDB no está disponible', async () => {
    vi.mocked(isStorageAvailable).mockResolvedValue(false);
    render(<App />);
    expect(await screen.findByText(/no se guardarán/i)).toBeDefined();
  });
});
