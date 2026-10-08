---
name: sistema-diseno
description: Sistema de diseño "panel de control" de Blister y reglas de UI/UX (colores, tipografía, componentes, estados vacíos, accesibilidad, responsive, tono del texto). Úsalo al crear o modificar cualquier interfaz, o para revisar si una pantalla está bien resuelta.
---

# Sistema de diseño: panel de control

Una app de trabajo para entrenadores con el lenguaje de los sistemas móviles (iOS, HyperOS): fondo gris claro, tarjetas blancas muy redondeadas, títulos grandes en negrita y un icono de app en squircle con un color por sección. Los menús son **rejillas de iconos**, no listas de enlaces.

## Tokens (src/app/globals.css)

| Clase Tailwind | Uso |
|---|---|
| `bg-fondo` | fondo de página |
| `bg-superficie` | tarjetas, listas agrupadas, hojas (blanco) |
| `text-tinta` / `bg-tinta` | texto principal; botón primario (cápsula negra) |
| `text-tenue` | texto secundario, etiquetas, metadatos |
| `border-linea` / `bg-linea` | separadores |
| `acento` / `acento-hover` | enlaces, "volver", selección, foco |
| `exito` / `aviso` / `peligro` | solo para estado: completado, atención, error/destructivo |
| `app-inicio`, `app-alumnos`, `app-calendario`, `app-entrenamiento`, `app-ejercicios`, `app-progreso`, `app-configuracion` | color de cada sección: su icono de app y detalles propios (p. ej. el día de hoy en el calendario) |

No inventes colores nuevos ni uses la paleta por defecto de Tailwind (`blue-500`, `gray-200`...). Para matices usa opacidad sobre tokens: `bg-tinta/[0.05]`, `bg-exito/10`, `bg-app-calendario/10`. Radio de tarjeta: `rounded-[var(--radius-tarjeta)]`.

Tipografía: Onest (variable) para todo; títulos `font-bold tracking-tight`. Las cifras importantes llevan la clase `cifra` (Barlow Condensed + números tabulares) y van grandes: `text-5xl`/`text-6xl` para el dato principal de un widget.

## Componentes existentes (reutilízalos antes de crear otros)

- `components/app/secciones.ts`: `SECCIONES` (href, texto, resumen, icono, tono). Toda sección nueva se registra aquí y aparece sola en el riel, el dock, el menú en rejilla y el inicio.
- `components/app/navegacion.tsx`: riel de iconos en escritorio; dock flotante + hoja "Menú" con rejilla de apps en móvil.
- `components/ui/icono-app.tsx`: `IconoApp` (squircle con el tono de la sección; tamaños `sm`, `md`, `lg`, `xl`).
- `components/ui/tarjeta.tsx`: `Tarjeta`, `TituloGrupo`, `EnlaceGrupo`, `ListaAgrupada` (separadores con sangría), `Vacio`, `claseSegmentado`/`claseSegmento`.
- `components/ui/avatar.tsx`: `Avatar` con iniciales y color estable por id.
- `components/ui/boton.tsx`: `Boton`, `EnlaceBoton`, `clasesBoton(variante)`; cápsulas; variantes `primario` (una por vista), `secundario`, `fantasma`, `peligro`.
- `components/ui/boton-envio.tsx`: `BotonEnvio` con `textoPendiente` ("Guardando…").
- `components/ui/campo.tsx`: `Campo`, `AreaTexto`, `Selector` (rellenos, sin borde hasta el foco) y `claseControl` para inputs sueltos.
- `components/ui/aviso.tsx`: errores y confirmaciones de formulario.
- `components/ui/dialogo.tsx`: modal sobre `<dialog>` nativo; hoja inferior en móvil, centrado en escritorio.
- `components/ui/esqueleto.tsx`: `Esqueleto`, `EsqueletoLista` como fallback de `Suspense`.
- `components/ui/insignia-estado.tsx`: estado del alumno como pastilla.
- `app/(app)/calendario/estado-cita.tsx`: `InsigniaCita`, `IconoEstadoCita`, `tonoEstadoCita`, `ESTADOS_VISIBLES`.
- `components/app/encabezado.tsx`: título grande + descripción + acciones + `volver={{ href, texto }}`.
- `components/anatomia/mapa-corporal.tsx`: cuerpo humano (ver skill `mapa-corporal`).

## Patrones de pantalla

- **Menús**: rejilla de `IconoApp` con la etiqueta debajo (`grid-cols-3`/`4` en móvil), nunca una lista de enlaces de texto.
- **Listas**: `ListaAgrupada` con filas `px-4 py-3` enteras clicables (`Link` en toda la fila) y `ChevronRight` tenue al final. Con avatar, `sangria="4.5rem"`.
- **Filtros**: control segmentado (`claseSegmentado`) o cápsulas, con `aria-pressed`, dentro de `next/form` para que vivan en la URL.
- **Resumen de cifras**: widgets (`Tarjeta` con etiqueta arriba y `cifra` grande abajo) en `grid grid-cols-2 gap-3 md:grid-cols-4`.
- **Accesos rápidos**: baldosas de color sólido al estilo del centro de control (ver inicio).
- **Estado vacío**: `Vacio`, siempre explicado y con la siguiente acción. Distingue "no hay nada aún" de "ningún resultado con estos filtros".
- **Error de carga**: frase en `text-peligro` que diga qué hacer ("Recarga la página").
- **Acciones destructivas**: variante `peligro`, al final de la pantalla y separadas del resto, con confirmación que explique la consecuencia ("Su historial se conserva…"). Preferir archivar a borrar.
- **Drag & drop** (constructor de rutinas): siempre con alternativa por botones (subir, bajar, duplicar, eliminar).

## Responsive

- Diseña primero a 400 px de ancho. En móvil el dock flotante tapa los últimos ~7 rem: el layout ya deja `pb-32`. Rejillas que se apilan (`grid gap-6 lg:grid-cols-[...]`), `flex-wrap` en barras de acciones, `min-w-0` + `truncate` en textos largos.
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
