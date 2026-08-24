/** Fecha como día natural en hora local, formato YYYY-MM-DD. */
export type IsoDate = string;

/** 0 = domingo, 1 = lunes, ... 6 = sábado. Coincide con Date#getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HabitType = 'booleano' | 'cantidad';

export type HabitState = 'nuevo' | 'consolidado' | 'archivado';

export interface Habit {
  id: string;
  nombre: string;
  tipo: HabitType;
  /** Meta numérica. Obligatorio si tipo === 'cantidad', si no null. */
  objetivo: number | null;
  /** Días de la semana en que el hábito está programado. */
  dias: Weekday[];
  estado: HabitState;
  /** Posición manual en las listas. */
  orden: number;
  creado_en: string;
  actualizado_en: string;
}

export interface Entry {
  habit_id: string;
  fecha: IsoDate;
  /** boolean si el hábito es 'booleano', number si es 'cantidad'. */
  valor: boolean | number;
  actualizado_en: string;
}

/** Anotaciones de un hábito indexadas por fecha, tal como las consumen core/streaks y core/stats. */
export type EntriesByDate = Map<IsoDate, Entry>;
