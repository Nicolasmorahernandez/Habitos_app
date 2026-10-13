# Hábitos

Aplicación web para construir y mantener hábitos, con seguimiento diario, rachas, historial en forma de heatmap y un gráfico de progreso del día. Diseñada como PWA instalable, de un solo usuario, con identidad visual **neobrutalista** (bordes negros gruesos, sombras duras, sin bordes redondeados).

## ¿Qué hace?

- **Pantalla "Hoy"**: muestra únicamente los hábitos programados para el día actual, separados en dos bloques:
  - *En formación* — hábitos nuevos, con su racha actual visible.
  - *Consolidados* — hábitos que ya pasaste a esta fase manualmente.
  - Marcar un hábito como hecho (booleano, o por cantidad con un objetivo numérico) es instantáneo, sin esperas de red.
  - Al final de la pantalla, un **gráfico de progreso diario** (tipo step-line) muestra cuánto del día ya completaste, contando solo los hábitos programados para hoy. Cuando terminas todos, se muestra un mensaje de "Día completo".
- **Pantalla "Historial"**: lista todos los hábitos (activos y archivados) con su historial en forma de heatmap. Cada fila es expandible: colapsada muestra un heatmap compacto, expandida muestra el histórico completo.
- **Pantalla "Ajustes"**:
  - Alta de nuevos hábitos (nombre, tipo, días de la semana en que aplica).
  - Transición manual de un hábito de *nuevo* a *consolidado*.
  - Archivado de hábitos (no se borran, se conserva su histórico).
  - **Exportar/Importar** una copia de seguridad en formato JSON, con validación estricta antes de sobrescribir los datos locales.
- **Rachas y estadísticas**: cálculo de racha actual (respetando los días en que un hábito no está programado) y porcentaje de cumplimiento.
- **PWA instalable**: funciona offline y puede instalarse en el dispositivo como una app nativa.

No tiene login ni cuentas de usuario: está pensada para un único usuario por instalación/navegador.

## ¿Cómo funciona? (arquitectura)

La app sigue un enfoque **local-first**: toda la información se guarda en el propio navegador mediante **IndexedDB** (usando la librería [`idb`](https://github.com/jakearchibald/idb) como wrapper), sin ningún backend ni servicio externo.

```
src/
  core/     Lógica de dominio pura (sin React, sin IndexedDB):
            tipos, fechas, si un hábito toca hoy, cálculo de rachas,
            estadísticas, datos para el heatmap y el progreso diario.

  store/    Capa de persistencia que envuelve IndexedDB:
            esquema de la base de datos, CRUD de hábitos y de entradas
            diarias, exportación/importación de copias de seguridad.
            La UI nunca accede a IndexedDB directamente, solo a través
            de este módulo.

  ui/       Componentes React: pantallas (Hoy, Historial, Ajustes),
            navegación por pestañas, formularios, heatmap y el
            gráfico de progreso diario.
```

### Persistencia de datos

- Base de datos `habitos` en IndexedDB, con dos almacenes:
  - `habits`: los hábitos definidos (id, nombre, tipo, días programados, estado, orden).
  - `entries`: los registros diarios de cada hábito (clave compuesta `[habit_id, fecha]`).
- **No requiere ningún servicio externo, cuenta, API key ni base de datos en la nube** (no usa Supabase, Firebase ni similar). Todos los datos viven en el navegador del usuario.
- Como contrapartida: los datos no se sincronizan entre dispositivos ni navegadores. Si se borra el almacenamiento del navegador (o se usa en modo incógnito), se pierde la información, por lo que se recomienda usar regularmente la opción de **exportar backup en JSON** desde Ajustes.
- Hay un diseño a futuro (en `docs/superpowers/specs/`) que contempla una posible sincronización vía Cloudflare Worker + D1, pero **todavía no está implementada**; hoy la app funciona 100% offline/local.

## Stack técnico

- **React 19** + **TypeScript** + **Vite 8**
- `idb` para IndexedDB
- `vite-plugin-pwa` para que la app sea instalable y funcione offline
- **Vitest** + **Testing Library** + `fake-indexeddb` para tests unitarios y de componentes
- **oxlint** como linter

## Requisitos

- Node.js 20 o superior
- npm (el proyecto usa `package-lock.json`)

## Instalación y uso en local

```bash
# instalar dependencias
npm install

# levantar el servidor de desarrollo (con hot reload)
npm run dev

# compilar para producción (type-check + build)
npm run build

# previsualizar el build de producción
npm run preview

# correr el linter
npm run lint
```

No se necesita configurar ninguna variable de entorno ni archivo `.env`: la app no depende de servicios externos para funcionar.

## Tests

```bash
# correr toda la suite una vez
npm run test

# modo watch
npm run test:watch
```

Los tests usan Vitest con entorno `jsdom` y `fake-indexeddb` para simular IndexedDB. Cada módulo de `core/`, `store/` y cada componente de `ui/` tiene su archivo de test junto al código.

## Estructura de carpetas

```
public/              Iconos de la PWA (favicon, icon-192.png, icon-512.png)
src/
  core/              Lógica de dominio (hábitos, fechas, rachas, estadísticas, heatmap)
  store/             Persistencia en IndexedDB (hábitos, entradas, backups)
  ui/                Componentes React (pantallas, navegación, formularios, gráficos)
  styles.css         Estilos globales (tema neobrutalista)
  main.tsx           Punto de entrada de React
docs/superpowers/    Documentos de diseño y planes de implementación
```
