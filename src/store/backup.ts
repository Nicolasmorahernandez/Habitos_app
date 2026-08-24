import type { Entry, Habit } from '../core/types';
import { getDb } from './db';

const VERSION_BACKUP = 1;

interface Backup {
  version: number;
  habits: Habit[];
  entries: Entry[];
}

export async function exportarJSON(): Promise<string> {
  const db = await getDb();
  const backup: Backup = {
    version: VERSION_BACKUP,
    habits: await db.getAll('habits'),
    entries: await db.getAll('entries'),
  };
  return JSON.stringify(backup, null, 2);
}

function parsear(texto: string): Backup {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new Error('El fichero no es un JSON válido');
  }

  const b = datos as Partial<Backup>;
  if (!Array.isArray(b.habits) || !Array.isArray(b.entries)) {
    throw new Error('El fichero no tiene el formato de una copia de seguridad');
  }
  if (b.version !== VERSION_BACKUP) {
    throw new Error(`Versión de copia no soportada: ${String(b.version)}`);
  }
  return b as Backup;
}

/**
 * Reemplaza todo el contenido local por el de la copia.
 * Se valida antes de tocar la base: si el JSON es inválido, nada cambia.
 */
export async function importarJSON(texto: string): Promise<void> {
  const backup = parsear(texto);
  const db = await getDb();
  const tx = db.transaction(['habits', 'entries'], 'readwrite');

  await tx.objectStore('habits').clear();
  await tx.objectStore('entries').clear();
  for (const h of backup.habits) await tx.objectStore('habits').put(h);
  for (const e of backup.entries) await tx.objectStore('entries').put(e);

  await tx.done;
}
