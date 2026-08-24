# Habit Tracker — Diseño

Fecha: 2026-08-23
Estado: aprobado, pendiente de plan de implementación

## Propósito

Aplicación web personal (PWA) para registrar hábitos diarios. Un único usuario.
Distingue entre hábitos **en formación** (nuevos, requieren atención) y
**consolidados** (solo confirmar). El objetivo de diseño principal es que marcar
un hábito sea instantáneo y fiable en cualquier circunstancia, incluida la
ausencia de conexión.

## Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Plataforma | PWA (web, instalable) | Un solo código para móvil y escritorio |
| Usuarios | Uno solo (el autor) | Elimina cuentas, roles y auth multiusuario |
| Registro | Sí/no, con cantidad opcional por hábito | Algunos hábitos son binarios, otros numéricos |
| Frecuencia | Días concretos de la semana | No penaliza los días de descanso planificados |
| Métricas | Racha, heatmap y % de cumplimiento | Las tres pedidas explícitamente |
| Edición retroactiva | Cualquier día es editable | Rellenar días en los que no se abrió la app |
| Persistencia | Local-first (IndexedDB) + sync a Cloudflare Worker/D1 | Offline real, coste ~cero, sin sistema de cuentas |
| Stack | React + TypeScript + Vite | Estándar, buen encaje con Cloudflare Pages/Workers |

## Arquitectura

Tres módulos en el cliente, con fronteras explícitas:

### `core/` — lógica de dominio pura
Funciones puras, sin React ni acceso a base de datos. Contiene:
- qué hábitos corresponden a una fecha dada según su programación semanal
- cálculo de racha actual y racha máxima (respetando los días no programados)
- porcentaje de cumplimiento por periodo
- reglas de transición de estado de un hábito

Depende de: nada. Es el módulo con la lógica más delicada y se prueba sin navegador.

### `store/` — persistencia y cola de sync
Envuelve IndexedDB. Expone operaciones de dominio (`marcarHabito`,
`listarDia`, `crearHabito`, …) y oculta por completo el detalle de IndexedDB.
Mantiene la cola de cambios pendientes de sincronizar.

Depende de: `core/` para validaciones. La UI nunca accede a IndexedDB directamente.

### `ui/` — componentes React
Leen del `store` y usan `core` para derivar lo que muestran. No implementan
reglas de negocio.

Depende de: `store/`, `core/`.

### Worker (Cloudflare)
Un endpoint `POST /sync` respaldado por D1. Recibe los cambios pendientes del
cliente junto con el instante de su última sincronización y devuelve los
cambios que el cliente no tiene. Autenticación por clave secreta compartida
enviada en cabecera; no hay registro ni gestión de usuarios.

**Invariante del sistema: la app nunca espera al servidor.** Toda escritura se
confirma contra IndexedDB y la UI responde de inmediato; el sync ocurre en
segundo plano.

## Modelo de datos

### `habits`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | string (uuid) | |
| `nombre` | string | |
| `tipo` | `'booleano' \| 'cantidad'` | |
| `objetivo` | number \| null | Obligatorio si `tipo === 'cantidad'`, si no `null` |
| `dias` | number[] | Días de la semana programados, 0 = domingo … 6 = sábado |
| `estado` | `'nuevo' \| 'consolidado' \| 'archivado'` | |
| `orden` | number | Posición manual en la lista |
| `creado_en` | timestamp ISO | |
| `actualizado_en` | timestamp ISO | Usado en la fusión del sync |

### `entries`
| Campo | Tipo | Notas |
|---|---|---|
| `habit_id` | string | |
| `fecha` | string `YYYY-MM-DD` | Día natural en zona horaria local |
| `valor` | boolean \| number | Según el `tipo` del hábito |
| `actualizado_en` | timestamp ISO | Usado en la fusión del sync |

Clave primaria: `(habit_id, fecha)`. Un registro por hábito y día. Esta forma
hace que la edición retroactiva sea un upsert normal y que la fusión del sync
se resuelva por registro sin lógica especial.

### Reglas
- Archivar **no borra**: el hábito conserva su historial y desaparece de la vista de hoy.
- La transición `nuevo → consolidado` es **manual**, decidida por el usuario. No hay
  umbral automático de días: solo el usuario sabe cuándo un hábito ha dejado de costarle.
- El esquema de D1 replica estas dos tablas más una columna de dispositivo de origen.

## Pantallas

### Hoy (por defecto)
Muestra únicamente los hábitos programados para el día actual, en dos bloques:
- **En formación** — arriba, presentación destacada, racha visible.
- **Consolidados** — abajo, presentación compacta, solo confirmar.

Los hábitos booleanos se marcan con un toque. Los de cantidad muestran un
control de incremento y su progreso frente al objetivo (`5/8`). Al completar
todos los hábitos del día se muestra un cierre visual discreto.

### Historial
Heatmap tipo cuadrícula. Selector arriba para elegir un hábito concreto o la
vista agregada. Tocar una celda abre ese día en modo edición; ahí es donde vive
la edición retroactiva, sin pantalla propia.

### Detalle de hábito
Racha actual, racha máxima, porcentaje de cumplimiento del mes y total, y
heatmap individual. Acciones: editar, cambiar estado (`nuevo`/`consolidado`),
archivar.

### Ajustes
Crear y reordenar hábitos, configurar el sync (introducir la clave), y
exportar/importar JSON como red de seguridad independiente del sync.

Navegación: barra inferior de tres pestañas (Hoy · Historial · Ajustes).

## Sincronización

1. Cada escritura local marca el registro en la cola de pendientes.
2. El sync se dispara al arrancar la app, al recuperar conexión y periódicamente.
3. El cliente envía los pendientes más el instante de su última sincronización.
4. El Worker aplica los cambios en D1 y devuelve lo modificado desde ese instante.
5. El cliente fusiona por `actualizado_en` más reciente y vacía la cola.

Resolución de conflictos: última escritura gana, a nivel de registro
`(habit_id, fecha)`. Con un solo usuario los conflictos reales son casi
inexistentes, y cuando ocurren el valor suele coincidir.

El estado del sync es siempre visible en la UI ("sincronizado hace 2 min",
"pendiente", "sin conexión"). Un sync silencioso que falla es peor que no tener
sync.

## Manejo de errores

Los fallos de red **no son errores**: son el estado esperado de una app
offline-first. No interrumpen al usuario, solo cambian el indicador de estado.

Sí se notifican al usuario:
- IndexedDB no disponible (p. ej. navegación privada): la app funciona en
  memoria pero avisa de que los datos no persistirán.
- Clave de sync rechazada por el Worker.
- Importación de un JSON con formato inválido: se rechaza entera, sin aplicar nada.

## Estrategia de pruebas

El esfuerzo se concentra en `core/`, donde están los errores caros:
- cálculo de racha con días no programados intercalados (un plan
  lunes/miércoles/viernes no rompe racha por no cumplir el martes)
- límites de mes y de año
- edición de un día pasado que reconecta dos tramos de racha
- porcentaje de cumplimiento sobre días programados, no sobre días naturales

La fusión del sync se prueba por separado con conflictos simulados.

La UI se valida manualmente, con un recorrido automatizado mínimo: crear un
hábito, marcarlo, verlo reflejado en el historial.

## Fuera de alcance (v1)

- Cuentas de usuario, multiusuario, compartir hábitos
- Notificaciones push y recordatorios
- Sugerencias de hábitos generadas por la app
- Categorías, etiquetas y notas por día
- Transición automática de `nuevo` a `consolidado`
