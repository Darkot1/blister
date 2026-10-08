-- ============================================================
-- Migración 010 — Biblioteca global: 25 ejercicios de cardio, calentamiento, movilidad, estiramientos y enfriamiento.
-- Usa los músculos de la 007. Idempotente: se puede volver a ejecutar.
-- ============================================================

-- Formato de músculos: 'slug:rol'  (rol = principal | secundario | estabilizador)
-- La tabla temporal desaparece sola al terminar la transacción de la migración.
create temp table _ejercicios_semilla (
  nombre text, tipo text, dificultad text, unilateral boolean,
  musculos text[], equipos text[]
) on commit drop;

insert into _ejercicios_semilla values
  -- Cardio
  ('Burpees', 'cardio', 'intermedio', false,
    array['cuadriceps:principal','gluteo_mayor:secundario','pectoral_esternal:secundario','triceps_braquial:secundario','recto_abdominal:estabilizador'],
    array['peso_corporal']),
  ('Escaladores', 'cardio', 'principiante', false,
    array['recto_abdominal:principal','psoas_iliaco:secundario','cuadriceps:secundario','deltoides_anterior:estabilizador'],
    array['peso_corporal']),
  ('Saltar la cuerda', 'cardio', 'principiante', false,
    array['gastrocnemio:principal','soleo:principal','cuadriceps:secundario'],
    array['otro']),
  ('Saltos al cajón', 'cardio', 'intermedio', false,
    array['cuadriceps:principal','gluteo_mayor:principal','gastrocnemio:secundario'],
    array['otro']),
  ('Bicicleta estática', 'cardio', 'principiante', false,
    array['cuadriceps:principal','gluteo_mayor:secundario','isquiotibiales:secundario','gastrocnemio:secundario'],
    array['maquina']),
  ('Remo ergómetro', 'cardio', 'principiante', false,
    array['dorsal_ancho:principal','cuadriceps:principal','gluteo_mayor:secundario','biceps_braquial:secundario','erectores_espinales:estabilizador'],
    array['maquina']),
  ('Caminata en cinta inclinada', 'cardio', 'principiante', false,
    array['gluteo_mayor:principal','gastrocnemio:secundario','isquiotibiales:secundario','cuadriceps:secundario'],
    array['maquina']),
  -- Calentamiento
  ('Saltos de tijera', 'calentamiento', 'principiante', false,
    array['gastrocnemio:principal','deltoides_lateral:secundario','gluteo_medio:secundario'],
    array['peso_corporal']),
  ('Círculos de brazos', 'calentamiento', 'principiante', false,
    array['deltoides_lateral:principal','manguito_rotador:secundario','deltoides_anterior:secundario','deltoides_posterior:secundario'],
    array['peso_corporal']),
  ('Balanceo de piernas', 'calentamiento', 'principiante', true,
    array['psoas_iliaco:principal','isquiotibiales:principal','aductores:secundario','gluteo_medio:secundario'],
    array['peso_corporal']),
  ('Gusano (inchworm)', 'calentamiento', 'principiante', false,
    array['isquiotibiales:principal','recto_abdominal:secundario','deltoides_anterior:secundario'],
    array['peso_corporal']),
  -- Movilidad
  ('Movilidad de tobillo contra la pared', 'movilidad', 'principiante', true,
    array['soleo:principal','gastrocnemio:secundario','tibial_anterior:secundario'],
    array['peso_corporal']),
  ('Dislocaciones de hombro con banda', 'movilidad', 'principiante', false,
    array['manguito_rotador:principal','pectoral_clavicular:secundario','deltoides_anterior:secundario'],
    array['banda_elastica']),
  ('El mejor estiramiento del mundo', 'movilidad', 'principiante', true,
    array['psoas_iliaco:principal','isquiotibiales:secundario','aductores:secundario','oblicuos:secundario'],
    array['peso_corporal']),
  -- Estiramientos
  ('Estiramiento de isquiotibiales de pie', 'estiramiento', 'principiante', true,
    array['isquiotibiales:principal','gastrocnemio:secundario'],
    array['peso_corporal']),
  ('Estiramiento de cuádriceps de pie', 'estiramiento', 'principiante', true,
    array['cuadriceps:principal','psoas_iliaco:secundario'],
    array['peso_corporal']),
  ('Estiramiento de pectoral en el marco de la puerta', 'estiramiento', 'principiante', true,
    array['pectoral_esternal:principal','pectoral_menor:secundario','pectoral_clavicular:secundario','deltoides_anterior:secundario'],
    array['peso_corporal']),
  ('Estiramiento de piriforme en figura 4', 'estiramiento', 'principiante', true,
    array['piriforme:principal','gluteo_mayor:secundario','gluteo_medio:secundario'],
    array['peso_corporal']),
  ('Estiramiento de gemelo en la pared', 'estiramiento', 'principiante', true,
    array['gastrocnemio:principal','soleo:secundario'],
    array['peso_corporal']),
  ('Estiramiento de trapecio y elevador de la escápula', 'estiramiento', 'principiante', true,
    array['trapecio_superior:principal','elevador_escapula:principal','esternocleidomastoideo:secundario'],
    array['peso_corporal']),
  ('Estiramiento de aductores en mariposa', 'estiramiento', 'principiante', false,
    array['aductores:principal'],
    array['peso_corporal']),
  ('Estiramiento de cuadrado lumbar de pie', 'estiramiento', 'principiante', true,
    array['cuadrado_lumbar:principal','oblicuos:secundario','dorsal_ancho:secundario'],
    array['peso_corporal']),
  -- Enfriamiento
  ('Postura del niño', 'enfriamiento', 'principiante', false,
    array['dorsal_ancho:principal','erectores_espinales:secundario','gluteo_mayor:secundario'],
    array['peso_corporal']),
  ('Postura de la cobra', 'enfriamiento', 'principiante', false,
    array['recto_abdominal:principal','psoas_iliaco:secundario'],
    array['peso_corporal']),
  ('Respiración diafragmática en el suelo', 'enfriamiento', 'principiante', false,
    array['transverso_abdominal:principal'],
    array['peso_corporal']);

-- Un slug mal escrito se descartaría en silencio en los joins: mejor fallar.
do $$
declare
  faltantes text;
begin
  select string_agg(distinct x, ', ') into faltantes
  from (
    select split_part(unnest(musculos), ':', 1) as x from _ejercicios_semilla
  ) s
  where not exists (select 1 from public.musculos m where m.slug = s.x);
  if faltantes is not null then
    raise exception 'Músculos inexistentes en la semilla: %', faltantes;
  end if;

  select string_agg(distinct x, ', ') into faltantes
  from (select unnest(equipos) as x from _ejercicios_semilla) s
  where not exists (select 1 from public.equipamiento q where q.slug = s.x);
  if faltantes is not null then
    raise exception 'Equipamiento inexistente en la semilla: %', faltantes;
  end if;
end $$;

insert into public.ejercicios (nombre, tipo, dificultad, es_unilateral, es_global)
select s.nombre, s.tipo, s.dificultad, s.unilateral, true
from _ejercicios_semilla s
on conflict (lower(nombre)) where es_global do nothing;

insert into public.ejercicios_musculos (ejercicio_id, musculo_id, rol)
select e.id, m.id, split_part(x, ':', 2)
from _ejercicios_semilla s
cross join lateral unnest(s.musculos) as x
join public.ejercicios e on e.es_global and lower(e.nombre) = lower(s.nombre)
join public.musculos m on m.slug = split_part(x, ':', 1)
on conflict do nothing;

insert into public.ejercicios_equipamiento (ejercicio_id, equipamiento_id)
select e.id, q.id
from _ejercicios_semilla s
cross join lateral unnest(s.equipos) as x
join public.ejercicios e on e.es_global and lower(e.nombre) = lower(s.nombre)
join public.equipamiento q on q.slug = x
on conflict do nothing;
