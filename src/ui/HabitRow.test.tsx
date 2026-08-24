import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HabitRow } from './HabitRow';
import type { Entry, Habit } from '../core/types';

const booleano: Habit = {
  id: 'h1', nombre: 'Meditar', tipo: 'booleano', objetivo: null,
  dias: [1, 2, 3, 4, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

const cantidad: Habit = { ...booleano, id: 'h2', nombre: 'Agua', tipo: 'cantidad', objetivo: 8 };

function entrada(habit_id: string, valor: boolean | number): Entry {
  return { habit_id, fecha: '2026-08-24', valor, actualizado_en: '2026-08-24T10:00:00.000Z' };
}

describe('HabitRow booleano', () => {
  it('muestra el nombre del hábito', () => {
    render(<HabitRow habit={booleano} entry={undefined} racha={0} onMarcar={vi.fn()} />);
    expect(screen.getByText('Meditar')).toBeDefined();
  });

  it('marca como cumplido al pulsar', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={booleano} entry={undefined} racha={0} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: /meditar/i }));
    expect(onMarcar).toHaveBeenCalledWith(true);
  });

  it('desmarca al pulsar sobre uno ya cumplido', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={booleano} entry={entrada('h1', true)} racha={3} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: /meditar/i }));
    expect(onMarcar).toHaveBeenCalledWith(false);
  });

  it('muestra la racha cuando es mayor que cero', () => {
    render(<HabitRow habit={booleano} entry={undefined} racha={5} onMarcar={vi.fn()} />);
    expect(screen.getByText(/5/)).toBeDefined();
  });

  it('no muestra racha cuando es cero', () => {
    render(<HabitRow habit={booleano} entry={undefined} racha={0} onMarcar={vi.fn()} />);
    expect(screen.queryByTestId('racha')).toBeNull();
  });
});

describe('HabitRow de cantidad', () => {
  it('muestra el progreso frente al objetivo', () => {
    render(<HabitRow habit={cantidad} entry={entrada('h2', 5)} racha={0} onMarcar={vi.fn()} />);
    expect(screen.getByText('5/8')).toBeDefined();
  });

  it('muestra 0 cuando no hay anotación', () => {
    render(<HabitRow habit={cantidad} entry={undefined} racha={0} onMarcar={vi.fn()} />);
    expect(screen.getByText('0/8')).toBeDefined();
  });

  it('incrementa en uno al pulsar el botón de sumar', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={cantidad} entry={entrada('h2', 5)} racha={0} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sumar uno a Agua' }));
    expect(onMarcar).toHaveBeenCalledWith(6);
  });

  it('decrementa en uno sin bajar de cero', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={cantidad} entry={entrada('h2', 0)} racha={0} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Restar uno a Agua' }));
    expect(onMarcar).toHaveBeenCalledWith(0);
  });
});
