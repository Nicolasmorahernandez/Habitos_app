# Gráfica de progreso del día — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir a la pantalla Hoy una gráfica de línea escalonada que muestre
el progreso acumulado del día, repartiendo el 100% en partes iguales entre
los hábitos programados hoy y subiendo un escalón en la hora exacta en que
cada uno se marca completado.

**Architecture:** Una función pura nueva en `core/` (`progresoDelDia`) que
convierte hábitos + anotaciones de hoy —datos que `TodayScreen` ya tiene
cargados— en una lista de puntos `{minutos, porcentaje}`. Un componente
presentacional nuevo en `ui/` (`DailyProgressChart`) que dibuja esos puntos
como SVG. Sin cambios en `store/` ni en el esquema de IndexedDB.

**Tech Stack:** React + TypeScript + Vitest + `@testing-library/react`, SVG a
mano (sin librería de gráficas — un solo trazo escalonado no la necesita).

**Nota de diseño (dataviz):** se siguió la skill `dataviz` para las decisiones
de forma y marcas: línea de 2px con extremos redondeados, puntos ≥8px de
diámetro con anillo del color de superficie, ejes en gris recesivo de 1px
sólido, una sola etiqueta directa (el valor acumulado actual, no un número
por punto), sin leyenda (una sola serie, el título "Progreso de hoy" ya la
nombra). Dos cosas que la skill pide por defecto para gráficas de línea se
**omiten deliberadamente** aquí, seducidas por la escala real de este
componente:
- **Capa de hover/tooltip interactiva por punto.** El propio `Heatmap.tsx` de
  esta app ya sienta el precedente de no tenerla (celdas con `aria-label`,
  sin tooltip), aceptado en tres rondas de revisión de calidad anteriores.
  Esta gráfica tiene como mucho un puñado de puntos —replicar una capa de
  hover completa sería sobre-ingeniería para un widget de este tamaño, no
  una omisión accidental.
- **Vista de tabla accesible completa.** En su lugar, el SVG lleva
  `role="img"` y un `aria-label` con el resumen textual ("Progreso de hoy:
  56% completado"), que es la información que de verdad importa para un
  lector de pantalla — mismo criterio de proporcionalidad que el resto de la
  app usa para gráficos pequeños embebidos, no una tabla dashboard completa.

Si en el futuro se decide que la gráfica necesita más interactividad, ese es
un cambio de alcance propio, no algo que este plan dejó a medias.

---

## Task 1: `minutosDelDia` en `core/dates.ts`

Necesitamos convertir el timestamp completo que ya guarda cada anotación
(`Entry.actualizado_en`) en "minutos desde medianoche local", para poder
ubicar cada hábito completado en el eje X de 24 horas de la gráfica.

**Files:**
- Modify: `src/core/dates.ts`
- Modify: `src/core/dates.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Añade este `describe` al final de `src/core/dates.test.ts` (la importación de
`minutosDelDia` se añade en el Step 2, junto al resto de nombres importados
de `'./dates'` al principio del fichero):

```ts
describe('minutosDelDia', () => {
  it('es 0 justo a medianoche', () => {
    // Con TZ=Europe/Madrid (UTC+2 en agosto), la medianoche local del 23 es
    // las 22:00 UTC del 22 — no confundir con '2026-08-23T00:00:00.000Z',
    // que en local ya son las 02:00 (120 minutos), no medianoche.
    expect(minutosDelDia('2026-08-22T22:00:00.000Z')).toBe(0);
  });

  it('cuenta las horas y minutos del timestamp en hora local', () => {
    // Con TZ=Europe/Madrid (fijada en vite.config.ts), 10:00 UTC en agosto
    // (UTC+2) son las 12:00 locales → 12*60 = 720 minutos.
    expect(minutosDelDia('2026-08-23T10:00:00.000Z')).toBe(720);
  });

  it('el último minuto del día es 1439', () => {
    // 21:59 UTC en agosto (UTC+2) son las 23:59 locales.
    expect(minutosDelDia('2026-08-23T21:59:00.000Z')).toBe(1439);
  });

  it('lanza error con un timestamp que no se puede interpretar', () => {
    expect(() => minutosDelDia('no-es-una-fecha')).toThrow(/inválido/i);
  });
});
```

- [ ] **Step 2: Añadir `minutosDelDia` al import de la cabecera del test**

En `src/core/dates.test.ts`, el bloque de import actual es:

```ts
import { describe, it, expect } from 'vitest';
import {
  toIsoDate,
  fromIsoDate,
  isoDateOf,
```

Añade `minutosDelDia` a esa lista de nombres importados (en cualquier
posición dentro del bloque de import existente).

- [ ] **Step 3: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/dates.test.ts`
Esperado: FAIL — `minutosDelDia` no existe en `./dates`.

- [ ] **Step 4: Implementar `minutosDelDia`**

Añade al final de `src/core/dates.ts`:

```ts
/** Minutos desde medianoche local de un timestamp ISO completo. */
export function minutosDelDia(timestamp: string): number {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Timestamp inválido: "${timestamp}"`);
  }
  return d.getHours() * 60 + d.getMinutes();
}
```

- [ ] **Step 5: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/dates.test.ts`
Esperado: PASS, todos los tests del fichero (los que ya había más los 4
nuevos de `minutosDelDia`).

- [ ] **Step 6: Comprobar tipos**

```bash
npx tsc -b --force
```
Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/core/dates.ts src/core/dates.test.ts
git commit -m "feat(core): add minutosDelDia for local time-of-day extraction"
```

---

## Task 2: `progresoDelDia` en `core/dailyProgress.ts`

La función pura que calcula los puntos de la gráfica: qué hábitos
programados hoy ya están completados, en qué minuto del día se completaron,
y qué porcentaje acumulado representa cada uno.

**Files:**
- Create: `src/core/dailyProgress.ts`
- Test: `src/core/dailyProgress.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
import { describe, it, expect } from 'vitest';
import { progresoDelDia } from './dailyProgress';
import type { Entry, Habit } from './types';

function habito(id: string): Habit {
  return {
    id, nombre: id, tipo: 'booleano', objetivo: null,
    dias: [0, 1, 2, 3, 4, 5, 6], estado: 'nuevo', orden: 0,
    creado_en: '2026-08-01T10:00:00.000Z', actualizado_en: '2026-08-01T10:00:00.000Z',
  };
}

function cantidad(id: string, objetivo: number): Habit {
  return { ...habito(id), tipo: 'cantidad', objetivo };
}

function entrada(habit_id: string, valor: boolean | number, actualizado_en: string): Entry {
  return { habit_id, fecha: '2026-08-23', valor, actualizado_en };
}

describe('progresoDelDia', () => {
  it('devuelve vacío si no hay hábitos programados hoy', () => {
    expect(progresoDelDia([], new Map())).toEqual([]);
  });

  it('devuelve vacío si ninguno está completado', () => {
    const habitos = [habito('a'), habito('b')];
    expect(progresoDelDia(habitos, new Map())).toEqual([]);
  });

  it('un solo hábito completado da un único punto al 100%', () => {
    const habitos = [habito('a')];
    const entradas = new Map([['a', entrada('a', true, '2026-08-23T08:30:00.000Z')]]);
    const puntos = progresoDelDia(habitos, entradas);
    expect(puntos).toHaveLength(1);
    expect(puntos[0].porcentaje).toBe(100);
  });

  it('reparte el 100% en partes iguales y ordena por hora de marca', () => {
    const habitos = [habito('a'), habito('b'), habito('c')];
    // 'b' se marcó primero (08:00 UTC), luego 'a' (10:00 UTC), luego 'c' (12:00 UTC).
    const entradas = new Map([
      ['a', entrada('a', true, '2026-08-23T10:00:00.000Z')],
      ['b', entrada('b', true, '2026-08-23T08:00:00.000Z')],
      ['c', entrada('c', true, '2026-08-23T12:00:00.000Z')],
    ]);
    const puntos = progresoDelDia(habitos, entradas);
    expect(puntos).toHaveLength(3);
    // toBeCloseTo en vez de igualdad exacta: sumar 100/3 repetidamente en
    // coma flotante no siempre reconstruye el mismo valor que multiplicar.
    expect(puntos[0].porcentaje).toBeCloseTo(100 / 3);
    expect(puntos[1].porcentaje).toBeCloseTo((100 / 3) * 2);
    expect(puntos[2].porcentaje).toBeCloseTo(100);
    // El orden de los puntos sigue la hora de marca, no el orden de habitos[].
    expect(puntos[0].minutos).toBeLessThan(puntos[1].minutos);
    expect(puntos[1].minutos).toBeLessThan(puntos[2].minutos);
  });

  it('un hábito de cantidad sin alcanzar el objetivo no aporta punto', () => {
    const habitos = [cantidad('agua', 8)];
    const entradas = new Map([['agua', entrada('agua', 5, '2026-08-23T09:00:00.000Z')]]);
    expect(progresoDelDia(habitos, entradas)).toEqual([]);
  });

  it('un hábito de cantidad que alcanza el objetivo aporta punto igual que uno booleano', () => {
    const habitos = [cantidad('agua', 8)];
    const entradas = new Map([['agua', entrada('agua', 8, '2026-08-23T09:00:00.000Z')]]);
    const puntos = progresoDelDia(habitos, entradas);
    expect(puntos).toHaveLength(1);
    expect(puntos[0].porcentaje).toBe(100);
  });

  it('un hábito desmarcado (valor false) no aporta punto aunque tenga marca de tiempo', () => {
    const habitos = [habito('a')];
    const entradas = new Map([['a', entrada('a', false, '2026-08-23T09:00:00.000Z')]]);
    expect(progresoDelDia(habitos, entradas)).toEqual([]);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/core/dailyProgress.test.ts`
Esperado: FAIL — `Failed to resolve import "./dailyProgress"`.

- [ ] **Step 3: Implementar `src/core/dailyProgress.ts`**

```ts
import type { Entry, Habit } from './types';
import { isComplete } from './completion';
import { minutosDelDia } from './dates';

export interface PuntoProgreso {
  /** Minutos desde medianoche local en que se completó este hábito. */
  minutos: number;
  /** Porcentaje acumulado en ese instante, 0-100. */
  porcentaje: number;
}

/**
 * Progreso acumulado del día: un punto por cada hábito programado hoy que ya
 * está completado, en el instante en que se completó, repartiendo el 100%
 * en partes iguales entre los hábitos programados hoy. Los puntos vienen
 * ordenados por hora de marca ascendente.
 */
export function progresoDelDia(
  habitosHoy: Habit[],
  entradas: Map<string, Entry>,
): PuntoProgreso[] {
  if (habitosHoy.length === 0) return [];
  const paso = 100 / habitosHoy.length;

  const completados = habitosHoy.filter((h) => isComplete(h, entradas.get(h.id)));

  const minutos = completados
    .map((h) => minutosDelDia(entradas.get(h.id)!.actualizado_en))
    .sort((a, b) => a - b);

  let acumulado = 0;
  return minutos.map((m) => {
    acumulado += paso;
    return { minutos: m, porcentaje: acumulado };
  });
}
```

El `!` en `entradas.get(h.id)!` es seguro: `completados` ya filtró por
`isComplete`, que devuelve `false` cuando no hay entrada — así que todo
hábito en `completados` tiene garantizada una entrada real.

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/core/dailyProgress.test.ts`
Esperado: PASS, 7 tests.

- [ ] **Step 5: Comprobar tipos**

```bash
npx tsc -b --force
```
Esperado: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/core/dailyProgress.ts src/core/dailyProgress.test.ts
git commit -m "feat(core): add daily cumulative progress calculation"
```

---

## Task 3: Componente `DailyProgressChart`

El SVG que dibuja los puntos de `progresoDelDia` como una línea escalonada,
con la hora actual marcada y una proyección atenuada del tramo del día que
todavía no ha pasado.

**Files:**
- Create: `src/ui/DailyProgressChart.tsx`
- Test: `src/ui/DailyProgressChart.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DailyProgressChart } from './DailyProgressChart';
import type { PuntoProgreso } from '../core/dailyProgress';

describe('DailyProgressChart', () => {
  it('con puntos vacíos, muestra 0% y no revienta', () => {
    render(<DailyProgressChart puntos={[]} ahoraMinutos={600} />);
    expect(screen.getByRole('img', { name: /0%/ })).toBeDefined();
  });

  it('muestra el porcentaje acumulado del último punto en el aria-label', () => {
    const puntos: PuntoProgreso[] = [
      { minutos: 480, porcentaje: 50 },
      { minutos: 600, porcentaje: 100 },
    ];
    render(<DailyProgressChart puntos={puntos} ahoraMinutos={650} />);
    expect(screen.getByRole('img', { name: /100%/ })).toBeDefined();
  });

  it('pinta un punto por cada elemento de puntos', () => {
    const puntos: PuntoProgreso[] = [
      { minutos: 480, porcentaje: 33.3 },
      { minutos: 600, porcentaje: 66.6 },
      { minutos: 720, porcentaje: 100 },
    ];
    const { container } = render(<DailyProgressChart puntos={puntos} ahoraMinutos={800} />);
    expect(container.querySelectorAll('.grafica-punto')).toHaveLength(3);
  });

  it('sin puntos, redondea a 0% en vez de mostrar NaN', () => {
    render(<DailyProgressChart puntos={[]} ahoraMinutos={0} />);
    expect(screen.getByText('0%')).toBeDefined();
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/DailyProgressChart.test.tsx`
Esperado: FAIL — `Failed to resolve import "./DailyProgressChart"`.

- [ ] **Step 3: Implementar `src/ui/DailyProgressChart.tsx`**

```tsx
import type { PuntoProgreso } from '../core/dailyProgress';

const ANCHO = 320;
const ALTO = 150;
const X_INICIO = 30;
const X_FIN = 300;
const Y_ARRIBA = 15; // 100%
const Y_ABAJO = 120; // 0%
const MINUTOS_DIA = 24 * 60;

function xDe(minutos: number): number {
  return X_INICIO + (minutos / MINUTOS_DIA) * (X_FIN - X_INICIO);
}

function yDe(porcentaje: number): number {
  return Y_ABAJO - (porcentaje / 100) * (Y_ABAJO - Y_ARRIBA);
}

interface Props {
  puntos: PuntoProgreso[];
  /** Minuto actual del día, para dibujar la línea de "ahora" y cortar el trazo real ahí. */
  ahoraMinutos: number;
}

export function DailyProgressChart({ puntos, ahoraMinutos }: Props) {
  const porcentajeActual = puntos.length > 0 ? puntos[puntos.length - 1].porcentaje : 0;

  // Trazo escalonado: plano hasta la hora de cada marca, salto vertical ahí.
  const segmentos: string[] = [`M ${xDe(0)} ${yDe(0)}`];
  let yActual = yDe(0);
  for (const p of puntos) {
    const x = xDe(p.minutos);
    segmentos.push(`L ${x} ${yActual}`);
    yActual = yDe(p.porcentaje);
    segmentos.push(`L ${x} ${yActual}`);
  }
  segmentos.push(`L ${xDe(ahoraMinutos)} ${yActual}`);

  const hayProyeccion = ahoraMinutos < MINUTOS_DIA;

  return (
    <div className="card grafica-progreso">
      <h2>Progreso de hoy</h2>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        aria-label={`Progreso de hoy: ${Math.round(porcentajeActual)}% completado`}
      >
        <line x1={X_INICIO} y1={Y_ARRIBA} x2={X_INICIO} y2={Y_ABAJO} className="grafica-eje" />
        <line x1={X_INICIO} y1={Y_ABAJO} x2={X_FIN} y2={Y_ABAJO} className="grafica-eje" />
        <text x="2" y={Y_ARRIBA + 4} className="grafica-etiqueta">100%</text>
        <text x="8" y={Y_ABAJO + 4} className="grafica-etiqueta">0%</text>
        <text x={X_INICIO - 4} y={Y_ABAJO + 15} className="grafica-etiqueta">00h</text>
        <text x={X_FIN - 18} y={Y_ABAJO + 15} className="grafica-etiqueta">24h</text>

        <line
          x1={xDe(ahoraMinutos)}
          y1={Y_ARRIBA}
          x2={xDe(ahoraMinutos)}
          y2={Y_ABAJO}
          className="grafica-ahora"
        />

        <path d={segmentos.join(' ')} className="grafica-linea" />

        {hayProyeccion && (
          <line
            x1={xDe(ahoraMinutos)}
            y1={yActual}
            x2={X_FIN}
            y2={yActual}
            className="grafica-proyeccion"
          />
        )}

        {puntos.map((p) => (
          <circle key={p.minutos} cx={xDe(p.minutos)} cy={yDe(p.porcentaje)} r={4} className="grafica-punto" />
        ))}

        <text x={xDe(ahoraMinutos) + 6} y={yActual - 6} className="grafica-valor">
          {Math.round(porcentajeActual)}%
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Añadir los estilos al final de `src/styles.css`**

```css
.grafica-progreso svg { width: 100%; height: auto; display: block; }
.grafica-eje { stroke: var(--borde); stroke-width: 1; }
.grafica-etiqueta { fill: var(--texto-tenue); font-size: 9px; }
.grafica-ahora { stroke: var(--texto-tenue); stroke-width: 1; stroke-dasharray: 3 3; }
.grafica-linea {
  stroke: var(--exito);
  stroke-width: 2;
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.grafica-proyeccion { stroke: var(--exito); stroke-width: 2; stroke-dasharray: 2 3; opacity: 0.35; }
.grafica-punto { fill: var(--exito); stroke: var(--superficie); stroke-width: 2; }
.grafica-valor { fill: var(--texto); font-size: 11px; font-weight: 600; }
```

- [ ] **Step 5: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/DailyProgressChart.test.tsx`
Esperado: PASS, 4 tests.

- [ ] **Step 6: Comprobar tipos**

```bash
npx tsc -b --force
```
Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/ui/DailyProgressChart.tsx src/ui/DailyProgressChart.test.tsx src/styles.css
git commit -m "feat(ui): add daily progress step-line chart component"
```

---

## Task 4: Conectar la gráfica en `TodayScreen`

**Nota (de la revisión de calidad de la Task 2):** `core/types.ts` ahora
exporta `EntriesByHabitId = Map<string, Entry>`, un alias para el mapa de
anotaciones de hoy indexado por `habit_id` —distinto de `EntriesByDate`
(indexado por fecha), que tiene la misma forma pero significa otra cosa.
Al tocar `TodayScreen.tsx` en esta tarea, cambia el tipo de su estado
`entradas` de `Map<string, Entry>` a `EntriesByHabitId` (importándolo de
`../core/types`), para que quede usando el alias correcto en el sitio
donde más importa evitar la confusión.

**Files:**
- Modify: `src/ui/TodayScreen.tsx`
- Modify: `src/ui/TodayScreen.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Añade este `it` dentro del `describe('TodayScreen', ...)` ya existente en
`src/ui/TodayScreen.test.tsx` (después de los tests que ya hay):

```tsx
  it('muestra la gráfica de progreso y sube al marcar un hábito', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: hoyProgramado() });
    render(<TodayScreen />);

    expect(await screen.findByRole('img', { name: /progreso de hoy: 0%/i })).toBeDefined();

    await userEvent.click(await screen.findByRole('button', { name: /meditar/i }));

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /progreso de hoy: 100%/i })).toBeDefined();
    });
  });
```

Este test usa `hoyProgramado()` y las importaciones (`crearHabito`, `render`,
`screen`, `userEvent`, `waitFor`) que el fichero ya trae de tests anteriores
— no hace falta añadir ningún import nuevo.

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/TodayScreen.test.tsx`
Esperado: FAIL — no existe ningún elemento con rol `img` en la pantalla
todavía.

- [ ] **Step 3: Implementar el cambio en `src/ui/TodayScreen.tsx`**

Añade estos dos imports al principio del fichero, junto a los que ya hay:

```tsx
import { progresoDelDia } from '../core/dailyProgress';
import { minutosDelDia } from '../core/dates';
import { DailyProgressChart } from './DailyProgressChart';
```

(`DailyProgressChart` se añade a la lista de imports; `progresoDelDia` y
`minutosDelDia` son imports nuevos independientes.)

Justo antes del `return` final del componente (antes de `{todoHecho && ...}`
y del botón "Actualizar", en el mismo `<>...</>` que ya envuelve todo lo
demás), añade:

```tsx
      {deHoy.length > 0 && (
        <DailyProgressChart
          puntos={progresoDelDia(deHoy, entradas)}
          ahoraMinutos={minutosDelDia(new Date().toISOString())}
        />
      )}
```

Colócalo después del bloque `{consolidados.length > 0 && (...)}` y antes de
`{todoHecho && ...}`, para que quede al final de la lista de hábitos, como
resumen de cierre — igual que se aprobó en el diseño.

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/TodayScreen.test.tsx`
Esperado: PASS, todos los tests del fichero (los que ya había más el nuevo).

- [ ] **Step 5: Comprobar tipos y suite completa**

```bash
npx tsc -b --force
npm run test
```
Esperado: sin errores; toda la suite en verde.

- [ ] **Step 6: Commit**

```bash
git add src/ui/TodayScreen.tsx src/ui/TodayScreen.test.tsx
git commit -m "feat(ui): show the daily progress chart on the Today screen"
```

---

## Task 5: Verificación final

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

Con `npm run dev` abierto, y con la base de datos vacía (o usando un
navegador/perfil nuevo):

1. Ajustes → crea tres hábitos booleanos programados todos los días:
   "Meditar", "Leer", "Estirar".
2. Hoy → debajo de la lista aparece la tarjeta "Progreso de hoy" con una
   gráfica plana en 0%, una línea vertical punteada marcando la hora actual,
   y "0%" como texto.
3. Marca "Meditar". La línea sube en escalón hasta ~33% en el punto
   correspondiente a la hora actual; el texto pasa a mostrar "33%" (o el
   valor exacto de 100/3).
4. Marca "Leer". Un segundo escalón sube hasta ~67%.
5. Marca "Estirar". Un tercer escalón llega al 100%.
6. Desmarca "Meditar" (vuelve a pulsarlo). El porcentaje baja de nuevo a
   ~67% — la gráfica refleja el estado actual, no cada marca que hiciste.
7. Recarga la página con F5: la gráfica sigue mostrando el mismo porcentaje
   (los datos vienen de IndexedDB, no de estado efímero).

- [ ] **Step 4: Commit final (si el Step 3 no requirió cambios)**

Si el recorrido manual no reveló ningún problema, no hay nada que comitear
en este paso — es solo verificación.
