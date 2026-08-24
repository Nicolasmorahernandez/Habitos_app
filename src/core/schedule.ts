import type { Habit, IsoDate } from './types';
import { addDays, datesBetween, weekdayOf } from './dates';

export function isScheduled(habit: Habit, fecha: IsoDate): boolean {
  return habit.dias.includes(weekdayOf(fecha));
}

export function scheduledDates(habit: Habit, desde: IsoDate, hasta: IsoDate): IsoDate[] {
  return datesBetween(desde, hasta).filter((f) => isScheduled(habit, f));
}

/** Día programado más reciente estrictamente anterior a `fecha`, o null si el hábito no tiene días. */
export function previousScheduled(habit: Habit, fecha: IsoDate): IsoDate | null {
  // Sin días programados no hay nada que encontrar, y sin esta guarda el bucle
  // recorrería los siete días para nada.
  if (habit.dias.length === 0) return null;
  // Cualquier semana contiene todos los días programados posibles: siete pasos bastan.
  for (let n = 1; n <= 7; n++) {
    const candidato = addDays(fecha, -n);
    if (isScheduled(habit, candidato)) return candidato;
  }
  return null;
}
