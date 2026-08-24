import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyProgressChart } from './DailyProgressChart';
import type { PuntoProgreso } from '../core/dailyProgress';

describe('DailyProgressChart', () => {
  it('con puntos vacíos, muestra 0% y no revienta', () => {
    render(<DailyProgressChart puntos={[]} ahoraMinutos={600} />);
    expect(screen.getByRole('img', { name: /0%/ })).toBeDefined();
  });

  it('muestra el porcentaje acumulado del último punto en el aria-label', () => {
    const puntos: PuntoProgreso[] = [
      { minutos: 480, porcentaje: 50 },
      { minutos: 600, porcentaje: 100 },
    ];
    render(<DailyProgressChart puntos={puntos} ahoraMinutos={650} />);
    expect(screen.getByRole('img', { name: /100%/ })).toBeDefined();
  });

  it('pinta un punto por cada elemento de puntos', () => {
    const puntos: PuntoProgreso[] = [
      { minutos: 480, porcentaje: 33.3 },
      { minutos: 600, porcentaje: 66.6 },
      { minutos: 720, porcentaje: 100 },
    ];
    const { container } = render(<DailyProgressChart puntos={puntos} ahoraMinutos={800} />);
    expect(container.querySelectorAll('.grafica-punto')).toHaveLength(3);
  });

  it('sin puntos, redondea a 0% en vez de mostrar NaN', () => {
    render(<DailyProgressChart puntos={[]} ahoraMinutos={0} />);
    expect(screen.getByTestId('grafica-valor-actual').textContent).toBe('0%');
  });

  it('el trazo es escalonado: plano y luego un salto vertical, no diagonal', () => {
    const puntos: PuntoProgreso[] = [{ minutos: 720, porcentaje: 50 }];
    const { container } = render(<DailyProgressChart puntos={puntos} ahoraMinutos={800} />);
    const path = container.querySelector('.grafica-linea');
    const d = path?.getAttribute('d') ?? '';
    // Debe contener dos coordenadas Y distintas en x=165 (xDe(720)): el tramo
    // plano en 0% (y=120) y el salto vertical a 50% (y=67.5). Si el trazo
    // fuera diagonal, no habría dos comandos "L 165 ..." con Y distinta.
    expect(d).toContain('L 165 120');
    expect(d).toContain('L 165 67.5');
  });

  it('no dibuja proyección cuando ya es el final del día', () => {
    const { container } = render(<DailyProgressChart puntos={[]} ahoraMinutos={1440} />);
    expect(container.querySelector('.grafica-proyeccion')).toBeNull();
  });

  it('dibuja proyección atenuada cuando todavía queda día por delante', () => {
    const { container } = render(<DailyProgressChart puntos={[]} ahoraMinutos={800} />);
    expect(container.querySelector('.grafica-proyeccion')).not.toBeNull();
  });
});
