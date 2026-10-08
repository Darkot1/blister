---
name: sistema-diseno
description: Sistema de diseño "tiza y hierro" de Blister y reglas de UI/UX (colores, tipografía, componentes, estados vacíos, accesibilidad, responsive, tono del texto). Úsalo al crear o modificar cualquier interfaz, o para revisar si una pantalla está bien resuelta.
---

# Sistema de diseño: tiza y hierro

Una app de trabajo para entrenadores: sobria, densa en información útil, rápida de escanear entre sesión y sesión. Evoca un gimnasio de hierro, no una app de fitness genérica.

## Tokens (src/app/globals.css)

| Clase Tailwind | Uso |
|---|---|
| `bg-fondo` | fondo de página (gris tiza frío) |
| `bg-superficie` | tarjetas, tablas, paneles (blanco) |
| `text-tinta` / `bg-tinta` | texto principal; barra lateral |
| `text-tenue` | texto secundario, etiquetas, metadatos |
| `border-linea` | todos los bordes y divisores |
| `acento` / `acento-hover` | **único** color de acción y selección (azul disco de 20 kg) |
| `exito` / `aviso` / `peligro` | solo para estado: completado, atención, error/destructivo |

No inventes colores nuevos ni uses la paleta por defecto de Tailwind (`blue-500`, `gray-200`...). Para matices usa opacidad sobre tokens: `bg-acento/10`, `bg-tinta/5`, `fill-tinta/[0.13]`.

Tipografía: `font-titulo` (Barlow Condensed) para títulos y cifras; Barlow para texto. Las cifras importantes llevan la clase `cifra` (condensada + números tabulares) y van grandes: `text-5xl`/`text-7xl` para el dato principal de una tarjeta.

## Componentes existentes (reutilízalos antes de crear otros)

- `components/ui/boton.tsx`: `Boton`, `EnlaceBoton`, `clasesBoton(variante)`; variantes `primario` (una por vista), `secundario`, `fantasma`, `peligro`.
- `components/ui/boton-envio.tsx`: `BotonEnvio` con `textoPendiente` ("Guardando…").
- `components/ui/campo.tsx`: `Campo`, `AreaTexto`, `Selector` con etiqueta, ayuda y error accesibles.
- `components/ui/aviso.tsx`: errores y confirmaciones de formulario.
- `components/ui/dialogo.tsx`: modal sobre `<dialog>` nativo (foco, Escape, clic en fondo).
- `components/ui/esqueleto.tsx`: `Esqueleto`, `EsqueletoLista` como fallback de `Suspense`, con la forma aproximada del contenido final.
- `components/ui/insignia-estado.tsx`: estado con punto de color.
- `components/app/encabezado.tsx`: título de página + descripción + acciones + "volver".
- `components/anatomia/mapa-corporal.tsx`: cuerpo humano (ver skill `mapa-corporal`).

## Patrones de pantalla

- **Listas**: `ul.divide-y.divide-linea.rounded-lg.border.border-linea.bg-superficie`, filas `px-4 py-3` enteras clicables (`Link` en toda la fila).
- **Filtros**: grupo de botones con `aria-pressed`, dentro de `next/form` para que vivan en la URL y sean compartibles.
- **Resumen de cifras**: rejilla `gap-px bg-linea` con celdas `bg-superficie` (ver `Cifra` en el perfil del alumno).
- **Estado vacío**: siempre explicado y con la siguiente acción: borde discontinuo, título en `font-titulo`, una frase y un botón. Distingue "no hay nada aún" de "ningún resultado con estos filtros".
- **Error de carga**: frase en `text-peligro` que diga qué hacer ("Recarga la página").
- **Acciones destructivas**: variante `peligro` y confirmación que explique la consecuencia ("Su historial se conserva…"). Preferir archivar a borrar.
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
