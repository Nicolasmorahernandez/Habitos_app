import type { EntriesByDate, Habit, IsoDate } from './types';
import { isoDateOf } from './dates';
import { isScheduled, previousScheduled, scheduledDates } from './schedule';
import { isComplete } from './completion';

/** Primer día que cuenta para el hábito: el de su creación. */
export function primerDia(habit: Habit): IsoDate {
  return isoDateOf(habit.creado_en);
}

/**
 * Días consecutivos cumplidos contando hacia atrás desde `hoy`, sobre los días
 * programados del hábito. Si hoy está programado pero aún sin cumplir, no
 * rompe la racha: se empieza a contar desde el día programado anterior.
 *
 * Camina hacia atrás con `previousScheduled` y para en el primer incumplimiento,
 * de modo que el coste depende de la longitud de la racha y no del historial
 * completo del hábito.
 */
export function currentStreak(habit: Habit, entries: EntriesByDate, hoy: IsoDate): number {
  const inicio = primerDia(habit);

  // Se empieza a contar en hoy solo si hoy está programado y ya está cumplido.
  // En cualquier otro caso (hoy no toca, o toca pero aún está sin marcar) se
  // arranca desde el día programado anterior: hoy sin marcar no rompe la racha.
  const hoyCuenta = isScheduled(habit, hoy) && isComplete(habit, entries.get(hoy));
  let cursor: IsoDate | null = hoyCuenta ? hoy : previousScheduled(habit, hoy);

  let racha = 0;
  while (cursor !== null && cursor >= inicio) {
    if (!isComplete(habit, entries.get(cursor))) break;
    racha++;
    cursor = previousScheduled(habit, cursor);
  }
  return racha;
}

/** Tramo consecutivo más largo de días programados cumplidos dentro del rango. */
export function longestStreak(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): number {
  const dias = scheduledDates(habit, desde, hasta);
  let mejor = 0;
  let actual = 0;
  for (const dia of dias) {
    if (isComplete(habit, entries.get(dia))) {
      actual++;
      if (actual > mejor) mejor = actual;
    } else {
      actual = 0;
    }
  }
  return mejor;
}
