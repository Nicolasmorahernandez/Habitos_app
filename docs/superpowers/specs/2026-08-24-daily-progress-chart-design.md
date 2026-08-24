# Gráfica de progreso del día — Diseño

Fecha: 2026-08-24
Estado: aprobado, pendiente de plan de implementación

## Propósito

Añadir a la pantalla Hoy una gráfica que muestre, de un vistazo, cuánto llevas
del día. El 100% se reparte en partes iguales entre los hábitos programados
hoy (con 9 hábitos, cada uno vale ~11.1%), y la línea sube en escalón en el
momento exacto del día en que marcas cada uno como cumplido.

## Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Tipo de gráfica | Línea escalonada acumulada | Es la lectura más directa de "cuánto llevo hoy y cuándo lo fui logrando" |
| Ubicación | Al final de la pantalla Hoy, después de "Consolidados" | Resumen de cierre: primero se marcan los hábitos, al final se ve el progreso del día completo |
| Al desmarcar un hábito | La línea baja | Refleja el estado real actual, no un historial de intentos |
| Hábitos de cantidad | Cuentan de golpe solo al alcanzar el objetivo | Mismo criterio que `isComplete` ya usa en toda la app; no hace falta lógica nueva |
| Indicador de "ahora" | Línea vertical punteada en la hora actual | El tramo entre "ahora" y medianoche queda atenuado porque todavía no ha pasado |
| Día sin hábitos o sin nada marcado | Línea plana en 0% | Consistente, sin estados especiales que mantener |

## Arquitectura

Una función pura nueva en `core/` y un componente presentacional nuevo en
`ui/`, conectados desde `TodayScreen.tsx` sin tocar `store/` — todos los datos
que hacen falta ya están cargados ahí.

### `core/dailyProgress.ts` (nuevo)

```ts
export interface PuntoProgreso {
  /** Minutos desde medianoche local en que se completó este hábito. */
  minutos: number;
  /** Porcentaje acumulado en ese instante, 0-100. */
  porcentaje: number;
}

export function progresoDelDia(
  habitosHoy: Habit[],
  entradas: Map<string, Entry>,
): PuntoProgreso[]
```

Toma los hábitos programados hoy (`isScheduled`, ya filtrados por quien
llame) y el mapa de anotaciones de hoy (`habit_id → Entry`, el mismo que
`TodayScreen` ya mantiene en memoria). Calcula `paso = 100 / habitosHoy.length`,
filtra los hábitos con `isComplete(habit, entrada) === true` (esto ya
resuelve solo-al-completar para hábitos de cantidad, sin lógica adicional),
los ordena por `entrada.actualizado_en` ascendente, y devuelve un punto
acumulado por cada uno. Con cero hábitos programados hoy, devuelve `[]`.

Necesita un ayudante nuevo en `core/dates.ts`:

```ts
/** Minutos desde medianoche local de un timestamp ISO completo. */
export function minutosDelDia(timestamp: string): number
```

### `ui/DailyProgressChart.tsx` (nuevo)

Componente presentacional puro: recibe `puntos: PuntoProgreso[]` y
`totalHabitos: number`, no toca `store/`. Dibuja un SVG con:
- Eje X de 00:00 a 24:00, eje Y de 0% a 100%.
- La línea escalonada, sólida, desde 00:00 hasta la hora actual.
- Una línea vertical punteada en la hora actual ("ahora").
- El tramo entre "ahora" y medianoche, si lo hay, dibujado atenuado (el resto
  del día que aún no ha ocurrido).
- El porcentaje acumulado actual como texto.
- Con `puntos` vacío, se dibuja como una línea plana en 0% hasta "ahora".

### `TodayScreen.tsx` (modificado)

Después de la sección "Consolidados", ya con `deHoy` (hábitos programados
hoy) y `entradas` (anotaciones de hoy) ya calculados en el componente:

```tsx
<DailyProgressChart
  puntos={progresoDelDia(deHoy, entradas)}
  totalHabitos={deHoy.length}
/>
```

## Datos

No hay cambios en `store/` ni en el esquema de IndexedDB. `TodayScreen` ya
carga tanto los hábitos programados hoy como sus anotaciones de hoy para
pintar la lista; la gráfica reutiliza exactamente esos mismos datos, ya en
memoria. `Entry.actualizado_en` ya se escribe en cada marca (`marcarHabito`
usa `new Date().toISOString()`), así que la hora de cada marca ya existe sin
necesidad de ningún cambio al modelo de datos.

Nota sobre desmarcar y volver a marcar: como `entries` guarda un único
registro por `(habit_id, fecha)`, si un hábito se marca, se desmarca y se
vuelve a marcar el mismo día, `actualizado_en` refleja la última marca — la
gráfica usa esa hora, que es la lectura correcta ("cuándo quedó completado
de verdad", no un historial de cada toque).

## Manejo de errores

No hay nuevas rutas de error: `progresoDelDia` es una función pura sobre
datos ya validados y cargados por `TodayScreen`, sin acceso a IndexedDB ni
temporizadores propios.

## Estrategia de pruebas

`core/dailyProgress.test.ts`: día sin hábitos programados devuelve `[]`;
un hábito completado da un único punto al 100%; varios hábitos completados
en distintas horas producen puntos ordenados por hora, cada uno sumando el
paso correcto; un hábito de cantidad no completado (por debajo del objetivo)
no aporta punto; un hábito de cantidad que sí alcanza el objetivo sí aporta
punto igual que uno booleano; un hábito desmarcado (entrada con `valor:
false`) no aporta punto aunque tenga una marca de tiempo.

`core/dates.test.ts` (ampliado): `minutosDelDia` sobre unos pocos timestamps
de referencia, incluyendo medianoche (0) y 23:59 (1439).

`ui/DailyProgressChart.test.tsx`: renderiza sin explotar con `puntos: []`;
muestra el porcentaje acumulado correcto como texto con una lista de puntos
de ejemplo.

`TodayScreen.test.tsx`: se añade un caso que confirma que la gráfica aparece
después de marcar un hábito y refleja el nuevo porcentaje (integración
mínima, ya que la lógica fina vive en `core/dailyProgress.test.ts`).

## Fuera de alcance

- Cualquier vista histórica de "progreso por hora" para días pasados (esto es
  solo para el día de hoy, en la pantalla Hoy).
- Animaciones o transiciones al marcar un hábito.
- Persistir un registro de "a qué hora se marcó cada vez" más allá del único
  timestamp que `entries` ya guarda — no se toca `store/` ni el esquema.
