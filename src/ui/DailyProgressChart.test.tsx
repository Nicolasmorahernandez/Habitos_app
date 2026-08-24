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
});
