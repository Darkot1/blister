---
name: sistema-diseno
description: Sistema de diseño "papel" (documento impreso cálido en rejilla bento) de Blister y reglas de UI/UX (colores, tipografía, componentes, estados vacíos, accesibilidad, responsive, tono del texto). Úsalo al crear o modificar cualquier interfaz, o para revisar si una pantalla está bien resuelta.
---

# Sistema de diseño: papel

Un panel para entrenadores que se lee como un documento impreso: tinta sobre papel hueso, no píxeles sobre cristal. Lienzo pergamino cálido, tarjetas de papel blanco con borde fino ordenadas en **rejilla bento**, tinta carbón casi negra y una jerarquía hecha con **tamaño y peso**, no con color. La paleta es monocroma cálida; el único color de marca es la **arcilla** (`acento`), y solo como marca decorativa. Nada de degradados, tramas, sombras fuertes, azules ni verdes de marca.

## Tokens (src/app/globals.css)

| Clase Tailwind | Uso |
|---|---|
| `bg-fondo` | lienzo pergamino (#f8f8f6): página, barra lateral, cajón móvil. Nunca blanco puro para áreas grandes |
| `bg-superficie` | papel blanco: tarjetas, diálogos, controles |
| `bg-hueso` | superficie anidada (#efeeeb): cabeceras de tabla y pies (`bg-hueso/50`), hover de filas (`hover:bg-hueso/40`), navegación activa, controles segmentados, celdas secundarias del bento, chips neutros |
| `text-tinta` / `bg-tinta` | texto principal (#121212); botón primario; selección fuerte |
| `text-grafito` | texto secundario fuerte (#373734): títulos de tarjeta, navegación, etiquetas de campo, botones secundarios |
| `text-tenue` | ayudas, metadatos, rótulos (`etiqueta`) |
| `border-linea` / `divide-linea` | bordes de 1 px y separadores (#e7e6e1) |
| `border-linea-fuerte` | borde de campos (`/70`) y hover de tarjetas (#b7b7b5) |
| `acento` (arcilla #d97757) | **solo decorativo**: iconos (`text-acento`), puntos, el filo de una cita confirmada, la marca del "hoy". Nunca relleno de botón ni de celda o sección; como chip diminuto (`bg-acento` + `text-sobre-acento`) solo para "Hoy" |
| `bg-panel` | la celda protagonista de un bento (agenda de hoy, peso actual, panel de acceso): carbón en ambos modos, con `text-white`, matices `white/…` e iconos en arcilla. Una por pantalla, como la banda oscura de un pie de página |
| `text-sobre-tinta` | texto sobre `bg-tinta`; se invierte en modo oscuro |
| `exito` / `aviso` / `peligro` | apagados y cálidos, solo para estado (con punto + texto, nunca solo color); pasan AA como texto en ambos modos |

**Modo oscuro**: papel carbón cálido; los tokens cambian solos (`globals.css`: sigue al sistema o `<html data-tema="claro|oscuro">`, que fija `components/app/selector-tema.tsx`). Por eso: nunca `text-white` sobre `bg-tinta` (usa `text-sobre-tinta`), nunca hex sueltos en componentes y fondos de modal con `backdrop:bg-black/40`. Revisa cada pantalla nueva en los dos modos.

Para matices usa opacidad sobre tokens: `bg-hueso/50`, `bg-exito/10`. Radios: tarjeta `rounded-[var(--radius-tarjeta)]` (16 px); elevada (diálogos, panel de acceso) `rounded-[var(--radius-elevada)]` (24 px); botones, campos y navegación `rounded-lg` (8 px). Sombras: ninguna en reposo; `shadow-suave` en hover de tarjetas enlazadas y segmento activo, `shadow-flotante` para diálogos y arrastre. Nunca `shadow-md/lg/xl`.

## Tipografía

- **Source Serif 4** (`titulo-serif`, peso 400) es la firma editorial: `h1` de página (30 px, `leading-[1.2]`, lo pone `Encabezado`), títulos de sección importantes (22-24 px), títulos de diálogo y de estado vacío, el lema de una celda. **Cifras protagonistas** (KPI): `cifra-serif` en `text-5xl`/`text-6xl` sin negrita: la escala hace el trabajo.
- **Instrument Sans** para todo lo demás. Pesos 400-580: `font-semibold` está fijado a 580 en el tema; no subas de ahí ni grites con negritas. Títulos de tarjeta (`CabeceraTarjeta`) en sans 15 px `font-semibold text-grafito`.
- `etiqueta`: rótulo pequeño (12 px, 500, `text-tenue`, sin mayúsculas forzadas) para cabeceras de columna, rótulos de KPI y migas.
- Horas, fechas y cifras de tablas: `tabular-nums` (no hay monoespaciada). `cifra` para números tabulares apretados en texto sans.
- Enlaces en texto: tipográficos, `text-grafito` → `hover:text-tinta` con subrayado; nunca de color.

## Componentes existentes (reutilízalos antes de crear otros)

- `components/app/secciones.ts`: `GRUPOS` del menú (General, Gestión, Entrenamiento) + `AJUSTES`. Toda sección nueva se registra aquí.
- `components/app/navegacion.tsx`: barra lateral agrupada en escritorio. En móvil, barra superior con la marca y **barra inferior fija** con `PRINCIPALES` (secciones.ts) + "Más" (cajón con el resto). Lo que se pegue abajo usa `bottom-[var(--alto-barra-inferior)]` para no quedar debajo. Las secciones sin terminar llevan `pronto: true` y se marcan en el menú. Los enlaces del menú muestran un punto de arcilla mientras carga la sección (`useLinkStatus`).
- `app/(app)/error.tsx`: si una pantalla falla, mensaje y "Reintentar" (en esta versión de Next la prop es `retry`). Las acciones de formulario sin estado (`cambiarEstado…`) lanzan error si la base de datos no guardó, para que se vea aquí en lugar de fallar en silencio.
- `components/app/encabezado.tsx`: `miga` (grupo, en `etiqueta`) o `volver={{ href, texto }}`, título en serif, `figura` (avatar), descripción y acciones.
- `components/ui/tarjeta.tsx`: `Tarjeta`, `CabeceraTarjeta` (etiqueta + acción, con borde inferior), `EnlaceTarjeta` ("Ver todo ↗"), `Lista` (con `divide-y`), `Vacio` (relleno hueso, título en serif + acción), `claseSegmentado`/`claseSegmento`.
- `components/datos/grafica-linea.tsx`: una serie en el tiempo con escala de fechas real, ejes discretos, cruz + tooltip (ratón, toque y flechas) y tabla "Ver datos". Ocupa el ancho disponible (viewBox): nunca ensancha su columna.
- `components/datos/barras-semana.tsx` y `linea-tendencia.tsx`: gráficos de una sola serie en tinta (último punto en arcilla) (sin leyenda; valor visible y tabla accesible). Antes de crear otro gráfico, usa la skill `dataviz`.
- `components/ui/avatar.tsx`: iniciales sobre un tinte cálido apagado, estable por id.
- `components/ui/boton.tsx`: `primario` (tinta, uno por vista), `secundario` (borde), `fantasma`, `peligro`. No hay botón de color: las acciones son oscuras sobre claro.
- `components/ui/campo.tsx`: `Campo`, `AreaTexto`, `Selector`, `claseControl` y `claseSelector` (para `<select>` sueltos, con la misma flecha).
- `components/ui/paginacion.tsx`: `Paginacion`, `leerPagina`, `conParametros` (URL con los filtros actuales).
- `components/ui/nivel-dificultad.tsx` y `lib/ejercicios/etiquetas.ts`: etiquetas de tipo, dificultad y rol muscular.
- `components/app/selector-tema.tsx`: Claro / Oscuro / Sistema.
- `components/ui/menu.tsx`: `MenuAcciones` ("⋯", o con `texto` un botón secundario), `OpcionMenu` (`peligro`, `marcada` para elegir un tipo), `GrupoMenu`. Las acciones secundarias de una fila (mover, duplicar, quitar, cambiar tipo) van aquí, no como iconos sueltos en cada fila.
- `components/ui/aviso.tsx`, `dialogo.tsx` (`lateral` para cajón), `esqueleto.tsx`, `insignia-estado.tsx`.
- `app/(app)/calendario/estado-cita.tsx`: `InsigniaCita`, `IconoEstadoCita`, `tonoEstadoCita`, `ESTADOS_VISIBLES`.
- `components/anatomia/mapa-corporal.tsx`: cuerpo humano (ver skill `mapa-corporal`); la selección se pinta en tinta.

## Patrones de pantalla

- **Rejilla bento** (panel, ficha del alumno): `grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4`, celdas con `col-span`/`row-span`. Una sola celda oscura protagonista (`bg-panel`) y como mucho una celda en `bg-hueso` (accesos rápidos) por pantalla; el resto, papel blanco. Celdas con `p-5`, separación `gap-3 sm:gap-4`. En móvil, las celdas grandes ocupan `col-span-2`; los KPI pueden ir de a dos.
- **KPI**: etiqueta arriba, cifra grande en `cifra-serif` abajo y una línea de contexto. Cada cifra debe ayudar a decidir algo hoy.
- **Tablas/listas**: dentro de `Tarjeta`, cabecera de columnas en `etiqueta` sobre `bg-hueso/50`, filas `px-4 py-2.5` enteras clicables, pie con el conteo en `tabular-nums`. En móvil se esconden columnas secundarias (`hidden md:block`).
- **Filtros**: control segmentado (`claseSegmentado`: cápsula hueso con el segmento activo en papel blanco) o cápsulas `rounded-md` con borde, como **enlaces** (`Link` con `aria-current`) que conservan los demás parámetros (`conParametros` en `components/ui/paginacion.tsx`). Nunca botones `type="submit" name=… value=…` dentro de `next/form`: arma la URL con `new FormData(form)` sin el botón pulsado y el filtro se pierde. `next/form` solo para el cuadro de búsqueda, con los demás filtros en `<input type="hidden">`.
- **Listas largas**: paginadas de a 20 con `Paginacion` (`?pagina=`); sin filtros, un resumen por grupo con "Ver los N…".
- **Estado vacío**: `Vacio`. Distingue "no hay nada aún" de "ningún resultado con estos filtros".
- **Acciones destructivas**: en una tarjeta con borde discontinuo al final de la pantalla, variante `peligro`, con confirmación que explique la consecuencia. Preferir archivar a borrar.
- **Drag & drop** (constructor de rutinas): siempre con alternativa por botones (subir, bajar, duplicar, eliminar), dentro de `MenuAcciones`.
- **Formularios repetidos** (filas de ejercicios): en ancho, nombra las columnas una vez en la cabecera y deja las etiquetas de la fila en `sr-only` (consulta de contenedor `@2xl`); en estrecho, etiqueta en cada campo. Lo opcional (RIR, RPE, tempo, notas) va plegado con un resumen visible de lo ya escrito.

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
