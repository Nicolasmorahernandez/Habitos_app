import type { Entry, Habit } from './types';

export function isComplete(habit: Habit, entry: Entry | undefined): boolean {
  if (!entry) return false;
  if (habit.tipo === 'booleano') return entry.valor === true;
  // Un valor que no es número contradice el tipo del hábito: se trata como incompleto,
  // igual que la rama booleana rechaza cualquier cosa que no sea true.
  if (typeof entry.valor !== 'number') return false;
  // Un hábito 'cantidad' sin objetivo es un estado que el tipo declara imposible;
  // si aparece, se degrada al mínimo útil: cualquier valor positivo cuenta.
  const objetivo = habit.objetivo ?? 1;
  return entry.valor >= objetivo;
}
