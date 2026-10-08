---
name: mapa-corporal
description: Cómo usar, extender o corregir el mapa corporal SVG de Blister (selección de músculos, resaltado de músculos trabajados, nuevos trazos, futuros modos articulaciones/condiciones). Úsalo al tocar src/components/anatomia/ o al integrar el cuerpo en el constructor de rutinas, ejercicios o el perfil del alumno.
---

# Mapa corporal

Archivos:
- `src/components/anatomia/trazos.ts`: geometría. Solo datos, sin React.
- `src/components/anatomia/mapa-corporal.tsx`: componente cliente `MapaCorporal`.
- `src/app/(app)/ejercicios/selector-musculos.tsx`: ejemplo de integración con la URL (`?m=slug,slug`) y `useOptimistic`.
- `src/lib/ejercicios/ranking.ts`: `rankearEjercicios(ejercicios, relaciones, slugs)`, la sugerencia determinista por músculo.

## Contrato

```tsx
<MapaCorporal
  musculos={[{ slug, nombre }]}            // de public.musculos (orden por `orden`)
  seleccionados={["pectoral_esternal"]}    // modo selección…
  alAlternar={(slug) => ...}               // …si existe, el mapa es interactivo
  resaltados={{ triceps_braquial: "secundario" }} // modo lectura: qué trabaja un ejercicio
/>
```

- La identidad de cada músculo es su **`slug` de `public.musculos`**, puesto en `data-musculo`. Nunca uses ids UUID en el SVG.
- Frente y espalda se dibujan lado a lado; no hay conmutador de vista.
- Un músculo de la BD sin trazo aparece automáticamente como chip en "Músculos profundos" (hoy: `transverso_abdominal`). Así nunca queda inaccesible.
- Accesibilidad: cada trazo de la mitad no reflejada es `role="checkbox"` enfocable con `aria-label`; la mitad reflejada es `aria-hidden`. En modo lectura el SVG es `role="img"` con un resumen textual.

## Geometría

- Lienzo por figura: 200 × 420. Se dibuja **solo la mitad izquierda (x ≤ 100)** y se refleja con `translate(200 0) scale(-1 1)`. Un trazo = ambos lados.
- La figura ocupa x ∈ [42, 158]; el componente recorta con `RECORTE_X` y `ANCHO_UTIL`. Si ensanchas la silueta, ajusta esas constantes.
- Orden de pintado = orden de claves en `TRAZOS[vista]`: lo que va después queda encima. Músculos profundos que deban verse sobre otros (p. ej. `romboides` sobre `trapecio_medio_inferior`) van después.
- Mantén trazos cerrados (`Z`) y simples (8-12 puntos): es un mapa funcional, no una ilustración anatómica (blueprint R4).
- Para revisar el dibujo sin levantar la app, renderiza los trazos a PNG: genera un HTML con `SILUETA` + `TRAZOS` y captúralo con Chrome headless (`--headless --screenshot`). Revisa la imagen antes de dar por bueno un cambio de geometría.

## Agregar un músculo

1. Migración nueva que inserte el músculo en `public.musculos` con su `slug` (skill `migracion-supabase`).
2. Añade su trazo en `TRAZOS.frontal` y/o `TRAZOS.posterior` con la misma clave.
3. Si es profundo y no tiene superficie visible, no le pongas trazo: el chip aparece solo.

## Futuro: modos articulaciones y condiciones

El blueprint prevé `modo: "musculos" | "articulaciones" | "condiciones"`. Cuando llegue:
- Añade `PUNTOS_ARTICULARES` en `trazos.ts` (círculos con slug de `public.articulaciones`) en lugar de complicar `TRAZOS`.
- Las condiciones del alumno (`condiciones_alumno.region_corporal_id` / `articulacion_id`) se pintan con `aviso`/`peligro`, nunca con `acento` (acento = selección).
- No implementes el modo hasta que una pantalla lo necesite.
