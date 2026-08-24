import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import * as habitsStore from '../store/habits';
import { crearHabito, listarHabitos } from '../store/habits';
import * as backupStore from '../store/backup';
import { SettingsScreen } from './SettingsScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('SettingsScreen', () => {
  it('lista los hábitos existentes', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    render(<SettingsScreen />);
    expect(await screen.findByText('Meditar')).toBeDefined();
  });

  it('crea un hábito desde el formulario', async () => {
    render(<SettingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /nuevo hábito/i }));
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Leer');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(async () => {
      expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Leer']);
    });
  });

  it('cambia un hábito nuevo a consolidado', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    render(<SettingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /consolidar meditar/i }));

    await waitFor(async () => {
      const lista = await listarHabitos();
      expect(lista.find((x) => x.id === h.id)?.estado).toBe('consolidado');
    });
  });

  it('archiva un hábito y deja de listarlo', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    render(<SettingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /archivar meditar/i }));

    await waitFor(() => {
      expect(screen.queryByText('Meditar')).toBeNull();
    });
  });

  it('muestra el fallo de creación y lo limpia al reintentar con éxito', async () => {
    const spy = vi.spyOn(habitsStore, 'crearHabito').mockRejectedValueOnce(new Error('fallo simulado'));
    render(<SettingsScreen />);

    await userEvent.click(await screen.findByRole('button', { name: /nuevo hábito/i }));
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Leer');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('fallo simulado')).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.queryByText('fallo simulado')).toBeNull();
    });
    await waitFor(async () => {
      expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Leer']);
    });

    spy.mockRestore();
  });

  it('muestra el fallo de importación cuando el fichero no es un JSON válido', async () => {
    render(<SettingsScreen />);
    const archivo = new File(['no es json'], 'backup.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/importar json/i), archivo);

    expect(await screen.findByText(/no es un JSON válido/i)).toBeDefined();
  });

  it('permite volver a seleccionar el mismo fichero tras importar', async () => {
    const spy = vi.spyOn(backupStore, 'importarJSON').mockResolvedValue(undefined);
    render(<SettingsScreen />);
    const archivo = new File(['{"version":1,"habits":[],"entries":[]}'], 'backup.json', {
      type: 'application/json',
    });
    const input = screen.getByLabelText(/importar json/i);

    await userEvent.upload(input, archivo);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect((input as HTMLInputElement).value).toBe('');

    await userEvent.upload(input, archivo);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));

    spy.mockRestore();
  });
});
