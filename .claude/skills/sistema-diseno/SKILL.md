---
name: sistema-diseno
description: Sistema de diseño "pizarra" (panel de administración en rejilla bento) de Blister y reglas de UI/UX (colores, tipografía, componentes, estados vacíos, accesibilidad, responsive, tono del texto). Úsalo al crear o modificar cualquier interfaz, o para revisar si una pantalla está bien resuelta.
---

# Sistema de diseño: pizarra

Un panel de administración para entrenadores: denso en información útil y rápido de escanear entre sesión y sesión. Fondo gris frío, tarjetas blancas con borde fino ordenadas en **rejilla bento**, tinta azul pizarra muy oscura y un único acento naranja. Nada de iconos de app de colores ni de degradados.

## Tokens (src/app/globals.css)

| Clase Tailwind | Uso |
|---|---|
| `bg-fondo` | fondo de página; cabeceras de tabla y pies de tarjeta (`bg-fondo/60`) |
| `bg-superficie` | tarjetas, barra lateral, diálogos |
| `text-tinta` / `bg-tinta` | texto principal; botón primario; la celda protagonista de un bento (oscura) |
| `text-tenue` | texto secundario, metadatos |
| `border-linea` / `divide-linea` | bordes y separadores (todo lleva borde de 1 px, sin sombras) |
| `bg-acento` | naranja: **solo relleno**, siempre con texto `text-sobre-acento` (oscuro en ambos modos). Nunca `text-acento` sobre la superficie. |
| `bg-panel` | la celda protagonista de un bento (agenda de hoy, peso actual, panel de acceso): oscura en ambos modos, con `text-white` y matices `white/…` |
| `text-sobre-tinta` | texto sobre `bg-tinta` (botón primario, filtro o pestaña activa, chips elegidos); se invierte en modo oscuro |
| `exito` / `aviso` / `peligro` | solo para estado (con punto + texto, nunca solo color); ya están ajustados para pasar AA como texto en ambos modos |

**Modo oscuro**: los tokens cambian solos (`globals.css`: sigue al sistema o `<html data-tema="claro|oscuro">`, que fija `components/app/selector-tema.tsx`). Por eso: nunca `text-white` sobre `bg-tinta` (usa `text-sobre-tinta`), nunca `text-tinta` sobre `bg-acento` (usa `text-sobre-acento`), nunca hex sueltos en componentes y fondos de modal con `backdrop:bg-black/50`. Revisa cada pantalla nueva en los dos modos.

Para matices usa opacidad sobre tokens: `bg-tinta/[0.06]`, `bg-exito/10`. Radio de tarjeta: `rounded-[var(--radius-tarjeta)]` (14 px); controles `rounded-lg`.

Tipografía: Instrument Sans para todo. JetBrains Mono para datos: la clase `etiqueta` (mayúsculas monoespaciadas, para cabeceras de tarjeta, columnas y migas) y `font-mono` para horas, fechas y cifras de tablas. Los KPI llevan `cifra` (números tabulares apretados) en `text-5xl`/`text-6xl font-semibold`.

## Componentes existentes (reutilízalos antes de crear otros)

- `components/app/secciones.ts`: `GRUPOS` del menú (General, Gestión, Entrenamiento) + `AJUSTES`. Toda sección nueva se registra aquí.
- `components/app/navegacion.tsx`: barra lateral agrupada en escritorio; barra superior + cajón lateral en móvil.
- `components/app/encabezado.tsx`: `miga` (grupo, en `etiqueta`) o `volver={{ href, texto }}`, título, `figura` (avatar), descripción y acciones.
- `components/ui/tarjeta.tsx`: `Tarjeta`, `CabeceraTarjeta` (etiqueta + acción, con borde inferior), `EnlaceTarjeta` ("Ver todo ↗"), `Lista` (con `divide-y`), `Vacio` (trama diagonal + acción), `claseSegmentado`/`claseSegmento`.
- `components/datos/barras-semana.tsx` y `linea-tendencia.tsx`: gráficos de una sola serie en tinta (sin leyenda; valor visible y tabla accesible). Antes de crear otro gráfico, usa la skill `dataviz`.
- `components/ui/avatar.tsx`: iniciales sobre fondo apagado, estable por id.
- `components/ui/boton.tsx`: `primario` (tinta, uno por vista), `acento` (naranja), `secundario` (borde), `fantasma`, `peligro`.
- `components/ui/campo.tsx`: `Campo`, `AreaTexto`, `Selector`, `claseControl` y `claseSelector` (para `<select>` sueltos, con la misma flecha).
- `components/ui/paginacion.tsx`: `Paginacion`, `leerPagina`, `conParametros` (URL con los filtros actuales).
- `components/ui/nivel-dificultad.tsx` y `lib/ejercicios/etiquetas.ts`: etiquetas de tipo, dificultad y rol muscular.
- `components/app/selector-tema.tsx`: Claro / Oscuro / Sistema.
- `components/ui/aviso.tsx`, `dialogo.tsx` (`lateral` para cajón), `esqueleto.tsx`, `insignia-estado.tsx`.
- `app/(app)/calendario/estado-cita.tsx`: `InsigniaCita`, `IconoEstadoCita`, `tonoEstadoCita`, `ESTADOS_VISIBLES`.
- `components/anatomia/mapa-corporal.tsx`: cuerpo humano (ver skill `mapa-corporal`); la selección se pinta en tinta.

## Patrones de pantalla

- **Rejilla bento** (panel, ficha del alumno): `grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4`, celdas con `col-span`/`row-span`. Una sola celda oscura protagonista (`bg-tinta`) y como mucho una en naranja por pantalla. En móvil, las celdas grandes ocupan `col-span-2`; los KPI pueden ir de a dos.
- **KPI**: etiqueta arriba, cifra grande abajo y una línea de contexto. Cada cifra debe ayudar a decidir algo hoy.
- **Tablas/listas**: dentro de `Tarjeta`, cabecera de columnas en `etiqueta` sobre `bg-fondo/60`, filas `px-4 py-2.5` enteras clicables, pie con el conteo en `font-mono`. En móvil se esconden columnas secundarias (`hidden md:block`).
- **Filtros**: control segmentado (`claseSegmentado`) o cápsulas `rounded-md` con borde, como **enlaces** (`Link` con `aria-current`) que conservan los demás parámetros (`conParametros` en `components/ui/paginacion.tsx`). Nunca botones `type="submit" name=… value=…` dentro de `next/form`: arma la URL con `new FormData(form)` sin el botón pulsado y el filtro se pierde. `next/form` solo para el cuadro de búsqueda, con los demás filtros en `<input type="hidden">`.
- **Listas largas**: paginadas de a 20 con `Paginacion` (`?pagina=`); sin filtros, un resumen por grupo con "Ver los N…".
- **Estado vacío**: `Vacio`. Distingue "no hay nada aún" de "ningún resultado con estos filtros".
- **Acciones destructivas**: en una tarjeta con borde discontinuo al final de la pantalla, variante `peligro`, con confirmación que explique la consecuencia. Preferir archivar a borrar.
- **Drag & drop** (constructor de rutinas): siempre con alternativa por botones (subir, bajar, duplicar, eliminar).

## Responsive

- Diseña primero a 400 px de ancho. Rejillas que se apilan (`grid gap-6 lg:grid-cols-[...]`), `flex-wrap` en barras de acciones, `min-w-0` + `truncate` en textos largos.
- Tablas anchas dentro de `overflow-x-auto`. Vistas densas (p. ej. la rejilla semanal) tienen versión móvil propia (agenda por días), no solo scroll.
- Paneles laterales: `lg:sticky lg:top-8` en escritorio, apilados arriba en móvil.

## Accesibilidad (mínimos)

- Cada `section` con `aria-labelledby` a su `h2`. Un solo `h1` por página (lo pone `Encabezado`).
- Iconos de lucide decorativos: `aria-hidden`; botones solo-icono con `aria-label`.
- Estados de selección con `aria-pressed`/`aria-checked`/`aria-current`, no solo color.
- Mensajes asíncronos con `role="status"`/`aria-live="polite"`; errores con `role="alert"`.
- Todo lo que se hace con ratón se puede hacer con teclado (los atajos de ratón, como clic en un hueco del calendario, pueden ser `tabIndex={-1}` si existe un botón equivalente).
- `prefers-reduced-motion` ya está cubierto globalmente; no añadas animaciones largas.

## Tono del texto

- Español neutro de Colombia, tuteo, frases cortas y concretas: "Registra el primero para empezar a planificar su entrenamiento."
- Habla del dominio del entrenador (alumno, sesión, plan, serie), nunca de la técnica (fila, registro, payload).
- Fechas y números con `src/lib/formato.ts` (`fechaCorta`, `hora`, `numero`), nunca `toLocaleString` suelto: el formateo en cliente y servidor debe coincidir (ver `espaciosSimples`).
- Sin estadísticas de vanidad: cada cifra en pantalla debe ayudar a decidir algo hoy.
