# Historial: vista de todos los hábitos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el selector de un solo hábito en la pantalla Historial por
una lista donde cada hábito muestra su propio heatmap compacto y racha, con
la posibilidad de expandir uno a la vez para ver el detalle completo que ya
existe hoy (heatmap de 182 días + estadísticas).

**Architecture:** Toda la lógica que hoy vive en `HistoryScreen.tsx` (carga de
entradas, construcción del heatmap, tarjeta de edición retroactiva) se mueve
a un nuevo componente `HabitHistoryRow.tsx`, uno por hábito. `HistoryScreen`
queda como un contenedor delgado que solo lista hábitos y controla cuál fila
está expandida (acordeón: una sola a la vez). `Heatmap.tsx` gana una etiqueta
por hábito para que las celdas de distintos hábitos —o del mismo hábito en su
vista compacta y expandida— nunca compartan el mismo nombre accesible en
pantalla.

**Tech Stack:** React + TypeScript + Vitest + `@testing-library/react`, sobre
la base ya construida (`core/`, `store/`) sin cambios.

---

## Orden de las tareas y por qué

Este plan modifica una interfaz pública (`Heatmap`'s props) que un único
archivo consume hoy (`HistoryScreen.tsx`). Para que cada tarea deje el árbol
compilando y con los tests en verde —el mismo estándar que el resto del
proyecto— la Task 1 incluye un parche mínimo y deliberadamente temporal sobre
el `HistoryScreen.tsx` actual, que la Task 3 sustituye por completo. No es
descuido: es la forma de no romper la compilación entre tareas.

---

## Task 1: Etiqueta accesible por hábito en el heatmap

Hoy cada celda del heatmap se identifica solo por su fecha
(`aria-label={fecha}`). Eso funciona mientras solo se ve un heatmap a la vez.
En la nueva pantalla habrá varios heatmaps simultáneos (uno por fila) y,
además, cada fila puede mostrar dos ventanas distintas del mismo hábito
(compacta y expandida) — sin distinguir por hábito, dos celdas del mismo día
en hábitos distintos terminarían con el mismo nombre accesible en la misma
pantalla, lo cual es tanto un problema de accesibilidad real (un lector de
pantalla no podría distinguirlas) como de pruebas (los selectores por nombre
dejarían de ser únicos).

**Files:**
- Modify: `src/ui/Heatmap.tsx`
- Modify: `src/ui/Heatmap.test.tsx`
- Modify: `src/ui/HistoryScreen.tsx` (un solo parche mínimo, ver nota abajo)
- Modify: `src/ui/HistoryScreen.test.tsx` (ajuste mínimo, ver nota abajo)

- [ ] **Step 1: Escribir los tests que fallan para `Heatmap.tsx`**

Reemplaza el contenido completo de `src/ui/Heatmap.test.tsx`:

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
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('etiqueta cada celda con el hábito y su fecha', () => {
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-24' })).toBeDefined();
  });

  it('distingue completo, pendiente y no programado', () => {
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-24' }).className).toContain('completo');
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-26' }).className).toContain('pendiente');
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-25' }).className).toContain('libre');
  });

  it('devuelve la fecha al pulsar una celda', async () => {
    const onSeleccionar = vi.fn();
    render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={onSeleccionar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Meditar: 2026-08-26' }));
    expect(onSeleccionar).toHaveBeenCalledWith('2026-08-26');
  });

  it('dos hábitos con la misma fecha producen etiquetas distintas', () => {
    const { rerender } = render(<Heatmap celdas={celdas} etiquetaHabito="Meditar" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Meditar: 2026-08-24' })).toBeDefined();

    rerender(<Heatmap celdas={celdas} etiquetaHabito="Correr" onSeleccionar={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Correr: 2026-08-24' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Meditar: 2026-08-24' })).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/Heatmap.test.tsx`
Esperado: FAIL — `etiquetaHabito` no existe en las props actuales; el segundo y
quinto test no encuentran botones con esos nombres (siguen etiquetados solo
con la fecha).

- [ ] **Step 3: Implementar el cambio en `Heatmap.tsx`**

Reemplaza el contenido completo de `src/ui/Heatmap.tsx`:

```tsx
import type { IsoDate } from '../core/types';
import type { HeatmapCell } from '../core/heatmap';

interface Props {
  celdas: HeatmapCell[];
  /** Nombre del hábito, para que la celda sea distinguible cuando hay varios heatmaps en pantalla. */
  etiquetaHabito: string;
  onSeleccionar: (fecha: IsoDate) => void;
}

function clase(celda: HeatmapCell): string {
  if (!celda.programado) return 'libre';
  return celda.completo ? 'completo' : 'pendiente';
}

export function Heatmap({ celdas, etiquetaHabito, onSeleccionar }: Props) {
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
          aria-label={`${etiquetaHabito}: ${c.fecha}`}
          className={`celda ${clase(c)}`}
          onClick={() => onSeleccionar(c.fecha)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Parchear el único consumidor actual para no romper la compilación**

`HistoryScreen.tsx` todavía no se reescribe en esta tarea (eso es la Task 3) —
solo necesita seguir compilando y sus tests en verde. En
`src/ui/HistoryScreen.tsx`, cambia únicamente esta línea:

```tsx
      <Heatmap celdas={celdas} onSeleccionar={setDiaAbierto} />
```

por:

```tsx
      <Heatmap celdas={celdas} etiquetaHabito={habit.nombre} onSeleccionar={setDiaAbierto} />
```

Nada más cambia en este fichero en esta tarea.

- [ ] **Step 5: Ajustar `HistoryScreen.test.tsx` para que sus aserciones sigan siendo válidas**

Los nombres accesibles de las celdas ahora llevan el prefijo del hábito. En
`src/ui/HistoryScreen.test.tsx`, cambia las cuatro búsquedas por fecha exacta
a una coincidencia por expresión regular (sigue encontrando el botón sea cual
sea el prefijo, sin acoplarse al nombre exacto del hábito de cada test):

```tsx
    expect(await screen.findByRole('button', { name: hoy() })).toBeDefined();
```
por
```tsx
    expect(await screen.findByRole('button', { name: new RegExp(hoy()) })).toBeDefined();
```

```tsx
    await userEvent.click(await screen.findByRole('button', { name: ayer }));
```
por
```tsx
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(ayer) }));
```

```tsx
    await userEvent.click(await screen.findByRole('button', { name: diaA }));
```
por
```tsx
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(diaA) }));
```

```tsx
    await userEvent.click(await screen.findByRole('button', { name: diaB }));
```
por
```tsx
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(diaB) }));
```

Son exactamente esas cuatro líneas las que cambian — cada una aparece una
sola vez en el fichero. Más abajo en ese mismo test hay un
`screen.getByLabelText('Cantidad')` y un `guardadas.find((e) => e.fecha === diaB)`:
ninguno de los dos busca por `getByRole('button', { name: ... })`, así que no
se tocan.

- [ ] **Step 6: Ejecutar ambos ficheros de test para verificar que pasan**

Run: `npx vitest run src/ui/Heatmap.test.tsx src/ui/HistoryScreen.test.tsx`
Esperado: PASS — 5 tests en `Heatmap.test.tsx`, los mismos de siempre en
`HistoryScreen.test.tsx` (sin cambios en su cantidad, solo en cómo buscan los
botones).

- [ ] **Step 7: Comprobar tipos y suite completa**

```bash
npx tsc -b --force
npm run test
```
Esperado: sin errores; toda la suite en verde (159 tests más los nuevos que
sume este cambio respecto al último recuento del proyecto).

- [ ] **Step 8: Commit**

```bash
git add src/ui/Heatmap.tsx src/ui/Heatmap.test.tsx src/ui/HistoryScreen.tsx src/ui/HistoryScreen.test.tsx
git commit -m "refactor(ui): give heatmap cells a per-habit accessible label"
```

---

## Task 2: Componente `HabitHistoryRow`

Aquí vive toda la lógica que antes estaba en `HistoryScreen`: cargar las
anotaciones del hábito, construir el heatmap (compacto o completo según esté
expandida la fila), la racha inline, y la tarjeta de edición retroactiva.
`HistoryScreen` no se toca en esta tarea — este componente se prueba de forma
completamente independiente, renderizándolo directamente.

**Files:**
- Create: `src/ui/HabitHistoryRow.tsx`
- Test: `src/ui/HabitHistoryRow.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Escribir los tests que fallan**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito } from '../store/habits';
import { entriesDeHabito, marcarHabito } from '../store/entries';
import { addDays, hoy } from '../core/dates';
import { HabitHistoryRow } from './HabitHistoryRow';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbCache();
});

describe('HabitHistoryRow', () => {
  it('muestra el heatmap compacto (últimas 8 semanas) cuando está colapsada', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    expect(await screen.findByRole('button', { name: `Meditar: ${hoy()}` })).toBeDefined();
    // 60 días atrás cae fuera de la ventana compacta de 56 días (8 semanas).
    const fueraDeRango = addDays(hoy(), -60);
    expect(screen.queryByRole('button', { name: `Meditar: ${fueraDeRango}` })).toBeNull();
  });

  it('muestra la racha junto al nombre cuando es mayor que cero', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    await marcarHabito(h.id, hoy(), true);
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    expect(await screen.findByText(/🔥 1/)).toBeDefined();
  });

  it('no muestra racha cuando es cero', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    await screen.findByRole('button', { name: `Meditar: ${hoy()}` });
    expect(screen.queryByText(/🔥/)).toBeNull();
  });

  it('al expandir muestra el heatmap completo (182 días) y las estadísticas', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={true} onToggleExpandir={() => {}} />);

    // 60 días atrás cabe en la ventana completa de 182 días, aunque no en la compacta.
    const soloEnCompleto = addDays(hoy(), -60);
    expect(await screen.findByRole('button', { name: `Meditar: ${soloEnCompleto}` })).toBeDefined();
    expect(screen.getByTestId('racha-actual')).toBeDefined();
    expect(screen.getByTestId('racha-maxima')).toBeDefined();
    expect(screen.getByTestId('cumplimiento')).toBeDefined();
  });

  it('al colapsar oculta el heatmap completo y las estadísticas', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    await screen.findByRole('button', { name: `Meditar: ${hoy()}` });
    expect(screen.queryByTestId('racha-actual')).toBeNull();
  });

  it('tocar una celda del heatmap compacto abre la tarjeta y persiste sin necesidad de expandir', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    const ayer = addDays(hoy(), -1);
    render(<HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: `Meditar: ${ayer}` }));
    await userEvent.click(await screen.findByRole('button', { name: /marcar como hecho/i }));

    const guardadas = await entriesDeHabito(h.id);
    expect(guardadas.map((e) => e.fecha)).toContain(ayer);
  });

  it('llama a onToggleExpandir al tocar el nombre del hábito', async () => {
    const h = await crearHabito({
      nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6],
    });
    let llamado = false;
    render(
      <HabitHistoryRow habit={h} expandido={false} onToggleExpandir={() => { llamado = true; }} />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Meditar' }));
    expect(llamado).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/HabitHistoryRow.test.tsx`
Esperado: FAIL — `Failed to resolve import "./HabitHistoryRow"`.

- [ ] **Step 3: Implementar `src/ui/HabitHistoryRow.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { EntriesByDate, Habit, IsoDate } from '../core/types';
import { addDays, hoy as fechaDeHoy } from '../core/dates';
import { buildHeatmap } from '../core/heatmap';
import { isComplete } from '../core/completion';
import { isScheduled } from '../core/schedule';
import { currentStreak } from '../core/streaks';
import { mapaDeEntries, marcarHabito } from '../store/entries';
import { Heatmap } from './Heatmap';
import { HabitDetail } from './HabitDetail';

/** Ventana del heatmap compacto: últimas 8 semanas. */
const DIAS_COMPACTO = 56;
/** Ventana del heatmap expandido: la misma de siempre, 26 semanas. */
const DIAS_COMPLETO = 182;

function rangoDe(dias: number): { desde: IsoDate; hasta: IsoDate } {
  const hasta = fechaDeHoy();
  return { desde: addDays(hasta, -(dias - 1)), hasta };
}

interface Props {
  habit: Habit;
  expandido: boolean;
  onToggleExpandir: () => void;
}

export function HabitHistoryRow({ habit, expandido, onToggleExpandir }: Props) {
  const [entradas, setEntradas] = useState<EntriesByDate>(new Map());
  const [cargando, setCargando] = useState(true);
  const [diaAbierto, setDiaAbierto] = useState<IsoDate | null>(null);

  const recargarEntradas = useCallback(async () => {
    setEntradas(await mapaDeEntries(habit.id));
  }, [habit.id]);

  // Guarda contra resultados obsoletos: si esta fila llegara a reutilizarse
  // para otro hábito (cambio de `habit.id`), una carga anterior más lenta no
  // debe pisar los datos del hábito actual. Mismo patrón ya usado en
  // TodayScreen y en la versión anterior de HistoryScreen.
  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    void (async () => {
      const mapa = await mapaDeEntries(habit.id);
      if (cancelado) return;
      setEntradas(mapa);
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [habit.id]);

  // Al expandir o colapsar, no dejar abierta la tarjeta de un día que ya no
  // tiene sentido en el nuevo contexto visual.
  useEffect(() => {
    setDiaAbierto(null);
  }, [expandido]);

  async function guardarDia(valor: boolean | number) {
    if (!diaAbierto) return;
    const dia = diaAbierto;
    await marcarHabito(habit.id, dia, valor);
    await recargarEntradas();
    // Igual que en la versión anterior: solo cierra la tarjeta si sigue
    // mostrando el día que se acaba de guardar.
    setDiaAbierto((actual) => (actual === dia ? null : actual));
  }

  if (cargando) return <p className="vacio">Cargando…</p>;

  const racha = currentStreak(habit, entradas, fechaDeHoy());
  const rango = expandido ? rangoDe(DIAS_COMPLETO) : rangoDe(DIAS_COMPACTO);
  const celdas = buildHeatmap(habit, entradas, rango.desde, rango.hasta);

  const entradaDelDia = diaAbierto ? entradas.get(diaAbierto) : undefined;
  const completoElDia = diaAbierto && entradaDelDia ? isComplete(habit, entradaDelDia) : false;

  return (
    <div className="card fila-historial">
      <button className="enlace-habito" onClick={onToggleExpandir} aria-expanded={expandido}>
        <span className="fila-nombre">{habit.nombre}</span>
        {racha > 0 && <span className="racha">🔥 {racha}</span>}
      </button>

      <Heatmap celdas={celdas} etiquetaHabito={habit.nombre} onSeleccionar={setDiaAbierto} />

      {diaAbierto && (
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
                key={diaAbierto}
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

      {expandido && <HabitDetail habit={habit} entries={entradas} />}
    </div>
  );
}
```

- [ ] **Step 4: Añadir los estilos al final de `src/styles.css`**

```css
.fila-historial { display: flex; flex-direction: column; gap: 6px; }

.enlace-habito {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: var(--texto);
  font: inherit;
  font-size: 1rem;
  padding: 0;
  cursor: pointer;
  text-align: left;
}
```

(`.racha` ya existe desde la fila de hábito de la pantalla Hoy — se reutiliza
tal cual, sin redefinirla.)

- [ ] **Step 5: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/HabitHistoryRow.test.tsx`
Esperado: PASS, 7 tests.

- [ ] **Step 6: Comprobar tipos**

```bash
npx tsc -b --force
```
Esperado: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/ui/HabitHistoryRow.tsx src/ui/HabitHistoryRow.test.tsx src/styles.css
git commit -m "feat(ui): add per-habit history row with compact and full heatmap"
```

---

## Task 3: Reescribir `HistoryScreen` como lista de todos los hábitos

Con `HabitHistoryRow` ya construido y probado, `HistoryScreen` se reduce a un
contenedor: lista los hábitos y decide cuál está expandido. Esta tarea
sustituye por completo el parche temporal de la Task 1 y el fichero de test
anterior.

**Files:**
- Modify: `src/ui/HistoryScreen.tsx` (reemplazo completo)
- Modify: `src/ui/HistoryScreen.test.tsx` (reemplazo completo)

Nota sobre alcance de las pruebas: los casos de "marcar un día pasado" y "no
filtrar un valor sin confirmar entre días" ya se prueban en
`HabitHistoryRow.test.tsx` (Task 2), porque esa es la lógica que efectivamente
los implementa ahora. Repetirlos aquí sería probar `HabitHistoryRow` a través
de una capa extra de indirección sin ganar cobertura real. Las pruebas de
`HistoryScreen` se quedan en lo que le corresponde a un contenedor: listar,
el estado vacío, y la propiedad de acordeón (una sola fila expandida a la
vez).

- [ ] **Step 1: Escribir los tests que fallan**

Reemplaza el contenido completo de `src/ui/HistoryScreen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetDbCache } from '../store/db';
import { crearHabito } from '../store/habits';
import { hoy } from '../core/dates';
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

  it('muestra una fila por cada hábito', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });
    await crearHabito({ nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });

    render(<HistoryScreen />);
    expect(await screen.findByRole('button', { name: 'Meditar' })).toBeDefined();
    expect(await screen.findByRole('button', { name: 'Correr' })).toBeDefined();
    expect(await screen.findByRole('button', { name: `Meditar: ${hoy()}` })).toBeDefined();
    expect(await screen.findByRole('button', { name: `Correr: ${hoy()}` })).toBeDefined();
  });

  it('solo una fila puede estar expandida a la vez', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });
    await crearHabito({ nombre: 'Correr', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });

    render(<HistoryScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Meditar' }));
    expect(await screen.findAllByTestId('racha-actual')).toHaveLength(1);

    await userEvent.click(await screen.findByRole('button', { name: 'Correr' }));
    expect(await screen.findAllByTestId('racha-actual')).toHaveLength(1);
  });

  it('tocar el hábito expandido lo colapsa de nuevo', async () => {
    await crearHabito({ nombre: 'Meditar', tipo: 'booleano', objetivo: null, dias: [0, 1, 2, 3, 4, 5, 6] });

    render(<HistoryScreen />);
    const boton = await screen.findByRole('button', { name: 'Meditar' });
    await userEvent.click(boton);
    await screen.findByTestId('racha-actual');

    await userEvent.click(boton);
    expect(screen.queryByTestId('racha-actual')).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx vitest run src/ui/HistoryScreen.test.tsx`
Esperado: FAIL — el `HistoryScreen` actual todavía usa el selector, no
renderiza botones con el nombre del hábito a secas.

- [ ] **Step 3: Implementar `src/ui/HistoryScreen.tsx`**

Reemplaza el contenido completo del fichero:

```tsx
import { useState } from 'react';
import { useHabits } from './useHabits';
import { HabitHistoryRow } from './HabitHistoryRow';

export function HistoryScreen() {
  const { habitos, cargando } = useHabits();
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  if (cargando) return <p className="vacio">Cargando…</p>;
  if (habitos.length === 0) {
    return (
      <>
        <h1>Historial</h1>
        <p className="vacio">No tienes hábitos todavía. Créalos desde Ajustes.</p>
      </>
    );
  }

  return (
    <>
      <h1>Historial</h1>
      {habitos.map((h) => (
        <HabitHistoryRow
          key={h.id}
          habit={h}
          expandido={expandidoId === h.id}
          onToggleExpandir={() => setExpandidoId((actual) => (actual === h.id ? null : h.id))}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

Run: `npx vitest run src/ui/HistoryScreen.test.tsx`
Esperado: PASS, 4 tests.

- [ ] **Step 5: Comprobar tipos y suite completa**

```bash
npx tsc -b --force
npm run test
```
Esperado: sin errores; toda la suite en verde.

- [ ] **Step 6: Commit**

```bash
git add src/ui/HistoryScreen.tsx src/ui/HistoryScreen.test.tsx
git commit -m "feat(ui): show every habit's history at once instead of a selector"
```

---

## Task 4: Verificación final

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

- [ ] **Step 3: Recorrido manual actualizado de Historial**

El recorrido manual original (Task 24 del plan de la app, pasos 7 y 8) decía
"Historial → elige 'Meditar'" — ese selector ya no existe. Con
`npm run dev` abierto, y con "Meditar" y "Agua" ya creados y marcados en Hoy
(pasos 1-6 del recorrido original, sin cambios):

1. Historial → se ven **ambas** filas ("Meditar" y "Agua"), cada una con su
   propio heatmap compacto. El día de hoy aparece en verde en ambas.
2. Toca el nombre "Meditar" → se expande: aparece el heatmap completo de 182
   días y el panel de racha actual / racha máxima / % de cumplimiento.
3. Toca el nombre "Agua" → "Meditar" se colapsa automáticamente (vuelve a su
   heatmap compacto) y "Agua" se expande en su lugar. Nunca hay dos filas
   expandidas a la vez.
4. Con "Agua" expandida, toca una celda de un día pasado → "Marcar como
   hecho" (o el campo numérico si es de cantidad) → la celda se vuelve verde
   y la racha del panel se actualiza según corresponda.
5. Toca "Agua" de nuevo → se colapsa, vuelve a su heatmap compacto de 8
   semanas.

- [ ] **Step 4: Commit**

Si el Step 3 no requirió cambios de código, no hay nada que comitear en este
paso — es solo verificación. Si se detecta algo durante el recorrido, corregir
con su propio ciclo de test antes de continuar.
