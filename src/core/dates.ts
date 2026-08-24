import type { IsoDate, Weekday } from './types';

export function toIsoDate(d: Date): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
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
  while (cursor <= hasta) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** El día de hoy en hora local. */
export function hoy(): IsoDate {
  return toIsoDate(new Date());
}
