import type { Habit, IsoDate } from './types';
import { datesBetween, weekdayOf } from './dates';

export function isScheduled(habit: Habit, fecha: IsoDate): boolean {
  return habit.dias.includes(weekdayOf(fecha));
}

export function scheduledDates(habit: Habit, desde: IsoDate, hasta: IsoDate): IsoDate[] {
  return datesBetween(desde, hasta).filter((f) => isScheduled(habit, f));
}
