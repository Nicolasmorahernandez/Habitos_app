import type { IsoDate } from '../core/types';
import type { HeatmapCell } from '../core/heatmap';

interface Props {
  celdas: HeatmapCell[];
  onSeleccionar: (fecha: IsoDate) => void;
}

function clase(celda: HeatmapCell): string {
  if (!celda.programado) return 'libre';
  return celda.completo ? 'completo' : 'pendiente';
}

export function Heatmap({ celdas, onSeleccionar }: Props) {
  // La primera celda se desplaza para que cada columna sea una semana.
  const desplazamiento = celdas.length > 0 ? celdas[0].weekday : 0;

  return (
    <div className="heatmap" style={{ gridAutoFlow: 'column' }}>
      {Array.from({ length: desplazamiento }, (_, i) => (
        <span key={`hueco-${i}`} className="celda hueco" />
      ))}
      {celdas.map((c) => (
        <button
          key={c.fecha}
          aria-label={c.fecha}
          className={`celda ${clase(c)}`}
          onClick={() => onSeleccionar(c.fecha)}
        />
      ))}
    </div>
  );
}
