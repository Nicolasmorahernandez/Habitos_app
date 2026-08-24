import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito } from '../store/habits';
import { hoy } from '../core/dates';
import { HistoryScreen } from './HistoryScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('HistoryScreen', () => {
  it('avisa cuando no hay hábitos', async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/no tienes hábitos/i)).toBeDefined();
  });

  it('muestra una fila por cada hábito', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });
    await crearHabito({ nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });

    render(<HistoryScreen />);
    expect(await screen.findByRole('button', { name: 'Meditar' })).toBeDefined();
    expect(await screen.findByRole('button', { name: 'Correr' })).toBeDefined();
    expect(await screen.findByRole('button', { name: `Meditar: ${hoy()}` })).toBeDefined();
    expect(await screen.findByRole('button', { name: `Correr: ${hoy()}` })).toBeDefined();
  });

  it('solo una fila puede estar expandida a la vez', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });
    await crearHabito({ nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });

    render(<HistoryScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Meditar' }));
    expect(await screen.findAllByTestId('racha-actual')).toHaveLength(1);

    await userEvent.click(await screen.findByRole('button', { name: 'Correr' }));
    expect(await screen.findAllByTestId('racha-actual')).toHaveLength(1);
  });

  it('tocar el hábito expandido lo colapsa de nuevo', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });

    render(<HistoryScreen />);
    const boton = await screen.findByRole('button', { name: 'Meditar' });
    await userEvent.click(boton);
    await screen.findByTestId('racha-actual');

    await userEvent.click(boton);
    expect(screen.queryByTestId('racha-actual')).toBeNull();
  });
});
