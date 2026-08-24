import type { EntriesByDate, Habit, IsoDate, Weekday } from './types';
import { datesBetween, weekdayOf } from './dates';
import { isScheduled } from './schedule';
import { isComplete } from './completion';

export interface HeatmapCell {
  fecha: IsoDate;
  weekday: Weekday;
  programado: boolean;
  completo: boolean;
}

export function buildHeatmap(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): HeatmapCell[] {
  return datesBetween(desde, hasta).map((fecha) => ({
    fecha,
    weekday: weekdayOf(fecha),
    programado: isScheduled(habit, fecha),
    completo: isComplete(habit, entries.get(fecha)),
  }));
}
