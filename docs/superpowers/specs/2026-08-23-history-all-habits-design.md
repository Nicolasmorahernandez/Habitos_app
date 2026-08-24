# Historial: vista de todos los hábitos — Diseño

Fecha: 2026-08-23
Estado: aprobado, pendiente de plan de implementación

## Propósito

Hoy la pantalla Historial exige elegir un hábito en un `<select>` para ver su
heatmap. Con varios hábitos, eso obliga a ir cambiando de uno en uno para
tener una vista general de la constancia. Este cambio muestra **todos los
hábitos a la vez**, cada uno con un vistazo compacto de su historial reciente,
y permite expandir cualquiera para ver el detalle completo que ya existe hoy
(heatmap de 182 días + racha actual, racha máxima y % de cumplimiento).

Inspirado en apps como Habitwise, donde cada hábito es una fila con su propio
mini-calendario visible sin necesidad de seleccionarlo primero.

## Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Vista por defecto | Lista de todos los hábitos, cada uno con heatmap compacto | Vista general de un vistazo, sin selector |
| Tamaño del heatmap compacto | Últimas 8 semanas (56 días) | Cabe en el ancho de pantalla sin scroll horizontal, similar a un vistazo mensual |
| Estadísticas en la lista | Solo racha actual, junto al nombre (🔥 N) | El detalle completo no cabe por hábito en una lista; se accede expandiendo |
| Expandir hábito | Muestra el heatmap completo (182 días) + las 3 estadísticas, igual que hoy | No se pierde ninguna funcionalidad existente, solo cambia cómo se llega a ella |
| Cuántos expandidos a la vez | Uno solo (acordeón) | Evita saturar la pantalla y triplicar heatmaps grandes simultáneos |
| Edición retroactiva | Igual que hoy: tocar una celda (compacta o expandida) abre la tarjeta de marcar el día | Es la función central de esta pantalla, no se toca su comportamiento |

## Arquitectura

Dos componentes en `src/ui/`, con la complejidad movida de la pantalla al
componente de fila:

### `HistoryScreen.tsx` (reescrito, se simplifica)
Deja de manejar selector, heatmap y tarjeta de edición directamente. Pasa a
ser un contenedor delgado: usa `useHabits()`, y por cada hábito programado o
no, archivado excluido (mismo filtro que ya aplica `listarHabitos()` por
defecto), renderiza un `<HabitHistoryRow>`. Mantiene el estado de qué fila
está expandida (`expandidoId: string | null`) y se lo pasa a cada fila junto
con una función para alternar. El mensaje de "no tienes hábitos todavía" se
mantiene igual.

### `HabitHistoryRow.tsx` (nuevo)
Concentra toda la lógica que antes vivía en `HistoryScreen`, ahora por hábito:
- Al montar, trae las anotaciones del hábito una sola vez con `mapaDeEntries`
  (igual que hace hoy `HistoryScreen`, con la misma guarda contra resultados
  obsoletos que ya se aplicó en `TodayScreen`/`HistoryScreen`).
- Con esas anotaciones ya en memoria, construye dos vistas sin volver a pedir
  datos: `buildHeatmap` con una ventana de 8 semanas para el heatmap compacto
  (siempre visible), y con 182 días para el heatmap completo (solo si la fila
  está expandida).
- Muestra el nombre del hábito y su racha actual (🔥 N, mismo estilo que ya
  usa `HabitRow` en la pantalla Hoy) junto al heatmap compacto.
- Al tocar el nombre del hábito (un `<button>`, no toda la fila —para no
  interferir con el toque de las celdas del heatmap compacto, que están justo
  al lado), se expande: aparece el heatmap de 182 días y
  `<HabitDetail habit entries>` sin cambios. Tocar de nuevo colapsa.
- La tarjeta de edición retroactiva (marcar un día pasado) vive dentro de este
  componente, portada tal cual desde la implementación actual de
  `HistoryScreen`: tocar cualquier celda —del heatmap compacto o del
  expandido— abre la tarjeta para ese hábito y esa fecha, con el mismo
  comportamiento para hábitos booleanos y de cantidad, incluida la nota de
  "ese día no estaba programado" cuando aplique.

`Heatmap.tsx` y `HabitDetail.tsx` no cambian: son componentes puros que ya
reciben `celdas`/`habit`+`entries` como props, indiferentes al tamaño de la
ventana o a si están dentro de una fila compacta o expandida.

## Datos

No hay cambios en `core/` ni en `store/`. Cada fila usa las funciones que ya
existen:
- `mapaDeEntries(habit_id)` — una vez por hábito al montar la pantalla, igual
  que hoy hace `HistoryScreen` para el hábito seleccionado. Con N hábitos
  visibles, esto es N llamadas en paralelo al cargar la pantalla; a la escala
  de esta app (un puñado de hábitos, unos pocos años de historial) es
  intrascendente, siguiendo el mismo criterio ya documentado para
  `TodayScreen`/`HistoryScreen` en el plan original.
- `buildHeatmap(habit, entries, desde, hasta)` — se llama dos veces por fila
  (compacto y completo) sobre el mismo mapa de entradas ya en memoria, sin
  IndexedDB de por medio la segunda vez.
- `currentStreak`, `longestStreak`, `completionRate` — sin cambios, usados
  exactamente como hoy dentro de `HabitDetail`.
- `marcarHabito` — sin cambios, se sigue llamando desde la tarjeta de edición
  de cada fila.

## Manejo de errores

Sin cambios respecto al comportamiento actual: los fallos de escritura al
marcar un día siguen sin manejo especial (mismo criterio que el resto de la
app hasta ahora). El estado de carga por fila (mientras llega
`mapaDeEntries`) se resuelve con una comprobación simple antes de renderizar
el heatmap compacto, similar al patrón ya usado en `HistoryScreen`.

## Estrategia de pruebas

- `HabitHistoryRow.test.tsx` (nuevo): heatmap compacto se muestra con la
  ventana de 8 semanas, la racha se muestra junto al nombre, expandir muestra
  el heatmap completo y las estadísticas, colapsar las oculta, tocar una
  celda del heatmap compacto abre la tarjeta y persiste la marca sin
  necesidad de expandir primero.
- `HistoryScreen.test.tsx` (reescrito): con varios hábitos, se muestra una
  fila por cada uno; solo una fila puede estar expandida a la vez (expandir
  una colapsa la que estaba abierta); el mensaje de "no tienes hábitos" se
  mantiene para la lista vacía.

## Fuera de alcance

- Cambiar el tamaño de celda o el estilo visual del heatmap en sí
  (`Heatmap.tsx` no se toca).
- Reordenar los hábitos en la lista (se mantiene el orden de `listarHabitos()`,
  que ya respeta el campo `orden`).
- Cualquier cambio a `core/` o `store/`: esta es una reorganización de la capa
  de UI únicamente.
