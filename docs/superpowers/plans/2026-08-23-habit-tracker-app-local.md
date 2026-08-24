# Habit Tracker — Plan 1: App local-first

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una PWA de seguimiento de hábitos completamente funcional y offline, con IndexedDB como fuente de verdad, según `docs/superpowers/specs/2026-08-23-habit-tracker-design.md`.

**Architecture:** Tres capas con fronteras estrictas. `core/` contiene lógica de dominio pura (fechas, programación semanal, rachas, estadísticas) sin dependencias de React ni de la base de datos. `store/` envuelve IndexedDB y expone operaciones de dominio. `ui/` son componentes React que leen del store y derivan lo que muestran con `core`. La sincronización con Cloudflare queda para el Plan 2; este plan deja el campo `actualizado_en` ya presente en todos los registros para que el sync no requiera migración.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, `idb` (envoltorio de IndexedDB), `fake-indexeddb` (tests), `@testing-library/react`, `vite-plugin-pwa`.

---

## Estructura de ficheros

```
src/
  core/
    types.ts        Tipos del dominio. Sin lógica.
    dates.ts        Aritmética de fechas sobre strings YYYY-MM-DD en hora local.
    schedule.ts     Qué días toca un hábito, hacia delante y hacia atrás.
    completion.ts   Si una anotación cuenta como completada.
    streaks.ts      Racha actual y racha máxima.
    stats.ts        Porcentaje de cumplimiento.
    heatmap.ts      Construcción de la cuadrícula del historial.
  store/
    db.ts           Apertura y esquema de IndexedDB.
    habits.ts       CRUD de hábitos.
    entries.ts      Lectura y escritura de anotaciones.
    backup.ts       Exportar e importar JSON.
  ui/
    App.tsx             Shell + navegación por pestañas.
    TabBar.tsx          Barra inferior.
    TodayScreen.tsx     Pantalla Hoy.
    HabitRow.tsx        Fila de un hábito (booleano y de cantidad).
    HistoryScreen.tsx   Heatmap + edición de días pasados.
    Heatmap.tsx         Render de la cuadrícula.
    HabitDetail.tsx     Estadísticas y acciones de un hábito.
    SettingsScreen.tsx  Gestión de hábitos, backup.
    HabitForm.tsx       Alta y edición de hábito.
    useHabits.ts        Hook de carga y refresco de hábitos.
  styles.css
  main.tsx
```

**Desviación consciente respecto a la spec:** la spec describe "Detalle de hábito"
como una cuarta pantalla propia. En este plan se descompone en dos piezas que ya
tienen sitio natural: el panel de estadísticas (`HabitDetail`) vive debajo del
heatmap en Historial, que es donde el usuario ya está mirando ese hábito, y las
acciones de estado (consolidar, archivar) viven en Ajustes junto al resto de la
gestión de hábitos. Se evita así una pantalla de navegación adicional sin perder
ninguna funcionalidad de la spec. Si al usarla resulta que hace falta la pantalla
independiente, extraerla es trivial porque `HabitDetail` ya es un componente
autónomo.

Regla que ningún task puede romper: **`ui/` nunca importa de `store/db.ts` ni usa `indexedDB` directamente, y `core/` no importa nada de `store/` ni de `react`.**

---

## Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/ui/App.tsx`, `src/styles.css`

- [ ] **Step 1: Crear el proyecto con Vite**

```bash
cd /Users/katsa/Documents/proyectos/Habitos_app
npm create vite@latest . -- --template react-ts
```

Si el CLI se queja de que el directorio no está vacío, elige la opción "Ignore files and continue".

- [ ] **Step 2: Instalar dependencias**

```bash
npm install
npm install idb
npm install -D vitest @vitest/coverage-v8 fake-indexeddb @testing-library/react @testing-library/user-event jsdom vite-plugin-pwa
```

- [ ] **Step 3: Configurar Vitest en `vite.config.ts`**

Reemplaza el contenido completo del fichero:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

Importante: `defineConfig` viene de `vitest/config`, no de `vite`. Vitest 4 eliminó la
ampliación del tipo de configuración de Vite, así que la variante con
`/// <reference types="vitest" />` e import desde `'vite'` falla con
`TS2769: 'test' does not exist in type 'UserConfigExport'`.

- [ ] **Step 4: Crear `src/test-setup.ts`**

```ts
import 'fake-indexeddb/auto';
```

Esto instala una implementación en memoria de IndexedDB en todos los tests, de modo que `store/` se pueda probar sin navegador.

- [ ] **Step 5: Añadir el script de test a `package.json`**

En la sección `"scripts"`, añade:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verificar que todo arranca**

```bash
npm run build
npm run test
```

Esperado: el build termina sin errores. `npm run test` termina con "No test files found" (código de salida 1 en algunas versiones — es correcto en este punto, aún no hay tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react + typescript + vitest"
```

---

## Task 2: Tipos del dominio

**Files:**
- Create: `src/core/types.ts`

No lleva tests: es un fichero solo de tipos, sin comportamiento que verificar. Los tasks siguientes lo ejercitan.

- [ ] **Step 1: Escribir `src/core/types.ts`**

```ts
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
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc -b --force
```

Esperado: sin errores. Nota: el `tsconfig.json` que genera Vite es un fichero de
solución (`"files": []` con `references`), de modo que `npx tsc --noEmit` no compila
nada y siempre pasa. Usa `tsc -b --force`, que sí recorre `src/`. Lo mismo aplica a
todas las comprobaciones de tipos del resto del plan.

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat(core): add domain types"
```

---

## Task 3: Aritmética de fechas

Toda la app usa strings `YYYY-MM-DD` en hora **local**. Usar UTC aquí es el error clásico: en España, `new Date().toISOString()` a las 00:30 devuelve el día anterior, y el usuario vería su hábito marcado en el día equivocado.

**Files:**
- Create: `src/core/dates.ts`
- Test: `src/core/dates.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { toIsoDate, fromIsoDate, weekdayOf, addDays, datesBetween } from './dates';

describe('toIsoDate', () => {
  it('formatea una fecha local como YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 23))).toBe('2026-08-23');
  });

  it('rellena mes y día con cero a la izquierda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('usa el día local, no el UTC, justo después de medianoche', () => {
    // 00:30 local del 23 de agosto sigue siendo el día 23, aunque en UTC sea el 22.
    expect(toIsoDate(new Date(2026, 7, 23, 0, 30))).toBe('2026-08-23');
  });
});

describe('fromIsoDate', () => {
  it('devuelve la medianoche local del día indicado', () => {
    const d = fromIsoDate('2026-08-23');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(23);
    expect(d.getHours()).toBe(0);
  });

  it('es la inversa de toIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-02-28'))).toBe('2026-02-28');
    expect(toIsoDate(fromIsoDate('2028-02-29'))).toBe('2028-02-29');
  });
});

describe('weekdayOf', () => {
  it('devuelve 0 para domingo', () => {
    expect(weekdayOf('2026-08-23')).toBe(0);
  });

  it('devuelve 1 para lunes', () => {
    expect(weekdayOf('2026-08-24')).toBe(1);
  });
});

describe('addDays', () => {
  it('suma días dentro del mismo mes', () => {
    expect(addDays('2026-08-23', 3)).toBe('2026-08-26');
  });

  it('cruza el límite de mes', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('cruza el límite de año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('resta con números negativos', () => {
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('maneja febrero de un año bisiesto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('datesBetween', () => {
  it('incluye ambos extremos', () => {
    expect(datesBetween('2026-08-23', '2026-08-26')).toEqual([
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
    ]);
  });

  it('devuelve un solo día cuando los extremos coinciden', () => {
    expect(datesBetween('2026-08-23', '2026-08-23')).toEqual(['2026-08-23']);
  });

  it('devuelve vacío si el fin es anterior al inicio', () => {
    expect(datesBetween('2026-08-26', '2026-08-23')).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/dates.test.ts`
Esperado: FAIL — `Failed to resolve import "./dates"`.

- [ ] **Step 3: Implementar `src/core/dates.ts`**

```ts
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
```

Nota sobre `datesBetween`: la comparación `cursor <= hasta` funciona porque el formato `YYYY-MM-DD` ordena lexicográficamente igual que cronológicamente. Esa propiedad se usa en todo el código; es la razón de elegir este formato.

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/dates.test.ts`
Esperado: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/dates.ts src/core/dates.test.ts
git commit -m "feat(core): add local-time date arithmetic"
```

---

## Task 4: Programación semanal

**Files:**
- Create: `src/core/schedule.ts`
- Test: `src/core/schedule.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { isScheduled, scheduledDates } from './schedule';
import type { Habit } from './types';

function habito(dias: Habit['dias']): Habit {
  return {
    id: 'h1',
    nombre: 'Gimnasio',
    tipo: 'booleano',
    objetivo: null,
    dias,
    estado: 'nuevo',
    orden: 0,
    creado_en: '2026-08-01T10:00:00.000Z',
    actualizado_en: '2026-08-01T10:00:00.000Z',
  };
}

describe('isScheduled', () => {
  it('es true en un día programado', () => {
    // 2026-08-24 es lunes.
    expect(isScheduled(habito([1, 3, 5]), '2026-08-24')).toBe(true);
  });

  it('es false en un día no programado', () => {
    // 2026-08-25 es martes.
    expect(isScheduled(habito([1, 3, 5]), '2026-08-25')).toBe(false);
  });

  it('es true todos los días si están los siete', () => {
    const h = habito([0, 1, 2, 3, 4, 5, 6]);
    expect(isScheduled(h, '2026-08-23')).toBe(true);
    expect(isScheduled(h, '2026-08-25')).toBe(true);
  });

  it('es false siempre si no hay días programados', () => {
    expect(isScheduled(habito([]), '2026-08-24')).toBe(false);
  });
});

describe('scheduledDates', () => {
  it('devuelve solo los días programados del rango, en orden', () => {
    // Del lunes 24 al domingo 30 de agosto de 2026.
    expect(scheduledDates(habito([1, 3, 5]), '2026-08-24', '2026-08-30')).toEqual([
      '2026-08-24', // lunes
      '2026-08-26', // miércoles
      '2026-08-28', // viernes
    ]);
  });

  it('devuelve vacío si ningún día del rango está programado', () => {
    expect(scheduledDates(habito([0]), '2026-08-24', '2026-08-26')).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/schedule.test.ts`
Esperado: FAIL — `Failed to resolve import "./schedule"`.

- [ ] **Step 3: Implementar `src/core/schedule.ts`**

```ts
import type { Habit, IsoDate } from './types';
import { datesBetween, weekdayOf } from './dates';

export function isScheduled(habit: Habit, fecha: IsoDate): boolean {
  return habit.dias.includes(weekdayOf(fecha));
}

export function scheduledDates(habit: Habit, desde: IsoDate, hasta: IsoDate): IsoDate[] {
  return datesBetween(desde, hasta).filter((f) => isScheduled(habit, f));
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/schedule.test.ts`
Esperado: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/schedule.ts src/core/schedule.test.ts
git commit -m "feat(core): add weekly scheduling"
```

---

## Task 5: Criterio de completado

**Files:**
- Create: `src/core/completion.ts`
- Test: `src/core/completion.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { isComplete } from './completion';
import type { Entry, Habit } from './types';

const booleano: Habit = {
  id: 'h1', nombre: 'Meditar', tipo: 'booleano', objetivo: null,
  dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

const cantidad: Habit = { ...booleano, id: 'h2', nombre: 'Agua', tipo: 'cantidad', objetivo: 8 };

function entrada(valor: boolean | number): Entry {
  return { habit_id: 'h1', fecha: '2026-08-23', valor, actualizado_en: '2026-08-23T10:00:00.000Z' };
}

describe('isComplete', () => {
  it('no está completo si no hay anotación', () => {
    expect(isComplete(booleano, undefined)).toBe(false);
    expect(isComplete(cantidad, undefined)).toBe(false);
  });

  it('booleano: completo cuando el valor es true', () => {
    expect(isComplete(booleano, entrada(true))).toBe(true);
    expect(isComplete(booleano, entrada(false))).toBe(false);
  });

  it('cantidad: completo al alcanzar el objetivo', () => {
    expect(isComplete(cantidad, entrada(8))).toBe(true);
  });

  it('cantidad: completo al superar el objetivo', () => {
    expect(isComplete(cantidad, entrada(10))).toBe(true);
  });

  it('cantidad: incompleto por debajo del objetivo', () => {
    expect(isComplete(cantidad, entrada(7))).toBe(false);
  });

  it('cantidad: un cero no está completo', () => {
    expect(isComplete(cantidad, entrada(0))).toBe(false);
  });

  it('cantidad sin objetivo definido: basta con un valor mayor que cero', () => {
    const sinObjetivo = { ...cantidad, objetivo: null };
    expect(isComplete(sinObjetivo, entrada(1))).toBe(true);
    expect(isComplete(sinObjetivo, entrada(0))).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/completion.test.ts`
Esperado: FAIL — `Failed to resolve import "./completion"`.

- [ ] **Step 3: Implementar `src/core/completion.ts`**

```ts
import type { Entry, Habit } from './types';

export function isComplete(habit: Habit, entry: Entry | undefined): boolean {
  if (!entry) return false;
  if (habit.tipo === 'booleano') return entry.valor === true;
  const objetivo = habit.objetivo ?? 1;
  return Number(entry.valor) >= objetivo;
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/completion.test.ts`
Esperado: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/completion.ts src/core/completion.test.ts
git commit -m "feat(core): add completion criteria"
```

---

## Task 6: Rachas

Es la lógica más delicada del proyecto. Dos reglas explícitas, ambas verificadas por los tests:

1. **La racha se cuenta sobre días programados.** Un plan lunes/miércoles/viernes no se rompe por no cumplir el martes.
2. **El día de hoy no rompe la racha si aún no se ha marcado.** Si hoy toca y no lo has hecho todavía, la racha sigue mostrando lo acumulado hasta el día programado anterior. Sin esta regla, la racha se pondría a cero cada mañana.

**Files:**
- Create: `src/core/streaks.ts`
- Test: `src/core/streaks.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { currentStreak, longestStreak } from './streaks';
import type { Entry, EntriesByDate, Habit, IsoDate } from './types';

/** Hábito booleano de lunes, miércoles y viernes. */
const lmv: Habit = {
  id: 'h1', nombre: 'Gimnasio', tipo: 'booleano', objetivo: null,
  dias: [1, 3, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

/** Hábito booleano diario. */
const diario: Habit = { ...lmv, id: 'h2', nombre: 'Leer', dias: [0, 1, 2, 3, 4, 5, 6] };

function hechos(fechas: IsoDate[]): EntriesByDate {
  const m = new Map<IsoDate, Entry>();
  for (const f of fechas) {
    m.set(f, { habit_id: 'h1', fecha: f, valor: true, actualizado_en: `${f}T10:00:00.000Z` });
  }
  return m;
}

describe('currentStreak', () => {
  it('es 0 cuando no hay ninguna anotación', () => {
    expect(currentStreak(diario, new Map(), '2026-08-23')).toBe(0);
  });

  it('cuenta días consecutivos en un hábito diario', () => {
    const e = hechos(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(currentStreak(diario, e, '2026-08-23')).toBe(3);
  });

  it('se detiene en el primer día incumplido', () => {
    // Falta el 22.
    const e = hechos(['2026-08-20', '2026-08-21', '2026-08-23']);
    expect(currentStreak(diario, e, '2026-08-23')).toBe(1);
  });

  it('no se rompe por los días no programados intercalados', () => {
    // Lunes 24, miércoles 26 y viernes 28 de agosto de 2026.
    const e = hechos(['2026-08-24', '2026-08-26', '2026-08-28']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(3);
  });

  it('sí se rompe al saltarse un día programado', () => {
    // Falta el miércoles 26.
    const e = hechos(['2026-08-24', '2026-08-28']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(1);
  });

  it('mantiene la racha si hoy toca pero aún no se ha marcado', () => {
    // Hoy es viernes 28 y está sin marcar; lunes y miércoles sí.
    const e = hechos(['2026-08-24', '2026-08-26']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(2);
  });

  it('es 0 si hoy no está marcado y el día programado anterior tampoco', () => {
    const e = hechos(['2026-08-24']);
    expect(currentStreak(lmv, e, '2026-08-28')).toBe(0);
  });

  it('no cuenta días anteriores a la creación del hábito', () => {
    const creadoEl21 = { ...diario, creado_en: '2026-08-21T10:00:00.000Z' };
    const e = hechos(['2026-08-21', '2026-08-22', '2026-08-23']);
    expect(currentStreak(creadoEl21, e, '2026-08-23')).toBe(3);
  });

  it('atraviesa el cambio de mes', () => {
    const e = hechos(['2026-08-30', '2026-08-31', '2026-09-01']);
    expect(currentStreak(diario, e, '2026-09-01')).toBe(3);
  });

  it('atraviesa el cambio de año', () => {
    const e = hechos(['2026-12-31', '2027-01-01']);
    expect(currentStreak(diario, e, '2027-01-01')).toBe(2);
  });
});

describe('longestStreak', () => {
  it('es 0 sin anotaciones', () => {
    expect(longestStreak(diario, new Map(), '2026-08-01', '2026-08-31')).toBe(0);
  });

  it('encuentra el tramo más largo entre varios', () => {
    // Tramos de 2, 4 y 1 día.
    const e = hechos([
      '2026-08-01', '2026-08-02',
      '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08',
      '2026-08-12',
    ]);
    expect(longestStreak(diario, e, '2026-08-01', '2026-08-31')).toBe(4);
  });

  it('cuenta sobre días programados en un hábito no diario', () => {
    // Lunes 3, miércoles 5, viernes 7 de agosto de 2026: tres programados seguidos.
    const e = hechos(['2026-08-03', '2026-08-05', '2026-08-07']);
    expect(longestStreak(lmv, e, '2026-08-01', '2026-08-31')).toBe(3);
  });

  it('un día pasado rellenado reconecta dos tramos', () => {
    const sinPuente = hechos(['2026-08-01', '2026-08-02', '2026-08-04', '2026-08-05']);
    expect(longestStreak(diario, sinPuente, '2026-08-01', '2026-08-31')).toBe(2);

    const conPuente = hechos([
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
    ]);
    expect(longestStreak(diario, conPuente, '2026-08-01', '2026-08-31')).toBe(5);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/streaks.test.ts`
Esperado: FAIL — `Failed to resolve import "./streaks"`.

- [ ] **Step 3: Implementar `src/core/streaks.ts`**

```ts
import type { EntriesByDate, Habit, IsoDate } from './types';
import { isoDateOf } from './dates';
import { isScheduled, previousScheduled, scheduledDates } from './schedule';
import { isComplete } from './completion';

/** Primer día que cuenta para el hábito: el de su creación. */
export function primerDia(habit: Habit): IsoDate {
  return isoDateOf(habit.creado_en);
}

/**
 * Días consecutivos cumplidos contando hacia atrás desde `hoy`, sobre los días
 * programados del hábito. Si hoy está programado pero aún sin cumplir, no
 * rompe la racha: se empieza a contar desde el día programado anterior.
 *
 * Camina hacia atrás con `previousScheduled` y para en el primer incumplimiento,
 * de modo que el coste depende de la longitud de la racha y no del historial
 * completo del hábito.
 */
export function currentStreak(habit: Habit, entries: EntriesByDate, hoy: IsoDate): number {
  const inicio = primerDia(habit);

  // Se empieza a contar en hoy solo si hoy está programado y ya está cumplido.
  // En cualquier otro caso (hoy no toca, o toca pero aún está sin marcar) se
  // arranca desde el día programado anterior: hoy sin marcar no rompe la racha.
  const hoyCuenta = isScheduled(habit, hoy) && isComplete(habit, entries.get(hoy));
  let cursor: IsoDate | null = hoyCuenta ? hoy : previousScheduled(habit, hoy);

  let racha = 0;
  while (cursor !== null && cursor >= inicio) {
    if (!isComplete(habit, entries.get(cursor))) break;
    racha++;
    cursor = previousScheduled(habit, cursor);
  }
  return racha;
}

/** Tramo consecutivo más largo de días programados cumplidos dentro del rango. */
export function longestStreak(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): number {
  const dias = scheduledDates(habit, desde, hasta);
  let mejor = 0;
  let actual = 0;
  for (const dia of dias) {
    if (isComplete(habit, entries.get(dia))) {
      actual++;
      if (actual > mejor) mejor = actual;
    } else {
      actual = 0;
    }
  }
  return mejor;
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/streaks.test.ts`
Esperado: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/streaks.ts src/core/streaks.test.ts
git commit -m "feat(core): add current and longest streak calculation"
```

---

## Task 7: Porcentaje de cumplimiento

El denominador son los **días programados** del rango, no los días naturales. Con un hábito de tres días por semana, usar días naturales daría un máximo de 43% aunque no falles ni uno solo.

**Files:**
- Create: `src/core/stats.ts`
- Test: `src/core/stats.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { completionRate } from './stats';
import type { Entry, EntriesByDate, Habit, IsoDate } from './types';

const lmv: Habit = {
  id: 'h1', nombre: 'Gimnasio', tipo: 'booleano', objetivo: null,
  dias: [1, 3, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

function hechos(fechas: IsoDate[]): EntriesByDate {
  const m = new Map<IsoDate, Entry>();
  for (const f of fechas) {
    m.set(f, { habit_id: 'h1', fecha: f, valor: true, actualizado_en: `${f}T10:00:00.000Z` });
  }
  return m;
}

describe('completionRate', () => {
  it('es 0 cuando el rango no tiene días programados', () => {
    // Del martes 25 al jueves 27 no hay ningún lunes, miércoles ni viernes... salvo el 26.
    // Usamos un rango de un solo martes para que no haya días programados.
    expect(completionRate(lmv, new Map(), '2026-08-25', '2026-08-25')).toBe(0);
  });

  it('es 1 cuando se cumplen todos los días programados', () => {
    // Semana del lunes 24 al domingo 30: programados 24, 26 y 28.
    const e = hechos(['2026-08-24', '2026-08-26', '2026-08-28']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBe(1);
  });

  it('divide entre días programados, no entre días naturales', () => {
    // 3 programados en la semana, 2 cumplidos.
    const e = hechos(['2026-08-24', '2026-08-26']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBeCloseTo(2 / 3);
  });

  it('ignora anotaciones en días no programados', () => {
    // El martes 25 no cuenta ni para bien ni para mal.
    const e = hechos(['2026-08-24', '2026-08-25']);
    expect(completionRate(lmv, e, '2026-08-24', '2026-08-30')).toBeCloseTo(1 / 3);
  });

  it('es 0 cuando no se cumple ninguno', () => {
    expect(completionRate(lmv, new Map(), '2026-08-24', '2026-08-30')).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/stats.test.ts`
Esperado: FAIL — `Failed to resolve import "./stats"`.

- [ ] **Step 3: Implementar `src/core/stats.ts`**

```ts
import type { EntriesByDate, Habit, IsoDate } from './types';
import { scheduledDates } from './schedule';
import { isComplete } from './completion';

/**
 * Proporción de días programados cumplidos en el rango, entre 0 y 1.
 * Devuelve 0 si el rango no contiene ningún día programado.
 */
export function completionRate(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): number {
  const dias = scheduledDates(habit, desde, hasta);
  if (dias.length === 0) return 0;
  const cumplidos = dias.filter((d) => isComplete(habit, entries.get(d))).length;
  return cumplidos / dias.length;
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/stats.test.ts`
Esperado: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/stats.ts src/core/stats.test.ts
git commit -m "feat(core): add completion rate over scheduled days"
```

---

## Task 8: Cuadrícula del heatmap

Separar el cálculo de la cuadrícula del componente que la pinta permite probar la parte difícil (alineación de semanas, celdas de relleno) sin renderizar nada.

**Files:**
- Create: `src/core/heatmap.ts`
- Test: `src/core/heatmap.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { buildHeatmap } from './heatmap';
import type { Entry, EntriesByDate, Habit } from './types';

const lmv: Habit = {
  id: 'h1', nombre: 'Gimnasio', tipo: 'booleano', objetivo: null,
  dias: [1, 3, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

const entries: EntriesByDate = new Map<string, Entry>([
  ['2026-08-24', { habit_id: 'h1', fecha: '2026-08-24', valor: true, actualizado_en: 'x' }],
]);

describe('buildHeatmap', () => {
  it('devuelve una celda por día natural del rango', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas).toHaveLength(7);
    expect(celdas[0].fecha).toBe('2026-08-24');
    expect(celdas[6].fecha).toBe('2026-08-30');
  });

  it('marca como programados solo los días del plan', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas.map((c) => c.programado)).toEqual([
      true,  // lunes 24
      false, // martes 25
      true,  // miércoles 26
      false, // jueves 27
      true,  // viernes 28
      false, // sábado 29
      false, // domingo 30
    ]);
  });

  it('marca como completo solo el día con anotación cumplida', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas[0].completo).toBe(true);
    expect(celdas[2].completo).toBe(false);
  });

  it('expone el día de la semana para alinear la cuadrícula', () => {
    const celdas = buildHeatmap(lmv, entries, '2026-08-24', '2026-08-30');
    expect(celdas[0].weekday).toBe(1); // lunes
    expect(celdas[6].weekday).toBe(0); // domingo
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/heatmap.test.ts`
Esperado: FAIL — `Failed to resolve import "./heatmap"`.

- [ ] **Step 3: Implementar `src/core/heatmap.ts`**

```ts
import type { EntriesByDate, Habit, IsoDate, Weekday } from './types';
import { datesBetween, weekdayOf } from './dates';
import { isScheduled } from './schedule';
import { isComplete } from './completion';

export interface HeatmapCell {
  fecha: IsoDate;
  weekday: Weekday;
  programado: boolean;
  completo: boolean;
}

export function buildHeatmap(
  habit: Habit,
  entries: EntriesByDate,
  desde: IsoDate,
  hasta: IsoDate,
): HeatmapCell[] {
  return datesBetween(desde, hasta).map((fecha) => ({
    fecha,
    weekday: weekdayOf(fecha),
    programado: isScheduled(habit, fecha),
    completo: isComplete(habit, entries.get(fecha)),
  }));
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/heatmap.test.ts`
Esperado: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/heatmap.ts src/core/heatmap.test.ts
git commit -m "feat(core): add heatmap grid builder"
```

---

## Task 9: Esquema de IndexedDB

**Files:**
- Create: `src/store/db.ts`

Sin test propio: es infraestructura que los tasks 10 y 11 ejercitan de principio a fin.

- [ ] **Step 1: Escribir `src/store/db.ts`**

```ts
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
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc -b --force
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/store/db.ts
git commit -m "feat(store): add IndexedDB schema"
```

---

## Task 10: CRUD de hábitos

**Files:**
- Create: `src/store/habits.ts`
- Test: `src/store/habits.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbCache } from './db';
import { crearHabito, listarHabitos, actualizarHabito, archivarHabito } from './habits';

beforeEach(() => {
  // Base de datos limpia por test.
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('crearHabito', () => {
  it('asigna id, marcas de tiempo y estado inicial "nuevo"', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1, 2, 3, 4, 5] });
    expect(h.id).toBeTruthy();
    expect(h.estado).toBe('nuevo');
    expect(h.creado_en).toBeTruthy();
    expect(h.actualizado_en).toBe(h.creado_en);
  });

  it('asigna órdenes crecientes', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    const b = await crearHabito({ nombre: 'B', tipo: 'booleano', objetivo: null, dias: [1] });
    expect(b.orden).toBeGreaterThan(a.orden);
  });

  it('rechaza un hábito de cantidad sin objetivo', async () => {
    await expect(
      crearHabito({ nombre: 'Agua', tipo: 'cantidad', objetivo: null, dias: [1] }),
    ).rejects.toThrow(/objetivo/i);
  });

  it('rechaza un nombre vacío', async () => {
    await expect(
      crearHabito({ nombre: '   ', tipo: 'booleano', objetivo: null, dias: [1] }),
    ).rejects.toThrow(/nombre/i);
  });
});

describe('listarHabitos', () => {
  it('devuelve vacío al principio', async () => {
    expect(await listarHabitos()).toEqual([]);
  });

  it('devuelve los hábitos ordenados por orden', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    const b = await crearHabito({ nombre: 'B', tipo: 'booleano', objetivo: null, dias: [1] });
    await actualizarHabito(a.id, { orden: 10 });
    const lista = await listarHabitos();
    expect(lista.map((h) => h.nombre)).toEqual(['B', 'A']);
  });

  it('excluye los archivados salvo que se pidan', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    await archivarHabito(a.id);
    expect(await listarHabitos()).toEqual([]);
    expect((await listarHabitos({ incluirArchivados: true })).map((h) => h.nombre)).toEqual(['A']);
  });
});

describe('actualizarHabito', () => {
  it('aplica los cambios y refresca actualizado_en', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    const actualizado = await actualizarHabito(a.id, { nombre: 'A2', estado: 'consolidado' });
    expect(actualizado.nombre).toBe('A2');
    expect(actualizado.estado).toBe('consolidado');
    expect(actualizado.actualizado_en >= a.actualizado_en).toBe(true);
  });

  it('falla si el hábito no existe', async () => {
    await expect(actualizarHabito('inexistente', { nombre: 'X' })).rejects.toThrow(/no existe/i);
  });
});

describe('archivarHabito', () => {
  it('cambia el estado a archivado sin borrar el registro', async () => {
    const a = await crearHabito({ nombre: 'A', tipo: 'booleano', objetivo: null, dias: [1] });
    await archivarHabito(a.id);
    const todos = await listarHabitos({ incluirArchivados: true });
    expect(todos[0].estado).toBe('archivado');
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/store/habits.test.ts`
Esperado: FAIL — `Failed to resolve import "./habits"`.

- [ ] **Step 3: Implementar `src/store/habits.ts`**

```ts
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
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/store/habits.test.ts`
Esperado: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/habits.ts src/store/habits.test.ts
git commit -m "feat(store): add habit CRUD"
```

---

## Task 11: Anotaciones diarias

**Files:**
- Create: `src/store/entries.ts`
- Test: `src/store/entries.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbCache } from './db';
import { marcarHabito, entriesDeFecha, entriesDeHabito, mapaDeEntries } from './entries';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('marcarHabito', () => {
  it('crea la anotación con su marca de tiempo', async () => {
    const e = await marcarHabito('h1', '2026-08-23', true);
    expect(e.habit_id).toBe('h1');
    expect(e.fecha).toBe('2026-08-23');
    expect(e.valor).toBe(true);
    expect(e.actualizado_en).toBeTruthy();
  });

  it('sobrescribe el valor del mismo día en vez de duplicarlo', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h1', '2026-08-23', false);
    const todas = await entriesDeHabito('h1');
    expect(todas).toHaveLength(1);
    expect(todas[0].valor).toBe(false);
  });

  it('acepta valores numéricos para hábitos de cantidad', async () => {
    const e = await marcarHabito('h2', '2026-08-23', 5);
    expect(e.valor).toBe(5);
  });

  it('permite anotar un día pasado', async () => {
    await marcarHabito('h1', '2026-07-04', true);
    const todas = await entriesDeHabito('h1');
    expect(todas[0].fecha).toBe('2026-07-04');
  });
});

describe('entriesDeFecha', () => {
  it('devuelve las anotaciones de todos los hábitos de ese día', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h2', '2026-08-23', 3);
    await marcarHabito('h1', '2026-08-22', true);

    const delDia = await entriesDeFecha('2026-08-23');
    expect(delDia.map((e) => e.habit_id).sort()).toEqual(['h1', 'h2']);
  });

  it('devuelve vacío en un día sin anotaciones', async () => {
    expect(await entriesDeFecha('2026-08-23')).toEqual([]);
  });
});

describe('entriesDeHabito', () => {
  it('devuelve solo las de ese hábito', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h2', '2026-08-23', true);
    const deH1 = await entriesDeHabito('h1');
    expect(deH1).toHaveLength(1);
    expect(deH1[0].habit_id).toBe('h1');
  });
});

describe('mapaDeEntries', () => {
  it('indexa por fecha para consumo de core/', async () => {
    await marcarHabito('h1', '2026-08-23', true);
    await marcarHabito('h1', '2026-08-24', true);
    const mapa = await mapaDeEntries('h1');
    expect(mapa.get('2026-08-23')?.valor).toBe(true);
    expect(mapa.get('2026-08-25')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/store/entries.test.ts`
Esperado: FAIL — `Failed to resolve import "./entries"`.

- [ ] **Step 3: Implementar `src/store/entries.ts`**

```ts
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
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/store/entries.test.ts`
Esperado: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/entries.ts src/store/entries.test.ts
git commit -m "feat(store): add daily entries read and write"
```

---

## Task 12: Exportar e importar JSON

Red de seguridad independiente del sync. La importación es **todo o nada**: un JSON inválido no debe dejar la base a medio escribir.

**Files:**
- Create: `src/store/backup.ts`
- Test: `src/store/backup.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbCache } from './db';
import { crearHabito, listarHabitos } from './habits';
import { marcarHabito, entriesDeHabito } from './entries';
import { exportarJSON, importarJSON } from './backup';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('exportarJSON', () => {
  it('incluye versión, hábitos y anotaciones', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    await marcarHabito(h.id, '2026-08-24', true);

    const json = await exportarJSON();
    const datos = JSON.parse(json);
    expect(datos.version).toBe(1);
    expect(datos.habits).toHaveLength(1);
    expect(datos.entries).toHaveLength(1);
  });

  it('produce un JSON que importarJSON acepta', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = await exportarJSON();
    await expect(importarJSON(json)).resolves.toBeUndefined();
  });
});

describe('importarJSON', () => {
  it('restaura hábitos y anotaciones sobre una base vacía', async () => {
    const json = JSON.stringify({
      version: 1,
      habits: [{
        id: 'h1', nombre: 'Leer', tipo: 'booleano', objetivo: null, dias: [1, 2],
        estado: 'nuevo', orden: 0,
        creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
      }],
      entries: [
        { habit_id: 'h1', fecha: '2026-08-24', valor: true, actualizado_en: '2026-08-24T10:00:00.000Z' },
      ],
    });

    await importarJSON(json);
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Leer']);
    expect(await entriesDeHabito('h1')).toHaveLength(1);
  });

  it('reemplaza el contenido anterior', async () => {
    await crearHabito({ nombre: 'Viejo', tipo: 'booleano', objetivo: null, dias: [1] });
    const json = JSON.stringify({ version: 1, habits: [], entries: [] });
    await importarJSON(json);
    expect(await listarHabitos()).toEqual([]);
  });

  it('rechaza un JSON mal formado', async () => {
    await expect(importarJSON('{ esto no es json')).rejects.toThrow(/no es un JSON válido/i);
  });

  it('rechaza un JSON sin la forma esperada', async () => {
    await expect(importarJSON(JSON.stringify({ cosas: [] }))).rejects.toThrow(/formato/i);
  });

  it('rechaza una versión desconocida', async () => {
    await expect(
      importarJSON(JSON.stringify({ version: 99, habits: [], entries: [] })),
    ).rejects.toThrow(/versión/i);
  });

  it('no modifica nada si el JSON es inválido', async () => {
    await crearHabito({ nombre: 'Intacto', tipo: 'booleano', objetivo: null, dias: [1] });
    await expect(importarJSON('roto')).rejects.toThrow();
    expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Intacto']);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/store/backup.test.ts`
Esperado: FAIL — `Failed to resolve import "./backup"`.

- [ ] **Step 3: Implementar `src/store/backup.ts`**

```ts
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
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/store/backup.test.ts`
Esperado: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/backup.ts src/store/backup.test.ts
git commit -m "feat(store): add JSON export and import"
```

---

## Task 13: Estilos base y shell de la aplicación

**Files:**
- Create: `src/ui/TabBar.tsx`
- Modify: `src/ui/App.tsx` (reemplazar el contenido generado por Vite), `src/styles.css`, `src/main.tsx`

- [ ] **Step 1: Escribir `src/styles.css`**

```css
:root {
  --fondo: #0f1115;
  --superficie: #181b22;
  --superficie-alta: #222630;
  --texto: #e8eaed;
  --texto-tenue: #9aa0aa;
  --acento: #5b8cff;
  --exito: #3fbf7f;
  --borde: #2a2f3a;
  --radio: 12px;
  --espacio: 12px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--fondo);
  color: var(--texto);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--espacio);
  padding-bottom: 84px;
}

h1 { font-size: 1.4rem; margin: 0 0 var(--espacio); }
h2 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--texto-tenue);
  margin: 24px 0 8px;
}

.tabbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  background: var(--superficie);
  border-top: 1px solid var(--borde);
  padding-bottom: env(safe-area-inset-bottom);
}

.tabbar button {
  flex: 1;
  background: none;
  border: none;
  color: var(--texto-tenue);
  padding: 14px 0;
  font-size: 0.85rem;
  cursor: pointer;
}

.tabbar button[aria-current='page'] { color: var(--acento); }

.card {
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  padding: var(--espacio);
  margin-bottom: 8px;
}

.vacio { color: var(--texto-tenue); font-size: 0.9rem; }
```

- [ ] **Step 2: Escribir `src/ui/TabBar.tsx`**

```tsx
export type Pestana = 'hoy' | 'historial' | 'ajustes';

interface Props {
  activa: Pestana;
  onCambiar: (p: Pestana) => void;
}

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'historial', etiqueta: 'Historial' },
  { id: 'ajustes', etiqueta: 'Ajustes' },
];

export function TabBar({ activa, onCambiar }: Props) {
  return (
    <nav className="tabbar">
      {PESTANAS.map((p) => (
        <button
          key={p.id}
          onClick={() => onCambiar(p.id)}
          aria-current={activa === p.id ? 'page' : undefined}
        >
          {p.etiqueta}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Reemplazar `src/ui/App.tsx`**

Si Vite generó `src/App.tsx`, bórralo (`rm src/App.tsx src/App.css`) y crea `src/ui/App.tsx`:

```tsx
import { useState } from 'react';
import { TabBar, type Pestana } from './TabBar';
import { TodayScreen } from './TodayScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';

export function App() {
  const [pestana, setPestana] = useState<Pestana>('hoy');

  return (
    <>
      <main className="app">
        {pestana === 'hoy' && <TodayScreen />}
        {pestana === 'historial' && <HistoryScreen />}
        {pestana === 'ajustes' && <SettingsScreen />}
      </main>
      <TabBar activa={pestana} onCambiar={setPestana} />
    </>
  );
}
```

Las tres pantallas se crean en los tasks 16, 18 y 20. Hasta entonces el proyecto no compila; el paso siguiente crea versiones mínimas para poder avanzar.

- [ ] **Step 4: Crear stubs de las tres pantallas**

`src/ui/TodayScreen.tsx`:

```tsx
export function TodayScreen() {
  return <h1>Hoy</h1>;
}
```

`src/ui/HistoryScreen.tsx`:

```tsx
export function HistoryScreen() {
  return <h1>Historial</h1>;
}
```

`src/ui/SettingsScreen.tsx`:

```tsx
export function SettingsScreen() {
  return <h1>Ajustes</h1>;
}
```

- [ ] **Step 5: Reemplazar `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Borra también `src/index.css` si Vite lo generó, y quita su import si quedara alguno.

- [ ] **Step 6: Verificar en el navegador**

```bash
npm run dev
```

Abre la URL que imprime. Esperado: fondo oscuro, título "Hoy", y una barra inferior de tres pestañas que cambia el título al pulsarlas.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add app shell with tab navigation"
```

---

## Task 14: Hook de carga de hábitos

**Files:**
- Create: `src/ui/useHabits.ts`

Sin test unitario propio: es un envoltorio fino sobre `store/habits`, ya probado, y los tests de las pantallas lo ejercitan de extremo a extremo.

- [ ] **Step 1: Escribir `src/ui/useHabits.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import type { Habit } from '../core/types';
import { listarHabitos } from '../store/habits';

export function useHabits() {
  const [habitos, setHabitos] = useState<Habit[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      setHabitos(await listarHabitos());
      setError(null);
    } catch {
      setError('No se pudo acceder al almacenamiento del navegador.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { habitos, cargando, error, recargar };
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npx tsc -b --force
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/ui/useHabits.ts
git commit -m "feat(ui): add habits loading hook"
```

---

## Task 15: Fila de hábito

**Files:**
- Create: `src/ui/HabitRow.tsx`
- Test: `src/ui/HabitRow.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HabitRow } from './HabitRow';
import type { Entry, Habit } from '../core/types';

const booleano: Habit = {
  id: 'h1', nombre: 'Meditar', tipo: 'booleano', objetivo: null,
  dias: [1, 2, 3, 4, 5], estado: 'nuevo', orden: 0,
  creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
};

const cantidad: Habit = { ...booleano, id: 'h2', nombre: 'Agua', tipo: 'cantidad', objetivo: 8 };

function entrada(habit_id: string, valor: boolean | number): Entry {
  return { habit_id, fecha: '2026-08-24', valor, actualizado_en: '2026-08-24T10:00:00.000Z' };
}

describe('HabitRow booleano', () => {
  it('muestra el nombre del hábito', () => {
    render(<HabitRow habit={booleano} entry={undefined} racha={0} onMarcar={vi.fn()} />);
    expect(screen.getByText('Meditar')).toBeDefined();
  });

  it('marca como cumplido al pulsar', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={booleano} entry={undefined} racha={0} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: /meditar/i }));
    expect(onMarcar).toHaveBeenCalledWith(true);
  });

  it('desmarca al pulsar sobre uno ya cumplido', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={booleano} entry={entrada('h1', true)} racha={3} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: /meditar/i }));
    expect(onMarcar).toHaveBeenCalledWith(false);
  });

  it('muestra la racha cuando es mayor que cero', () => {
    render(<HabitRow habit={booleano} entry={undefined} racha={5} onMarcar={vi.fn()} />);
    expect(screen.getByText(/5/)).toBeDefined();
  });

  it('no muestra racha cuando es cero', () => {
    render(<HabitRow habit={booleano} entry={undefined} racha={0} onMarcar={vi.fn()} />);
    expect(screen.queryByTestId('racha')).toBeNull();
  });
});

describe('HabitRow de cantidad', () => {
  it('muestra el progreso frente al objetivo', () => {
    render(<HabitRow habit={cantidad} entry={entrada('h2', 5)} racha={0} onMarcar={vi.fn()} />);
    expect(screen.getByText('5/8')).toBeDefined();
  });

  it('muestra 0 cuando no hay anotación', () => {
    render(<HabitRow habit={cantidad} entry={undefined} racha={0} onMarcar={vi.fn()} />);
    expect(screen.getByText('0/8')).toBeDefined();
  });

  it('incrementa en uno al pulsar el botón de sumar', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={cantidad} entry={entrada('h2', 5)} racha={0} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sumar uno a Agua' }));
    expect(onMarcar).toHaveBeenCalledWith(6);
  });

  it('decrementa en uno sin bajar de cero', async () => {
    const onMarcar = vi.fn();
    render(<HabitRow habit={cantidad} entry={entrada('h2', 0)} racha={0} onMarcar={onMarcar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Restar uno a Agua' }));
    expect(onMarcar).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/HabitRow.test.tsx`
Esperado: FAIL — `Failed to resolve import "./HabitRow"`.

- [ ] **Step 3: Implementar `src/ui/HabitRow.tsx`**

```tsx
import type { Entry, Habit } from '../core/types';
import { isComplete } from '../core/completion';

interface Props {
  habit: Habit;
  entry: Entry | undefined;
  racha: number;
  onMarcar: (valor: boolean | number) => void;
}

export function HabitRow({ habit, entry, racha, onMarcar }: Props) {
  const completo = isComplete(habit, entry);

  if (habit.tipo === 'cantidad') {
    const actual = Number(entry?.valor ?? 0);
    return (
      <div className={`card fila ${completo ? 'completa' : ''}`}>
        <div className="fila-texto">
          <span className="fila-nombre">{habit.nombre}</span>
          {racha > 0 && <span className="racha" data-testid="racha">🔥 {racha}</span>}
        </div>
        <div className="contador">
          <button aria-label={`Restar uno a ${habit.nombre}`} onClick={() => onMarcar(Math.max(0, actual - 1))}>
            −
          </button>
          <span className="progreso">{actual}/{habit.objetivo}</span>
          <button aria-label={`Sumar uno a ${habit.nombre}`} onClick={() => onMarcar(actual + 1)}>
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className={`card fila fila-boton ${completo ? 'completa' : ''}`}
      onClick={() => onMarcar(!completo)}
      aria-pressed={completo}
    >
      <span className="fila-texto">
        <span className="fila-nombre">{habit.nombre}</span>
        {racha > 0 && <span className="racha" data-testid="racha">🔥 {racha}</span>}
      </span>
      <span className="check">{completo ? '✓' : ''}</span>
    </button>
  );
}
```

- [ ] **Step 4: Añadir los estilos al final de `src/styles.css`**

```css
.fila {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--espacio);
  width: 100%;
  text-align: left;
}

.fila-boton {
  color: var(--texto);
  font: inherit;
  cursor: pointer;
}

.fila.completa { border-color: var(--exito); }
.fila-texto { display: flex; align-items: center; gap: 8px; }
.fila-nombre { font-size: 1rem; }
.racha { color: var(--texto-tenue); font-size: 0.85rem; }
.check { color: var(--exito); font-size: 1.2rem; width: 1.2rem; }

.contador { display: flex; align-items: center; gap: 10px; }
.contador button {
  width: 34px; height: 34px;
  border-radius: 50%;
  border: 1px solid var(--borde);
  background: var(--superficie-alta);
  color: var(--texto);
  font-size: 1.1rem;
  cursor: pointer;
}
.progreso { min-width: 44px; text-align: center; font-variant-numeric: tabular-nums; }

/* Los hábitos consolidados se presentan más discretos que los nuevos. */
.compacta .fila { padding: 8px var(--espacio); }
.compacta .fila-nombre { font-size: 0.92rem; color: var(--texto-tenue); }
```

- [ ] **Step 5: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/HabitRow.test.tsx`
Esperado: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/HabitRow.tsx src/ui/HabitRow.test.tsx src/styles.css
git commit -m "feat(ui): add habit row for boolean and quantity habits"
```

---

## Task 16: Pantalla Hoy

**Files:**
- Modify: `src/ui/TodayScreen.tsx` (reemplaza el stub del Task 13)
- Test: `src/ui/TodayScreen.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito, actualizarHabito } from '../store/habits';
import { entriesDeHabito } from '../store/entries';
import { hoy } from '../core/dates';
import { weekdayOf } from '../core/dates';
import { TodayScreen } from './TodayScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

/** Días de la semana que garantizan que el hábito esté programado hoy. */
function hoyProgramado() {
  return [weekdayOf(hoy())];
}

describe('TodayScreen', () => {
  it('muestra un mensaje cuando no hay hábitos', async () => {
    render(<TodayScreen />);
    expect(await screen.findByText(/no tienes hábitos/i)).toBeDefined();
  });

  it('muestra los hábitos programados para hoy', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);
    expect(await screen.findByText('Meditar')).toBeDefined();
  });

  it('oculta los hábitos no programados para hoy', async () => {
    const otroDia = ((weekdayOf(hoy()) + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    await crearHabito({ nombre: 'Gimnasio', tipo: 'booleano', objetivo: null, dias: [otroDia] });
    render(<TodayScreen />);
    await screen.findByText(/no toca ningún hábito|no tienes hábitos/i);
    expect(screen.queryByText('Gimnasio')).toBeNull();
  });

  it('separa los hábitos nuevos de los consolidados', async () => {
    await crearHabito({ nombre: 'Nuevo1', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    const c = await crearHabito({ nombre: 'Viejo1', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    await actualizarHabito(c.id, { estado: 'consolidado' });

    render(<TodayScreen />);
    expect(await screen.findByText(/en formación/i)).toBeDefined();
    expect(screen.getByText(/consolidados/i)).toBeDefined();
  });

  it('persiste la marca al pulsar un hábito', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /meditar/i }));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(h.id);
      expect(guardadas).toHaveLength(1);
      expect(guardadas[0].valor).toBe(true);
      expect(guardadas[0].fecha).toBe(hoy());
    });
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/TodayScreen.test.tsx`
Esperado: FAIL — el stub no renderiza ninguno de esos textos.

- [ ] **Step 3: Implementar `src/ui/TodayScreen.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { Entry, Habit } from '../core/types';
import { hoy as fechaDeHoy } from '../core/dates';
import { isScheduled } from '../core/schedule';
import { isComplete } from '../core/completion';
import { currentStreak } from '../core/streaks';
import { useHabits } from './useHabits';
import { entriesDeFecha, marcarHabito, mapaDeEntries } from '../store/entries';
import { HabitRow } from './HabitRow';

export function TodayScreen() {
  const { habitos, cargando, error, recargar } = useHabits();
  const [entradas, setEntradas] = useState<Map<string, Entry>>(new Map());
  const [rachas, setRachas] = useState<Map<string, number>>(new Map());
  const fecha = fechaDeHoy();

  const cargarDia = useCallback(async () => {
    const lista = await entriesDeFecha(fecha);
    setEntradas(new Map(lista.map((e) => [e.habit_id, e])));
  }, [fecha]);

  useEffect(() => {
    void cargarDia();
  }, [cargarDia]);

  useEffect(() => {
    async function calcular() {
      const nuevas = new Map<string, number>();
      for (const h of habitos) {
        nuevas.set(h.id, currentStreak(h, await mapaDeEntries(h.id), fecha));
      }
      setRachas(nuevas);
    }
    void calcular();
  }, [habitos, entradas, fecha]);

  async function alMarcar(habit: Habit, valor: boolean | number) {
    await marcarHabito(habit.id, fecha, valor);
    await cargarDia();
  }

  if (cargando) return <p className="vacio">Cargando…</p>;
  if (error) return <p className="vacio">{error}</p>;

  if (habitos.length === 0) {
    return (
      <>
        <h1>Hoy</h1>
        <p className="vacio">No tienes hábitos todavía. Créalos desde Ajustes.</p>
      </>
    );
  }

  const deHoy = habitos.filter((h) => isScheduled(h, fecha));
  const nuevos = deHoy.filter((h) => h.estado === 'nuevo');
  const consolidados = deHoy.filter((h) => h.estado === 'consolidado');
  const todoHecho = deHoy.length > 0 && deHoy.every((h) => isComplete(h, entradas.get(h.id)));

  return (
    <>
      <h1>Hoy</h1>

      {deHoy.length === 0 && <p className="vacio">Hoy no toca ningún hábito. Descansa.</p>}

      {nuevos.length > 0 && (
        <section>
          <h2>En formación</h2>
          {nuevos.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              entry={entradas.get(h.id)}
              racha={rachas.get(h.id) ?? 0}
              onMarcar={(v) => void alMarcar(h, v)}
            />
          ))}
        </section>
      )}

      {consolidados.length > 0 && (
        <section className="compacta">
          <h2>Consolidados</h2>
          {consolidados.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              entry={entradas.get(h.id)}
              racha={rachas.get(h.id) ?? 0}
              onMarcar={(v) => void alMarcar(h, v)}
            />
          ))}
        </section>
      )}

      {todoHecho && <p className="vacio">Día completo.</p>}

      <button className="enlace" onClick={() => void recargar()}>Actualizar</button>
    </>
  );
}
```

Añade al final de `src/styles.css`:

```css
.enlace {
  background: none;
  border: none;
  color: var(--texto-tenue);
  font-size: 0.85rem;
  padding: var(--espacio) 0;
  cursor: pointer;
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/TodayScreen.test.tsx`
Esperado: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/TodayScreen.tsx src/ui/TodayScreen.test.tsx src/styles.css
git commit -m "feat(ui): add today screen with new and established sections"
```

---

## Task 17: Formulario de hábito

**Files:**
- Create: `src/ui/HabitForm.tsx`
- Test: `src/ui/HabitForm.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HabitForm } from './HabitForm';

describe('HabitForm', () => {
  it('envía un hábito booleano con los días marcados', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Meditar');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1],
    });
  });

  it('pide objetivo solo cuando el tipo es cantidad', async () => {
    render(<HabitForm onGuardar={vi.fn()} onCancelar={vi.fn()} />);
    expect(screen.queryByLabelText(/objetivo/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'cantidad');
    expect(screen.getByLabelText(/objetivo/i)).toBeDefined();
  });

  it('envía el objetivo en un hábito de cantidad', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Agua');
    await userEvent.selectOptions(screen.getByLabelText(/tipo/i), 'cantidad');
    await userEvent.clear(screen.getByLabelText(/objetivo/i));
    await userEvent.type(screen.getByLabelText(/objetivo/i), '8');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Martes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith({
      nombre: 'Agua', tipo: 'cantidad', objetivo: 8, dias: [2],
    });
  });

  it('avisa si no se marca ningún día', async () => {
    const onGuardar = vi.fn();
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Meditar');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/al menos un día/i)).toBeDefined();
    expect(onGuardar).not.toHaveBeenCalled();
  });

  it('avisa si el nombre está vacío', async () => {
    const onGuardar = vi.fn();
    render(<HabitForm onGuardar={onGuardar} onCancelar={vi.fn()} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/nombre/i)).toBeDefined();
    expect(onGuardar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/HabitForm.test.tsx`
Esperado: FAIL — `Failed to resolve import "./HabitForm"`.

- [ ] **Step 3: Implementar `src/ui/HabitForm.tsx`**

```tsx
import { useState } from 'react';
import type { HabitType, Weekday } from '../core/types';
import type { NuevoHabito } from '../store/habits';

const DIAS: { valor: Weekday; etiqueta: string }[] = [
  { valor: 1, etiqueta: 'Lunes' },
  { valor: 2, etiqueta: 'Martes' },
  { valor: 3, etiqueta: 'Miércoles' },
  { valor: 4, etiqueta: 'Jueves' },
  { valor: 5, etiqueta: 'Viernes' },
  { valor: 6, etiqueta: 'Sábado' },
  { valor: 0, etiqueta: 'Domingo' },
];

interface Props {
  inicial?: Partial<NuevoHabito>;
  onGuardar: (h: NuevoHabito) => void | Promise<void>;
  onCancelar: () => void;
}

export function HabitForm({ inicial, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<HabitType>(inicial?.tipo ?? 'booleano');
  const [objetivo, setObjetivo] = useState(String(inicial?.objetivo ?? 1));
  const [dias, setDias] = useState<Weekday[]>(inicial?.dias ?? []);
  const [aviso, setAviso] = useState<string | null>(null);

  function alternarDia(d: Weekday) {
    setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) {
      setAviso('Ponle un nombre al hábito.');
      return;
    }
    if (dias.length === 0) {
      setAviso('Marca al menos un día de la semana.');
      return;
    }
    const objetivoNum = Number(objetivo);
    if (tipo === 'cantidad' && (!Number.isFinite(objetivoNum) || objetivoNum <= 0)) {
      setAviso('El objetivo debe ser un número mayor que cero.');
      return;
    }

    setAviso(null);
    void onGuardar({
      nombre: nombre.trim(),
      tipo,
      objetivo: tipo === 'cantidad' ? objetivoNum : null,
      dias,
    });
  }

  return (
    <form className="card formulario" onSubmit={enviar}>
      <label htmlFor="nombre">Nombre</label>
      <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label htmlFor="tipo">Tipo</label>
      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as HabitType)}>
        <option value="booleano">Sí o no</option>
        <option value="cantidad">Cantidad</option>
      </select>

      {tipo === 'cantidad' && (
        <>
          <label htmlFor="objetivo">Objetivo</label>
          <input
            id="objetivo"
            type="number"
            min="1"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
          />
        </>
      )}

      <fieldset className="dias">
        <legend>Días</legend>
        {DIAS.map((d) => (
          <label key={d.valor}>
            <input
              type="checkbox"
              aria-label={d.etiqueta}
              checked={dias.includes(d.valor)}
              onChange={() => alternarDia(d.valor)}
            />
            {d.etiqueta.slice(0, 3)}
          </label>
        ))}
      </fieldset>

      {aviso && <p className="aviso">{aviso}</p>}

      <div className="acciones">
        <button type="submit">Guardar</button>
        <button type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Añadir los estilos al final de `src/styles.css`**

```css
.formulario { display: flex; flex-direction: column; gap: 6px; }
.formulario label { font-size: 0.8rem; color: var(--texto-tenue); }
.formulario input[type='text'],
.formulario input,
.formulario select {
  background: var(--superficie-alta);
  border: 1px solid var(--borde);
  border-radius: 8px;
  color: var(--texto);
  padding: 10px;
  font-size: 1rem;
}

.dias {
  border: 1px solid var(--borde);
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 8px 0;
}
.dias legend { font-size: 0.8rem; color: var(--texto-tenue); }
.dias label { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: var(--texto); }

.aviso { color: #ff9a9a; font-size: 0.85rem; margin: 4px 0; }

.acciones { display: flex; gap: 8px; margin-top: 8px; }
.acciones button {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--borde);
  background: var(--superficie-alta);
  color: var(--texto);
  font-size: 0.95rem;
  cursor: pointer;
}
.acciones button[type='submit'] { background: var(--acento); border-color: var(--acento); color: #fff; }
```

- [ ] **Step 5: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/HabitForm.test.tsx`
Esperado: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/HabitForm.tsx src/ui/HabitForm.test.tsx src/styles.css
git commit -m "feat(ui): add habit creation form"
```

---

## Task 18: Pantalla de Ajustes

**Files:**
- Modify: `src/ui/SettingsScreen.tsx` (reemplaza el stub del Task 13)
- Test: `src/ui/SettingsScreen.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito, listarHabitos } from '../store/habits';
import { SettingsScreen } from './SettingsScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('SettingsScreen', () => {
  it('lista los hábitos existentes', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    render(<SettingsScreen />);
    expect(await screen.findByText('Meditar')).toBeDefined();
  });

  it('crea un hábito desde el formulario', async () => {
    render(<SettingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /nuevo hábito/i }));
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Leer');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lunes' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(async () => {
      expect((await listarHabitos()).map((h) => h.nombre)).toEqual(['Leer']);
    });
  });

  it('cambia un hábito nuevo a consolidado', async () => {
    const h = await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    render(<SettingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /consolidar meditar/i }));

    await waitFor(async () => {
      const lista = await listarHabitos();
      expect(lista.find((x) => x.id === h.id)?.estado).toBe('consolidado');
    });
  });

  it('archiva un hábito y deja de listarlo', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    render(<SettingsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: /archivar meditar/i }));

    await waitFor(() => {
      expect(screen.queryByText('Meditar')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/SettingsScreen.test.tsx`
Esperado: FAIL — el stub no contiene esos elementos.

- [ ] **Step 3: Implementar `src/ui/SettingsScreen.tsx`**

```tsx
import { useState } from 'react';
import { useHabits } from './useHabits';
import { HabitForm } from './HabitForm';
import { archivarHabito, actualizarHabito, crearHabito, type NuevoHabito } from '../store/habits';
import { exportarJSON, importarJSON } from '../store/backup';

export function SettingsScreen() {
  const { habitos, recargar } = useHabits();
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function guardar(nuevo: NuevoHabito) {
    try {
      await crearHabito(nuevo);
      setCreando(false);
      setMensaje(null);
      await recargar();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo guardar el hábito');
    }
  }

  async function exportar() {
    const json = await exportarJSON();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importar(archivo: File) {
    try {
      await importarJSON(await archivo.text());
      setMensaje('Copia restaurada.');
      await recargar();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudo importar el fichero');
    }
  }

  return (
    <>
      <h1>Ajustes</h1>

      <h2>Hábitos</h2>
      {habitos.map((h) => (
        <div className="card fila" key={h.id}>
          <span className="fila-nombre">{h.nombre}</span>
          <span className="acciones-fila">
            {h.estado === 'nuevo' && (
              <button
                aria-label={`Consolidar ${h.nombre}`}
                onClick={async () => {
                  await actualizarHabito(h.id, { estado: 'consolidado' });
                  await recargar();
                }}
              >
                Consolidar
              </button>
            )}
            <button
              aria-label={`Archivar ${h.nombre}`}
              onClick={async () => {
                await archivarHabito(h.id);
                await recargar();
              }}
            >
              Archivar
            </button>
          </span>
        </div>
      ))}

      {creando ? (
        <HabitForm onGuardar={guardar} onCancelar={() => setCreando(false)} />
      ) : (
        <button className="principal" onClick={() => setCreando(true)}>Nuevo hábito</button>
      )}

      <h2>Copia de seguridad</h2>
      <div className="acciones">
        <button onClick={() => void exportar()}>Exportar JSON</button>
        <label className="boton-archivo">
          Importar JSON
          <input
            type="file"
            accept="application/json"
            aria-label="Importar JSON"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importar(f);
            }}
          />
        </label>
      </div>

      {mensaje && <p className="aviso">{mensaje}</p>}
    </>
  );
}
```

Añade al final de `src/styles.css`:

```css
.acciones-fila { display: flex; gap: 6px; }
.acciones-fila button {
  background: var(--superficie-alta);
  border: 1px solid var(--borde);
  color: var(--texto-tenue);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.8rem;
  cursor: pointer;
}

.principal {
  width: 100%;
  padding: 14px;
  border-radius: var(--radio);
  border: 1px dashed var(--borde);
  background: none;
  color: var(--acento);
  font-size: 0.95rem;
  cursor: pointer;
}

.boton-archivo {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--borde);
  background: var(--superficie-alta);
  color: var(--texto);
  font-size: 0.95rem;
  cursor: pointer;
}
.boton-archivo input { display: none; }
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/SettingsScreen.test.tsx`
Esperado: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/SettingsScreen.tsx src/ui/SettingsScreen.test.tsx src/styles.css
git commit -m "feat(ui): add settings screen with habit management and backup"
```

---

## Task 19: Componente Heatmap

**Files:**
- Create: `src/ui/Heatmap.tsx`
- Test: `src/ui/Heatmap.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Heatmap } from './Heatmap';
import type { HeatmapCell } from '../core/heatmap';

const celdas: HeatmapCell[] = [
  { fecha: '2026-08-24', weekday: 1, programado: true, completo: true },
  { fecha: '2026-08-25', weekday: 2, programado: false, completo: false },
  { fecha: '2026-08-26', weekday: 3, programado: true, completo: false },
];

describe('Heatmap', () => {
  it('pinta una celda por día', () => {
    render(<Heatmap celdas={celdas} onSeleccionar={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('etiqueta cada celda con su fecha', () => {
    render(<Heatmap celdas={celdas} onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2026-08-24' })).toBeDefined();
  });

  it('distingue completo, pendiente y no programado', () => {
    render(<Heatmap celdas={celdas} onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2026-08-24' }).className).toContain('completo');
    expect(screen.getByRole('button', { name: '2026-08-26' }).className).toContain('pendiente');
    expect(screen.getByRole('button', { name: '2026-08-25' }).className).toContain('libre');
  });

  it('devuelve la fecha al pulsar una celda', async () => {
    const onSeleccionar = vi.fn();
    render(<Heatmap celdas={celdas} onSeleccionar={onSeleccionar} />);
    await userEvent.click(screen.getByRole('button', { name: '2026-08-26' }));
    expect(onSeleccionar).toHaveBeenCalledWith('2026-08-26');
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/Heatmap.test.tsx`
Esperado: FAIL — `Failed to resolve import "./Heatmap"`.

- [ ] **Step 3: Implementar `src/ui/Heatmap.tsx`**

```tsx
import type { IsoDate } from '../core/types';
import type { HeatmapCell } from '../core/heatmap';

interface Props {
  celdas: HeatmapCell[];
  onSeleccionar: (fecha: IsoDate) => void;
}

function clase(celda: HeatmapCell): string {
  if (!celda.programado) return 'libre';
  return celda.completo ? 'completo' : 'pendiente';
}

export function Heatmap({ celdas, onSeleccionar }: Props) {
  // La primera celda se desplaza para que cada columna sea una semana.
  const desplazamiento = celdas.length > 0 ? celdas[0].weekday : 0;

  return (
    <div className="heatmap" style={{ gridAutoFlow: 'column' }}>
      {Array.from({ length: desplazamiento }, (_, i) => (
        <span key={`hueco-${i}`} className="celda hueco" />
      ))}
      {celdas.map((c) => (
        <button
          key={c.fecha}
          aria-label={c.fecha}
          className={`celda ${clase(c)}`}
          onClick={() => onSeleccionar(c.fecha)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Añadir los estilos al final de `src/styles.css`**

```css
.heatmap {
  display: grid;
  grid-template-rows: repeat(7, 14px);
  gap: 3px;
  overflow-x: auto;
  padding: var(--espacio) 0;
}

.celda {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: none;
  padding: 0;
  background: var(--superficie-alta);
  cursor: pointer;
}

.celda.completo { background: var(--exito); }
.celda.pendiente { background: #3a3f4b; }
.celda.libre { background: #21242c; cursor: pointer; }
.celda.hueco { background: transparent; cursor: default; }
```

- [ ] **Step 5: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/Heatmap.test.tsx`
Esperado: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Heatmap.tsx src/ui/Heatmap.test.tsx src/styles.css
git commit -m "feat(ui): add heatmap grid component"
```

---

## Task 20: Pantalla de Historial con edición retroactiva

**Files:**
- Modify: `src/ui/HistoryScreen.tsx` (reemplaza el stub del Task 13)
- Test: `src/ui/HistoryScreen.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito } from '../store/habits';
import { entriesDeHabito } from '../store/entries';
import { addDays, hoy } from '../core/dates';
import { HistoryScreen } from './HistoryScreen';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('HistoryScreen', () => {
  it('avisa cuando no hay hábitos', async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText(/no tienes hábitos/i)).toBeDefined();
  });

  it('muestra el heatmap del primer hábito', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });
    render(<HistoryScreen />);
    expect(await screen.findByRole('button', { name: hoy() })).toBeDefined();
  });

  it('permite marcar un día pasado desde el heatmap', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    const ayer = addDays(hoy(), -1);

    render(<HistoryScreen />);
    await userEvent.click(await screen.findByRole('button', { name: ayer }));
    await userEvent.click(await screen.findByRole('button', { name: /marcar como hecho/i }));

    await waitFor(async () => {
      const guardadas = await entriesDeHabito(h.id);
      expect(guardadas.map((e) => e.fecha)).toContain(ayer);
    });
  });

  it('permite cambiar de hábito con el selector', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [1] });
    await crearHabito({ nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [2] });

    render(<HistoryScreen />);
    const selector = await screen.findByLabelText(/hábito/i);
    await userEvent.selectOptions(selector, 'Correr');
    expect((selector as HTMLSelectElement).selectedOptions[0].textContent).toBe('Correr');
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/HistoryScreen.test.tsx`
Esperado: FAIL — el stub no contiene esos elementos.

- [ ] **Step 3: Implementar `src/ui/HistoryScreen.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { EntriesByDate, IsoDate } from '../core/types';
import { addDays, hoy as fechaDeHoy } from '../core/dates';
import { buildHeatmap, type HeatmapCell } from '../core/heatmap';
import { isComplete } from '../core/completion';
import { isScheduled } from '../core/schedule';
import { useHabits } from './useHabits';
import { Heatmap } from './Heatmap';
import { HabitDetail } from './HabitDetail';
import { mapaDeEntries, marcarHabito } from '../store/entries';

/** Ventana del heatmap: las últimas 26 semanas. */
const DIAS_VISIBLES = 182;

export function HistoryScreen() {
  const { habitos, cargando } = useHabits();
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [entradas, setEntradas] = useState<EntriesByDate>(new Map());
  const [celdas, setCeldas] = useState<HeatmapCell[]>([]);
  const [diaAbierto, setDiaAbierto] = useState<IsoDate | null>(null);

  const habit = habitos.find((h) => h.id === seleccionadoId) ?? habitos[0];

  useEffect(() => {
    if (!seleccionadoId && habitos.length > 0) setSeleccionadoId(habitos[0].id);
  }, [habitos, seleccionadoId]);

  const recargarEntradas = useCallback(async () => {
    if (!habit) return;
    const mapa = await mapaDeEntries(habit.id);
    const hasta = fechaDeHoy();
    const desde = addDays(hasta, -(DIAS_VISIBLES - 1));
    setEntradas(mapa);
    setCeldas(buildHeatmap(habit, mapa, desde, hasta));
  }, [habit]);

  useEffect(() => {
    void recargarEntradas();
  }, [recargarEntradas]);

  if (cargando) return <p className="vacio">Cargando…</p>;
  if (habitos.length === 0) {
    return (
      <>
        <h1>Historial</h1>
        <p className="vacio">No tienes hábitos todavía. Créalos desde Ajustes.</p>
      </>
    );
  }

  async function guardarDia(valor: boolean | number) {
    if (!habit || !diaAbierto) return;
    await marcarHabito(habit.id, diaAbierto, valor);
    await recargarEntradas();
    setDiaAbierto(null);
  }

  const entradaDelDia = diaAbierto ? entradas.get(diaAbierto) : undefined;
  const completoElDia = habit && entradaDelDia ? isComplete(habit, entradaDelDia) : false;

  return (
    <>
      <h1>Historial</h1>

      <label htmlFor="habito">Hábito</label>
      <select
        id="habito"
        value={habit?.id ?? ''}
        onChange={(e) => {
          setSeleccionadoId(e.target.value);
          setDiaAbierto(null);
        }}
      >
        {habitos.map((h) => (
          <option key={h.id} value={h.id}>{h.nombre}</option>
        ))}
      </select>

      <Heatmap celdas={celdas} onSeleccionar={setDiaAbierto} />

      {diaAbierto && habit && (
        <div className="card">
          <p>{diaAbierto}</p>
          {!isScheduled(habit, diaAbierto) && (
            <p className="vacio">Ese día no estaba programado, pero puedes anotarlo igualmente.</p>
          )}

          {habit.tipo === 'booleano' ? (
            <div className="acciones">
              <button onClick={() => void guardarDia(true)}>Marcar como hecho</button>
              <button onClick={() => void guardarDia(false)}>Marcar como no hecho</button>
            </div>
          ) : (
            <div className="acciones">
              <input
                type="number"
                min="0"
                aria-label="Cantidad"
                defaultValue={Number(entradaDelDia?.valor ?? 0)}
                onBlur={(e) => void guardarDia(Number(e.target.value))}
              />
            </div>
          )}

          <p className="vacio">{completoElDia ? 'Cumplido' : 'Sin cumplir'}</p>
          <button className="enlace" onClick={() => setDiaAbierto(null)}>Cerrar</button>
        </div>
      )}

      {habit && <HabitDetail habit={habit} entries={entradas} />}
    </>
  );
}
```

`HabitDetail` se implementa en el Task 21. Para que este task compile y sus tests pasen, crea antes el stub mínimo en `src/ui/HabitDetail.tsx`:

```tsx
import type { EntriesByDate, Habit } from '../core/types';

export function HabitDetail(_props: { habit: Habit; entries: EntriesByDate }) {
  return null;
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/HistoryScreen.test.tsx`
Esperado: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/HistoryScreen.tsx src/ui/HistoryScreen.test.tsx src/ui/HabitDetail.tsx
git commit -m "feat(ui): add history screen with retroactive day editing"
```

---

## Task 21: Estadísticas del hábito

**Files:**
- Modify: `src/ui/HabitDetail.tsx` (reemplaza el stub del Task 20)
- Test: `src/ui/HabitDetail.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HabitDetail } from './HabitDetail';
import type { Entry, EntriesByDate, Habit } from '../core/types';
import { addDays, hoy } from '../core/dates';

const diario: Habit = {
  id: 'h1', nombre: 'Leer', tipo: 'booleano', objetivo: null,
  dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
  creado_en: new Date(`${addDays(hoy(), -30)}T10:00:00.000Z`).toISOString(),
  actualizado_en: '2026-08-01T10:00:00.000Z',
};

function hechos(fechas: string[]): EntriesByDate {
  return new Map<string, Entry>(
    fechas.map((f) => [f, { habit_id: 'h1', fecha: f, valor: true, actualizado_en: `${f}T10:00:00.000Z` }]),
  );
}

describe('HabitDetail', () => {
  it('muestra la racha actual', () => {
    const e = hechos([addDays(hoy(), -2), addDays(hoy(), -1), hoy()]);
    render(<HabitDetail habit={diario} entries={e} />);
    expect(screen.getByTestId('racha-actual').textContent).toBe('3');
  });

  it('muestra la racha más larga', () => {
    const e = hechos([addDays(hoy(), -5), addDays(hoy(), -4), addDays(hoy(), -3), hoy()]);
    render(<HabitDetail habit={diario} entries={e} />);
    expect(screen.getByTestId('racha-maxima').textContent).toBe('3');
  });

  it('muestra el porcentaje de cumplimiento como entero con símbolo', () => {
    const e = hechos([hoy()]);
    render(<HabitDetail habit={diario} entries={e} />);
    expect(screen.getByTestId('cumplimiento').textContent).toMatch(/^\d+%$/);
  });

  it('muestra ceros sin anotaciones', () => {
    render(<HabitDetail habit={diario} entries={new Map()} />);
    expect(screen.getByTestId('racha-actual').textContent).toBe('0');
    expect(screen.getByTestId('cumplimiento').textContent).toBe('0%');
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/HabitDetail.test.tsx`
Esperado: FAIL — el stub devuelve `null` y no existen los `data-testid`.

- [ ] **Step 3: Implementar `src/ui/HabitDetail.tsx`**

```tsx
import type { EntriesByDate, Habit } from '../core/types';
import { addDays, hoy as fechaDeHoy } from '../core/dates';
import { currentStreak, longestStreak, primerDia } from '../core/streaks';
import { completionRate } from '../core/stats';

interface Props {
  habit: Habit;
  entries: EntriesByDate;
}

export function HabitDetail({ habit, entries }: Props) {
  const hasta = fechaDeHoy();
  const desdeCreacion = primerDia(habit);
  const ultimos30 = addDays(hasta, -29);

  const actual = currentStreak(habit, entries, hasta);
  const maxima = longestStreak(habit, entries, desdeCreacion, hasta);
  const ratio = completionRate(habit, entries, ultimos30, hasta);

  return (
    <section className="card estadisticas">
      <div>
        <span className="dato" data-testid="racha-actual">{actual}</span>
        <span className="etiqueta">racha actual</span>
      </div>
      <div>
        <span className="dato" data-testid="racha-maxima">{maxima}</span>
        <span className="etiqueta">racha máxima</span>
      </div>
      <div>
        <span className="dato" data-testid="cumplimiento">{Math.round(ratio * 100)}%</span>
        <span className="etiqueta">últimos 30 días</span>
      </div>
    </section>
  );
}
```

Añade al final de `src/styles.css`:

```css
.estadisticas { display: flex; justify-content: space-around; text-align: center; }
.estadisticas .dato { display: block; font-size: 1.6rem; font-variant-numeric: tabular-nums; }
.estadisticas .etiqueta { font-size: 0.75rem; color: var(--texto-tenue); }
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/HabitDetail.test.tsx`
Esperado: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/HabitDetail.tsx src/ui/HabitDetail.test.tsx src/styles.css
git commit -m "feat(ui): add habit statistics panel"
```

---

## Task 22: Aviso de almacenamiento no disponible

En navegación privada IndexedDB puede fallar al abrirse. La app debe seguir usable pero avisar de que los datos no van a persistir, en vez de romperse en silencio.

**Files:**
- Modify: `src/ui/App.tsx`
- Test: `src/ui/App.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import { resetDbCache, isStorageAvailable } from '../store/db';
import { App } from './App';

// Los módulos ESM no se pueden espiar con vi.spyOn sobre el namespace: hay que
// interceptar el módulo entero y conservar el resto de exportaciones reales.
vi.mock('../store/db', async () => {
  const real = await vi.importActual<typeof import('../store/db')>('../store/db');
  return { ...real, isStorageAvailable: vi.fn(real.isStorageAvailable) };
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
  vi.mocked(isStorageAvailable).mockResolvedValue(true);
});

describe('App', () => {
  it('no muestra aviso cuando el almacenamiento funciona', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Hoy' });
    expect(screen.queryByText(/no se guardarán/i)).toBeNull();
  });

  it('avisa cuando IndexedDB no está disponible', async () => {
    vi.mocked(isStorageAvailable).mockResolvedValue(false);
    render(<App />);
    expect(await screen.findByText(/no se guardarán/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/App.test.tsx`
Esperado: FAIL — el segundo test no encuentra el texto del aviso.

- [ ] **Step 3: Actualizar `src/ui/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { TabBar, type Pestana } from './TabBar';
import { TodayScreen } from './TodayScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { isStorageAvailable } from '../store/db';

export function App() {
  const [pestana, setPestana] = useState<Pestana>('hoy');
  const [almacenamientoOk, setAlmacenamientoOk] = useState(true);

  useEffect(() => {
    void isStorageAvailable().then(setAlmacenamientoOk);
  }, []);

  return (
    <>
      <main className="app">
        {!almacenamientoOk && (
          <p className="banner">
            Este navegador no permite guardar datos (¿ventana privada?). Puedes usar la app, pero
            tus marcas no se guardarán al cerrarla.
          </p>
        )}
        {pestana === 'hoy' && <TodayScreen />}
        {pestana === 'historial' && <HistoryScreen />}
        {pestana === 'ajustes' && <SettingsScreen />}
      </main>
      <TabBar activa={pestana} onCambiar={setPestana} />
    </>
  );
}
```

Añade al final de `src/styles.css`:

```css
.banner {
  background: #4a2020;
  border: 1px solid #7a3333;
  border-radius: var(--radio);
  padding: var(--espacio);
  font-size: 0.85rem;
  margin-bottom: var(--espacio);
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/App.test.tsx`
Esperado: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/App.tsx src/ui/App.test.tsx src/styles.css
git commit -m "feat(ui): warn when browser storage is unavailable"
```

---

## Task 23: Convertir en PWA instalable

**Files:**
- Modify: `vite.config.ts`, `index.html`

- [ ] **Step 1: Añadir el plugin de PWA a `vite.config.ts`**

Reemplaza el contenido completo:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hábitos',
        short_name: 'Hábitos',
        description: 'Seguimiento personal de hábitos',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 2: Crear los iconos**

Genera dos PNG cuadrados de fondo `#0f1115` con una marca de verificación centrada, y guárdalos como `public/icon-192.png` (192×192) y `public/icon-512.png` (512×512). Con ImageMagick instalado:

```bash
mkdir -p public
magick -size 192x192 xc:'#0f1115' -gravity center -pointsize 110 -fill '#3fbf7f' -annotate 0 '✓' public/icon-192.png
magick -size 512x512 xc:'#0f1115' -gravity center -pointsize 300 -fill '#3fbf7f' -annotate 0 '✓' public/icon-512.png
```

Si no tienes ImageMagick, cualquier PNG de esos tamaños sirve; el icono es sustituible más adelante.

- [ ] **Step 3: Ajustar `index.html`**

Asegúrate de que el `<head>` contiene estas etiquetas y que el idioma es español:

```html
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0f1115" />
    <title>Hábitos</title>
  </head>
```

- [ ] **Step 4: Verificar el build de producción**

```bash
npm run build
npx vite preview
```

Abre la URL en el navegador. Esperado: la app carga, y en las DevTools (pestaña Application → Manifest) aparece "Hábitos" con sus iconos y un service worker registrado.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: make the app an installable PWA"
```

---

## Task 24: Verificación final

- [ ] **Step 1: Ejecutar toda la batería de tests**

```bash
npm run test
```

Esperado: todos los ficheros de test en verde, sin ninguno omitido.

- [ ] **Step 2: Comprobar los tipos**

```bash
npx tsc -b --force
```

Esperado: sin errores.

- [ ] **Step 3: Recorrido manual**

Con `npm run dev` abierto:

1. Ajustes → Nuevo hábito → crea "Meditar" (sí/no, todos los días). Aparece en la lista.
2. Ajustes → Nuevo hábito → crea "Agua" (cantidad, objetivo 8, todos los días).
3. Hoy → ambos aparecen bajo "En formación". Marca "Meditar": se pone en verde.
4. Hoy → pulsa `+` en "Agua" ocho veces: el contador llega a 8/8 y la tarjeta se marca como completa.
5. Recarga la página con F5: las marcas siguen ahí.
6. Ajustes → "Consolidar Meditar". Vuelve a Hoy: "Meditar" aparece ahora bajo "Consolidados".
7. Historial → elige "Meditar". El día de hoy aparece verde en el heatmap.
8. Historial → pulsa una celda de un día pasado → "Marcar como hecho". La celda se vuelve verde y la racha del panel inferior aumenta.
9. Ajustes → "Exportar JSON": se descarga el fichero. Ábrelo y comprueba que contiene los dos hábitos.
10. Ajustes → "Importar JSON" con ese mismo fichero: aparece "Copia restaurada" y los hábitos siguen intactos.

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "chore: complete local-first habit tracker"
```

---

## Fuera de alcance de este plan

Estos puntos de la spec quedan para el **Plan 2 (sincronización)**, que se escribirá al completar este:

- Worker de Cloudflare con endpoint `POST /sync` y base de datos D1
- Cola de cambios pendientes y proceso de sincronización en segundo plano
- Fusión por `actualizado_en` más reciente
- Indicador de estado del sync en la UI
- Configuración de la clave de sync en Ajustes
- Error de clave de sync rechazada

Los campos `actualizado_en` de `habits` y `entries` ya se escriben en este plan, de modo que el Plan 2 no necesitará migrar datos existentes.
