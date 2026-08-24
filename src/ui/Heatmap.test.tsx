import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Heatmap } from './Heatmap';
import type { HeatmapCell } from '../core/heatmap';

const celdas: HeatmapCell[] = [
  { fecha: '2026-08-24', weekday: 1, programado: true, completo: true },
  { fecha: '2026-08-25', weekday: 2, programado: false, completo: false },
  { fecha: '2026-08-26', weekday: 3, programado: true, completo: false },
];

describe('Heatmap', () => {
  it('pinta una celda por día', () => {
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('etiqueta cada celda con el hábito y su fecha', () => {
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-24' })).toBeDefined();
  });

  it('distingue completo, pendiente y no programado', () => {
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-24' }).className).toContain('completo');
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-26' }).className).toContain('pendiente');
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-25' }).className).toContain('libre');
  });

  it('devuelve la fecha al pulsar una celda', async () => {
    const onSeleccionar = vi.fn();
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={onSeleccionar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Meditar: 2026-08-26' }));
    expect(onSeleccionar).toHaveBeenCalledWith('2026-08-26');
  });

  it('dos hábitos con la misma fecha producen etiquetas distintas', () => {
    const { rerender } = render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-24' })).toBeDefined();

    rerender(<Heatmap celdas={celdas} etiquetaHabito="Correr" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Correr: 2026-08-24' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Meditar: 2026-08-24' })).toBeNull();
  });

  it('no revienta con un array de celdas vacío', () => {
    render(<Heatmap celdas={[]} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('con etiquetaHabito vacía, la celda sigue siendo identificable por su fecha', () => {
    render(<Heatmap celdas={celdas} etiquetaHabito="" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: ': 2026-08-24' })).toBeDefined();
  });
});
