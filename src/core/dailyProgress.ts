import type { Habit, EntriesByHabitId } from './types';
import { isComplete } from './completion';
import { minutosDelDia } from './dates';

export interface PuntoProgreso {
  /** Minutos desde medianoche local en que se completó este hábito. */
  minutos: number;
  /** Porcentaje acumulado en ese instante, 0-100. */
  porcentaje: number;
}

/**
 * Progreso acumulado del día: un punto por cada hábito programado hoy que ya
 * está completado, en el instante en que se completó, repartiendo el 100%
 * en partes iguales entre los hábitos programados hoy. Los puntos vienen
 * ordenados por hora de marca ascendente.
 */
export function progresoDelDia(
  habitosHoy: Habit[],
  entradas: EntriesByHabitId,
): PuntoProgreso[] {
  if (habitosHoy.length === 0) return [];
  const paso = 100 / habitosHoy.length;

  const minutos: number[] = [];
  for (const h of habitosHoy) {
    const entry = entradas.get(h.id);
    if (entry && isComplete(h, entry)) minutos.push(minutosDelDia(entry.actualizado_en));
  }
  minutos.sort((a, b) => a - b);

  let acumulado = 0;
  return minutos.map((m) => {
    acumulado += paso;
    return { minutos: m, porcentaje: acumulado };
  });
}
