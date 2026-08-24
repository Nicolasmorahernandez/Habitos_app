import type { EntriesByDate, Entry, IsoDate } from '../core/types';
import { getDb } from './db';

export async function marcarHabito(
  habit_id: string,
  fecha: IsoDate,
  valor: boolean | number,
): Promise<Entry> {
  const db = await getDb();
  const entry: Entry = { habit_id, fecha, valor, actualizado_en: new Date().toISOString() };
  await db.put('entries', entry);
  return entry;
}

export async function entriesDeFecha(fecha: IsoDate): Promise<Entry[]> {
  const db = await getDb();
  return db.getAllFromIndex('entries', 'por_fecha', fecha);
}

export async function entriesDeHabito(habit_id: string): Promise<Entry[]> {
  const db = await getDb();
  return db.getAllFromIndex('entries', 'por_habito', habit_id);
}

/** Anotaciones de un hábito indexadas por fecha, el formato que espera core/. */
export async function mapaDeEntries(habit_id: string): Promise<EntriesByDate> {
  const lista = await entriesDeHabito(habit_id);
  return new Map(lista.map((e) => [e.fecha, e]));
}
