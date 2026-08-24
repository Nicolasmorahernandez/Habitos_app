import type { Habit, HabitType, Weekday } from '../core/types';
import { getDb } from './db';

export interface NuevoHabito {
  nombre: string;
  tipo: HabitType;
  objetivo: number | null;
  dias: Weekday[];
}

function ahora(): string {
  return new Date().toISOString();
}

function validar(input: NuevoHabito): void {
  if (!input.nombre.trim()) {
    throw new Error('El nombre no puede estar vacío');
  }
  if (input.tipo === 'cantidad' && (input.objetivo === null || input.objetivo <= 0)) {
    throw new Error('Un hábito de cantidad necesita un objetivo mayor que cero');
  }
}

export async function crearHabito(input: NuevoHabito): Promise<Habit> {
  validar(input);
  const db = await getDb();
  const existentes = await db.getAll('habits');
  const maxOrden = existentes.reduce((m, h) => Math.max(m, h.orden), -1);
  const ts = ahora();

  const habit: Habit = {
    id: crypto.randomUUID(),
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    objetivo: input.tipo === 'cantidad' ? input.objetivo : null,
    dias: input.dias,
    estado: 'nuevo',
    orden: maxOrden + 1,
    creado_en: ts,
    actualizado_en: ts,
  };

  await db.put('habits', habit);
  return habit;
}

export async function listarHabitos(
  opciones: { incluirArchivados?: boolean } = {},
): Promise<Habit[]> {
  const db = await getDb();
  const todos = await db.getAll('habits');
  const filtrados = opciones.incluirArchivados
    ? todos
    : todos.filter((h) => h.estado !== 'archivado');
  return filtrados.sort((a, b) => a.orden - b.orden);
}

export async function obtenerHabito(id: string): Promise<Habit | undefined> {
  const db = await getDb();
  return db.get('habits', id);
}

export async function actualizarHabito(
  id: string,
  cambios: Partial<Omit<Habit, 'id' | 'creado_en'>>,
): Promise<Habit> {
  // El get y el put son dos transacciones separadas, no una sola atómica.
  // Sin riesgo hoy (una sola pestaña, un solo usuario); revisar si el Plan 2
  // de sincronización introduce un segundo escritor sobre la misma IndexedDB.
  const db = await getDb();
  const actual = await db.get('habits', id);
  if (!actual) throw new Error(`El hábito ${id} no existe`);

  const siguiente: Habit = { ...actual, ...cambios, actualizado_en: ahora() };
  await db.put('habits', siguiente);
  return siguiente;
}

export async function archivarHabito(id: string): Promise<Habit> {
  return actualizarHabito(id, { estado: 'archivado' });
}
