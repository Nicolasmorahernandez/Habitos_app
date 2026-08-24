import type { PuntoProgreso } from '../core/dailyProgress';

const ANCHO = 320;
const ALTO = 150;
const X_INICIO = 30;
const X_FIN = 300;
const Y_ARRIBA = 15; // 100%
const Y_ABAJO = 120; // 0%
const MINUTOS_DIA = 24 * 60;

function xDe(minutos: number): number {
  return X_INICIO + (minutos / MINUTOS_DIA) * (X_FIN - X_INICIO);
}

function yDe(porcentaje: number): number {
  return Y_ABAJO - (porcentaje / 100) * (Y_ABAJO - Y_ARRIBA);
}

interface Props {
  puntos: PuntoProgreso[];
  /** Minuto actual del día, para dibujar la línea de "ahora" y cortar el trazo real ahí. */
  ahoraMinutos: number;
}

export function DailyProgressChart({ puntos, ahoraMinutos }: Props) {
  const porcentajeActual = puntos.length > 0 ? puntos[puntos.length - 1].porcentaje : 0;

  // Trazo escalonado: plano hasta la hora de cada marca, salto vertical ahí.
  const segmentos: string[] = [`M ${xDe(0)} ${yDe(0)}`];
  let yActual = yDe(0);
  for (const p of puntos) {
    const x = xDe(p.minutos);
    segmentos.push(`L ${x} ${yActual}`);
    yActual = yDe(p.porcentaje);
    segmentos.push(`L ${x} ${yActual}`);
  }
  segmentos.push(`L ${xDe(ahoraMinutos)} ${yActual}`);

  const hayProyeccion = ahoraMinutos < MINUTOS_DIA;

  return (
    <div className="card grafica-progreso">
      <h2>Progreso de hoy</h2>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={`Progreso de hoy: ${Math.round(porcentajeActual)}% completado`}
      >
        <line x1={X_INICIO} y1={Y_ARRIBA} x2={X_INICIO} y2={Y_ABAJO} className="grafica-eje" />
        <line x1={X_INICIO} y1={Y_ABAJO} x2={X_FIN} y2={Y_ABAJO} className="grafica-eje" />
        <text x="2" y={Y_ARRIBA + 4} className="grafica-etiqueta">100%</text>
        <text x="8" y={Y_ABAJO + 4} className="grafica-etiqueta">0%</text>
        <text x={X_INICIO - 4} y={Y_ABAJO + 15} className="grafica-etiqueta">00h</text>
        <text x={X_FIN - 18} y={Y_ABAJO + 15} className="grafica-etiqueta">24h</text>

        <line
          x1={xDe(ahoraMinutos)}
          y1={Y_ARRIBA}
          x2={xDe(ahoraMinutos)}
          y2={Y_ABAJO}
          className="grafica-ahora"
        />

        <path d={segmentos.join(' ')} className="grafica-linea" />

        {hayProyeccion && (
          <line
            x1={xDe(ahoraMinutos)}
            y1={yActual}
            x2={X_FIN}
            y2={yActual}
            className="grafica-proyeccion"
          />
        )}

        {puntos.map((p) => (
          <circle key={p.minutos} cx={xDe(p.minutos)} cy={yDe(p.porcentaje)} r={4} className="grafica-punto" />
        ))}

        <text
          x={xDe(ahoraMinutos) + 6}
          y={yActual - 6}
          className="grafica-valor"
          data-testid="grafica-valor-actual"
        >
          {Math.round(porcentajeActual)}%
        </text>
      </svg>
    </div>
  );
}
