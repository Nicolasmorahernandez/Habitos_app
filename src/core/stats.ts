import type { EntriesByDate, Habit, IsoDate } from './types';
import { scheduledDates } from './schedule';
import { isComplete } from './completion';

/**
 * Proporción de días programados cumplidos en el rango, entre 0 y 1.
 * Devuelve 0 si el rango no contiene ningún día programado.
 */
export function completionRate(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): number {
  const dias = scheduledDates(habit, desde, hasta);
  if (dias.length === 0) return 0;
  const cumplidos = dias.filter((d) => isComplete(habit, entries.get(d))).length;
  return cumplidos / dias.length;
}
