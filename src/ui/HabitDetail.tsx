import type { EntriesByDate, Habit } from '../core/types';
import { addDays, hoy as fechaDeHoy } from '../core/dates';
import { currentStreak, longestStreak, primerDia } from '../core/streaks';
import { completionRate } from '../core/stats';

interface Props {
  habit: Habit;
  entries: EntriesByDate;
}

export function HabitDetail({ habit, entries }: Props) {
  const hasta = fechaDeHoy();
  const desdeCreacion = primerDia(habit);
  const ultimos30 = addDays(hasta, -29);

  const actual = currentStreak(habit, entries, hasta);
  const maxima = longestStreak(habit, entries, desdeCreacion, hasta);
  const ratio = completionRate(habit, entries, ultimos30, hasta);

  return (
    <section className="card estadisticas">
      <div>
        <span className="dato" data-testid="racha-actual">{actual}</span>
        <span className="etiqueta">racha actual</span>
      </div>
      <div>
        <span className="dato" data-testid="racha-maxima">{maxima}</span>
        <span className="etiqueta">racha máxima</span>
      </div>
      <div>
        <span className="dato" data-testid="cumplimiento">{Math.round(ratio * 100)}%</span>
        <span className="etiqueta">últimos 30 días</span>
      </div>
    </section>
  );
}
