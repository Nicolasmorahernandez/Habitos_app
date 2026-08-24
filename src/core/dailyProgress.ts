import type { Entry, Habit } from './types';
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
  entradas: Map<string, Entry>,
): PuntoProgreso[] {
  if (habitosHoy.length === 0) return [];
  const paso = 100 / habitosHoy.length;

  const completados = habitosHoy.filter((h) => isComplete(h, entradas.get(h.id)));

  const minutos = completados
    .map((h) => minutosDelDia(entradas.get(h.id)!.actualizado_en))
    .sort((a, b) => a - b);

  let acumulado = 0;
  return minutos.map((m) => {
    acumulado += paso;
    return { minutos: m, porcentaje: acumulado };
  });
}
