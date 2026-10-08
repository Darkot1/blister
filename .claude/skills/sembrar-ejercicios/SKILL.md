---
name: sembrar-ejercicios
description: Agrega ejercicios a la biblioteca global de Blister con sus músculos (principal/secundario/estabilizador) y equipamiento, como migración idempotente. Úsalo cuando haya que ampliar o corregir el catálogo de ejercicios o las relaciones ejercicio-músculo.
---

# Sembrar ejercicios globales

La calidad de las sugerencias del mapa corporal depende por completo de estas relaciones. Un rol mal asignado ordena mal las sugerencias.

## Formato

Crea una migración nueva (no edites `20261007000400_catalogos_iniciales.sql`) copiando su patrón: tabla temporal `_ejercicios_semilla`, `insert ... on conflict (lower(nombre)) where es_global do nothing`, luego relaciones con `on conflict do nothing`.

```sql
('Press de banca con barra', 'fuerza', 'intermedio', false,
  array['pectoral_esternal:principal','pectoral_clavicular:secundario','deltoides_anterior:secundario','triceps_braquial:secundario'],
  array['barra','banco']),
```

Columnas: `nombre, tipo, dificultad, unilateral, musculos[], equipos[]`.

- `tipo`: `fuerza | movilidad | estiramiento | activacion | cardio | calentamiento | enfriamiento | otro`.
- `dificultad`: `principiante | intermedio | avanzado`.
- Músculos: `slug:rol` con slugs existentes en `public.musculos` (ver la migración de catálogos). Un slug que no existe se descarta en silencio por el `join`: compruébalos.
- Equipos: slugs de `public.equipamiento` (`barra`, `mancuernas`, `kettlebell`, `polea`, `maquina`, `banco`, `banda_elastica`, `peso_corporal`, `barra_dominadas`, `balon_medicinal`, `suspension`, `otro`).

## Criterio de roles

- **principal**: el músculo que el ejercicio pretende entrenar y que limita la carga. 1 o 2, como máximo 3 en básicos multiarticulares (peso muerto).
- **secundario**: contribuye de forma significativa al movimiento.
- **estabilizador**: trabaja isométricamente para sostener la postura (core en press militar, erectores en sentadilla).

Ante la duda, consulta al agente `experto-entrenamiento`.

## Nombres

En español, como los diría un entrenador en Colombia, con el implemento si cambia el ejercicio: "Remo con mancuerna a una mano", no "DB Row". Sin duplicados por mayúsculas (el índice único es por `lower(nombre)`).

## Después

Aplica la migración y revisa en `/ejercicios` eligiendo los músculos afectados que el orden de las sugerencias tenga sentido.
