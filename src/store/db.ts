import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Entry, Habit } from '../core/types';

export interface HabitDB extends DBSchema {
  habits: {
    key: string;
    value: Habit;
    indexes: { por_orden: number };
  };
  entries: {
    /** Clave compuesta [habit_id, fecha]. */
    key: [string, string];
    value: Entry;
    indexes: { por_fecha: string; por_habito: string };
  };
}

const NOMBRE_DB = 'habitos';
const VERSION_DB = 1;

let promesaDb: Promise<IDBPDatabase<HabitDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<HabitDB>> {
  if (!promesaDb) {
    promesaDb = openDB<HabitDB>(NOMBRE_DB, VERSION_DB, {
      upgrade(db) {
        const habits = db.createObjectStore('habits', { keyPath: 'id' });
        habits.createIndex('por_orden', 'orden');

        const entries = db.createObjectStore('entries', { keyPath: ['habit_id', 'fecha'] });
        entries.createIndex('por_fecha', 'fecha');
        entries.createIndex('por_habito', 'habit_id');
      },
    });
  }
  return promesaDb;
}

/** Solo para tests: descarta la conexión cacheada entre casos. */
export function resetDbCache(): void {
  promesaDb = null;
}

/** true si el navegador permite usar IndexedDB (falso en algunos modos privados). */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}
