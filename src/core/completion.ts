import type { Entry, Habit } from './types';

export function isComplete(habit: Habit, entry: Entry | undefined): boolean {
  if (!entry) return false;
  if (habit.tipo === 'booleano') return entry.valor === true;
  const objetivo = habit.objetivo ?? 1;
  return Number(entry.valor) >= objetivo;
}
