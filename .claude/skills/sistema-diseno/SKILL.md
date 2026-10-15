---
name: sistema-diseno
description: Sistema de diseño "cumbre" (oscuro, superficies grafito, un solo color cobalto, controles en píldora, rejilla bento) de Blister y reglas de UI/UX (colores, tipografía, componentes, estados vacíos, accesibilidad, responsive, tono del texto). Úsalo al crear o modificar cualquier interfaz, o para revisar si una pantalla está bien resuelta.
---

# Sistema de diseño: cumbre

Un observatorio a la hora azul: lienzo onyx casi negro, superficies grafito un paso más claras y **sin sombras** (la separación es solo de valor), texto marfil y **un único color, el cobalto**, reservado a la acción principal y a lo seleccionado. Controles en píldora, tarjetas de 12 px, títulos en una sans ancha a peso 480: confiado, nunca gritón. Oscuro por defecto; el claro existe como opción en Ajustes.

## Tokens (src/app/globals.css)

| Clase Tailwind | Uso |
|---|---|
| `bg-fondo` | lienzo onyx (#171721): página, barra lateral, cajón móvil |
| `bg-superficie` | tarjeta grafito (#1e1e2a): tarjetas, diálogos (con `ring-1 ring-linea`, sin sombra) |
| `bg-hueso` | superficie interactiva (#272735): fondos de controles, cabeceras de tabla (`/50`), hover de filas (`/40`), navegación activa, chips |
| `text-tinta` / `bg-tinta` | marfil (#ededf3): texto principal; pastilla seleccionada (con `text-sobre-tinta`) |
| `text-grafito` | texto secundario fuerte (#c3c3cc): títulos de tarjeta, navegación, párrafos de apoyo |
| `text-tenue` | ayudas, metadatos, rótulos (`etiqueta`) |
| `border-linea` / `ring-linea` | filo apenas visible y separadores internos |
| `border-linea-fuerte` | borde de campos y botón secundario (#70707d, ≥3:1) |
| `acento` (cobalto #5266eb) | **solo**: botón primario (`bg-acento text-sobre-acento`), navegación activa (icono), lo que ocurre "ahora" (cita en curso, hoy, le toca), foco (`focus-visible`, `focus:border-acento`). Nunca decorativo, nunca texto pequeño (3,5:1 sobre oscuro), nunca dos rellenos cobalto juntos |
| `bg-panel` | la celda protagonista de un bento (agenda de hoy, peso actual): un paso más clara que la tarjeta, con `text-white` y matices `white/…` |
| `.tema-oscuro` | bloque siempre oscuro aunque la app esté en claro (hero de la portada, panel del ingreso) |
| `exito` / `aviso` / `peligro` | apagados, solo para estado (con punto + texto, nunca solo color); AA en ambos temas |

**Tema**: oscuro por defecto; `<html data-tema="claro">` fuerza el claro y `data-tema="sistema"` sigue al dispositivo (`components/app/selector-tema.tsx`). Nunca hex sueltos en componentes (salvo los fondos fijos del avatar y del hero `.tema-oscuro`). Revisa cada pantalla nueva en los dos temas.

Radios: tarjeta `rounded-[var(--radius-tarjeta)]` (12 px); diálogos y menús `rounded-[var(--radius-elevada)]`/`rounded-2xl`; **controles en píldora** (`rounded-full`): botones, campos, pestañas, chips, paginación, avatares; áreas de texto `rounded-2xl`. Sin sombras: `shadow-suave` y `shadow-flotante` son un filo de luz (para lo que flota).

## Tipografía

- **Archivo ancho** (`titulo-display`, peso 480, `font-stretch: 112%`, tracking +0.01em) para `h1` de página (30 px, lo pone `Encabezado`), títulos de sección, diálogos y estados vacíos. **Cifras protagonistas**: `cifra-display` en `text-5xl`.
- **Geist** para todo lo demás, a 400 con énfasis en 480 (`font-medium`/`font-semibold` están fijados a 480 en el tema): nunca negrita.
- `etiqueta`: rótulo pequeño (12 px, 420, `text-tenue`) para columnas, KPI y migas. Cifras de tablas con `tabular-nums`.
- `h1–h3` llevan `text-wrap: balance` y los párrafos `pretty` (globals).

## Componentes existentes (reutilízalos antes de crear otros)

- `components/app/secciones.ts`: `GRUPOS` del menú (General, Gestión, Entrenamiento) + `AJUSTES`. Toda sección nueva se registra aquí.
- `components/app/navegacion.tsx`: barra lateral agrupada en escritorio. En móvil, barra superior con la marca y **barra inferior fija** con `PRINCIPALES` (secciones.ts) + "Más" (cajón con el resto). Lo que se pegue abajo usa `bottom-[var(--alto-barra-inferior)]` para no quedar debajo. Las secciones sin terminar llevan `pronto: true` y se marcan en el menú. Los enlaces del menú muestran un punto cobalto mientras carga la sección (`useLinkStatus`).
- `app/(app)/error.tsx`: si una pantalla falla, mensaje y "Reintentar" (en esta versión de Next la prop es `retry`). Las acciones de formulario sin estado (`cambiarEstado…`) lanzan error si la base de datos no guardó, para que se vea aquí en lugar de fallar en silencio.
- `components/app/encabezado.tsx`: `miga` (grupo, en `etiqueta`) o `volver={{ href, texto }}`, título en display, `figura` (avatar), descripción y acciones.
- `components/ui/tarjeta.tsx`: `Tarjeta`, `CabeceraTarjeta` (etiqueta + acción, con borde inferior), `EnlaceTarjeta` ("Ver todo ↗"), `Lista` (con `divide-y`), `Vacio` (relleno hueso, título en display + acción), `claseSegmentado`/`claseSegmento`.
- `components/datos/grafica-linea.tsx`: una serie en el tiempo con escala de fechas real, ejes discretos, cruz + tooltip (ratón, toque y flechas) y tabla "Ver datos". Ocupa el ancho disponible (viewBox): nunca ensancha su columna.
- `components/datos/barras-semana.tsx` y `linea-tendencia.tsx`: gráficos de una sola serie en tinta (último punto en cobalto) (sin leyenda; valor visible y tabla accesible). Antes de crear otro gráfico, usa la skill `dataviz`.
- `components/ui/avatar.tsx`: iniciales sobre un tinte cálido apagado, estable por id.
- `components/ui/boton.tsx`: `primario` (cobalto, uno por vista), `secundario` (píldora de contorno), `fantasma`, `peligro`.
- `components/ui/campo.tsx`: `Campo`, `AreaTexto`, `Selector`, `claseControl` y `claseSelector` (para `<select>` sueltos, con la misma flecha).
- `components/ui/paginacion.tsx`: `Paginacion`, `leerPagina`, `conParametros` (URL con los filtros actuales).
- `components/ui/nivel-dificultad.tsx` y `lib/ejercicios/etiquetas.ts`: etiquetas de tipo, dificultad y rol muscular.
- `components/app/selector-tema.tsx`: Claro / Oscuro / Sistema.
- `components/ui/menu.tsx`: `MenuAcciones` ("⋯", o con `texto` un botón secundario), `OpcionMenu` (`peligro`, `marcada` para elegir un tipo), `GrupoMenu`. Las acciones secundarias de una fila (mover, duplicar, quitar, cambiar tipo) van aquí, no como iconos sueltos en cada fila.
- `components/ui/aviso.tsx`, `dialogo.tsx` (`lateral` para cajón), `esqueleto.tsx`, `insignia-estado.tsx`.
- `app/(app)/calendario/estado-cita.tsx`: `InsigniaCita`, `IconoEstadoCita`, `tonoEstadoCita`, `ESTADOS_VISIBLES`.
- `components/anatomia/mapa-corporal.tsx`: cuerpo humano (ver skill `mapa-corporal`); la selección se pinta en tinta.

## Patrones de pantalla

- **Rejilla bento** (panel, ficha del alumno): `grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4`, celdas con `col-span`/`row-span`. Una sola celda oscura protagonista (`bg-panel`) y como mucho una celda en `bg-hueso` (accesos rápidos) por pantalla; el resto, tarjetas grafito. Celdas con `p-5`, separación `gap-3 sm:gap-4`. En móvil, las celdas grandes ocupan `col-span-2`; los KPI pueden ir de a dos.
- **KPI**: etiqueta arriba, cifra grande en `cifra-display` abajo y una línea de contexto. Cada cifra debe ayudar a decidir algo hoy.
- **Tablas/listas**: dentro de `Tarjeta`, cabecera de columnas en `etiqueta` sobre `bg-hueso/50`, filas `px-4 py-2.5` enteras clicables, pie con el conteo en `tabular-nums`. En móvil se esconden columnas secundarias (`hidden md:block`).
- **Filtros**: control segmentado (`claseSegmentado`: cápsula hueso con el segmento activo en pastilla marfil) o chips `rounded-full`, como **enlaces** (`Link` con `aria-current`) que conservan los demás parámetros (`conParametros` en `components/ui/paginacion.tsx`). Nunca botones `type="submit" name=… value=…` dentro de `next/form`: arma la URL con `new FormData(form)` sin el botón pulsado y el filtro se pierde. `next/form` solo para el cuadro de búsqueda, con los demás filtros en `<input type="hidden">`.
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
