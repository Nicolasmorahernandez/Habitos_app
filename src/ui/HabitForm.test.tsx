import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HabitForm } from './HabitForm';

describe('HabitForm', () => {
  it('envía un hábito booleano con los días marcados', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Meditar');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1],
    });
  });

  it('pide objetivo solo cuando el tipo es cantidad', async () => {
    render(<HabitForm onGuardar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.queryByLabelText(/objetivo/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'cantidad');
    expect(screen.getByLabelText(/objetivo/i)).toBeDefined();
  });

  it('envía el objetivo en un hábito de cantidad', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Agua');
    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'cantidad');
    await userEvent.clear(screen.getByLabelText(/objetivo/i));
    await userEvent.type(screen.getByLabelText(/objetivo/i), '8');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Martes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith({
      nombre: 'Agua', tipo: 'cantidad', objetivo: 8, dias: [2],
    });
  });

  it('avisa si no se marca ningún día', async () => {
    const onGuardar = vi.fn();
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Meditar');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/al menos un día/i)).toBeDefined();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('avisa si el nombre está vacío', async () => {
    const onGuardar = vi.fn();
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/nombre/i)).toBeDefined();
    expect(onGuardar).not.toHaveBeenCalled();
  });
});
