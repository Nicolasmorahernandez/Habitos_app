import type { Entry, Habit } from '../core/types';
import { fromIsoDate } from '../core/dates';
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

function esHabitoValido(h: unknown): h is Habit {
  if (typeof h !== 'object' || h === null) return false;
  const x = h as Record<string, unknown>;
  if (
    typeof x.id !== 'string' || x.id.length === 0 ||
    typeof x.nombre !== 'string' ||
    !Array.isArray(x.dias) ||
    !x.dias.every((d) => typeof d === 'number' && d >= 0 && d <= 6) ||
    (x.estado !== 'nuevo' && x.estado !== 'consolidado' && x.estado !== 'archivado') ||
    typeof x.orden !== 'number' ||
    typeof x.creado_en !== 'string' ||
    typeof x.actualizado_en !== 'string'
  ) return false;

  if (x.tipo === 'booleano') return x.objetivo === null;
  if (x.tipo === 'cantidad') return typeof x.objetivo === 'number' && x.objetivo > 0;
  return false;
}

function esEntryValido(e: unknown): e is Entry {
  if (typeof e !== 'object' || e === null) return false;
  const x = e as Record<string, unknown>;
  if (
    typeof x.habit_id !== 'string' || x.habit_id.length === 0 ||
    typeof x.fecha !== 'string' ||
    (typeof x.valor !== 'boolean' && typeof x.valor !== 'number') ||
    typeof x.actualizado_en !== 'string'
  ) return false;

  try { fromIsoDate(x.fecha); return true; } catch { return false; }
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
  if (!b.habits.every(esHabitoValido) || !b.entries.every(esEntryValido)) {
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
