import type { Entry, Habit } from '../core/types';
import { isComplete } from '../core/completion';

interface Props {
  habit: Habit;
  entry: Entry | undefined;
  racha: number;
  onMarcar: (valor: boolean | number) => void;
}

export function HabitRow({ habit, entry, racha, onMarcar }: Props) {
  const completo = isComplete(habit, entry);

  if (habit.tipo === 'cantidad') {
    const actual = Number(entry?.valor ?? 0);
    return (
      <div className={`card fila ${completo ? 'completa' : ''}`}>
        <div className="fila-texto">
          <span className="fila-nombre">{habit.nombre}</span>
          {racha > 0 && <span className="racha" data-testid="racha">🔥 {racha}</span>}
        </div>
        <div className="contador">
          <button aria-label={`Restar uno a ${habit.nombre}`} onClick={() => onMarcar(Math.max(0, actual - 1))}>
            −
          </button>
          <span className="progreso">{actual}/{habit.objetivo}</span>
          <button aria-label={`Sumar uno a ${habit.nombre}`} onClick={() => onMarcar(actual + 1)}>
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className={`card fila fila-boton ${completo ? 'completa' : ''}`}
      onClick={() => onMarcar(!completo)}
      aria-pressed={completo}
    >
      <span className="fila-texto">
        <span className="fila-nombre">{habit.nombre}</span>
        {racha > 0 && <span className="racha" data-testid="racha">🔥 {racha}</span>}
      </span>
      <span className="check">{completo ? '✓' : ''}</span>
    </button>
  );
}
