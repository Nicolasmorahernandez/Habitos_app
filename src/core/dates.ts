import type { IsoDate, Weekday } from './types';

/** Único formato aceptado por fromIsoDate: año-mes-día, siempre con cero a la izquierda. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(d: Date): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(iso: IsoDate): Date {
  if (!ISO_DATE.test(iso)) {
    throw new Error(`Fecha inválida: se esperaba YYYY-MM-DD y se recibió "${iso}"`);
  }
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  // Date desborda en silencio: el 30 de febrero se convierte en el 2 de marzo.
  // Si el ida y vuelta no coincide, el día pedido no existe en el calendario.
  if (toIsoDate(fecha) !== iso) {
    throw new Error(`Fecha inválida: "${iso}" no existe en el calendario`);
  }
  return fecha;
}

/** Día natural local en el que cayó un timestamp ISO. */
export function isoDateOf(timestamp: string): IsoDate {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Timestamp inválido: "${timestamp}"`);
  }
  return toIsoDate(d);
}

export function weekdayOf(iso: IsoDate): Weekday {
  return fromIsoDate(iso).getDay() as Weekday;
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  const d = fromIsoDate(iso);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

export function datesBetween(desde: IsoDate, hasta: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  let cursor = desde;
  // La comparación de cadenas equivale al orden cronológico solo porque toIsoDate
  // rellena mes y día con cero a la izquierda (y fromIsoDate rechaza lo que no lo esté).
  // Ese invariante es el que sostiene este bucle: no lo rompas.
  while (cursor <= hasta) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** El día de hoy en hora local. Acepta un reloj para poder fijarlo en pruebas. */
export function hoy(ahora: Date = new Date()): IsoDate {
  return toIsoDate(ahora);
}

/** Minutos desde medianoche local de un timestamp ISO completo. */
export function minutosDelDia(timestamp: string): number {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Timestamp inválido: "${timestamp}"`);
  }
  return d.getHours() * 60 + d.getMinutes();
}
