import type { EntriesByDate, Habit, IsoDate } from './types';
import { scheduledDates } from './schedule';
import { isComplete } from './completion';
import { primerDia } from './streaks';

/**
 * Proporción de días programados cumplidos en el rango, entre 0 y 1.
 * Devuelve 0 si el rango no contiene ningún día programado.
 * El inicio del rango se recorta a la fecha de creación del hábito: los días
 * previos no cuentan como "programados sin cumplir".
 */
export function completionRate(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): number {
  const inicio = primerDia(habit);
  const dias = scheduledDates(habit, desde > inicio ? desde : inicio, hasta);
  if (dias.length === 0) return 0;
  const cumplidos = dias.filter((d) => isComplete(habit, entries.get(d))).length;
  return cumplidos / dias.length;
}
