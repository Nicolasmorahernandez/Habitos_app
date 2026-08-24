import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito, listarHabitos } from '../store/habits';
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
});
