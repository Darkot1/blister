-- ============================================================
-- Migración 009 — Biblioteca global: 29 ejercicios de tren inferior, cadera y core.
-- Usa los músculos de la 007. Idempotente: se puede volver a ejecutar.
-- ============================================================

-- Formato de músculos: 'slug:rol'  (rol = principal | secundario | estabilizador)
-- La tabla temporal desaparece sola al terminar la transacción de la migración.
create temp table _ejercicios_semilla (
  nombre text, tipo text, dificultad text, unilateral boolean,
  musculos text[], equipos text[]
) on commit drop;

insert into _ejercicios_semilla values
  -- Piernas y cadera
  ('Sentadilla frontal con barra', 'fuerza', 'avanzado', false,
    array['cuadriceps:principal','gluteo_mayor:secundario','erectores_espinales:estabilizador','recto_abdominal:estabilizador'],
    array['barra']),
  ('Sentadilla búlgara con mancuernas', 'fuerza', 'intermedio', true,
    array['cuadriceps:principal','gluteo_mayor:principal','aductores:secundario','gluteo_medio:estabilizador'],
    array['mancuernas','banco']),
  ('Subida al cajón con mancuernas', 'fuerza', 'principiante', true,
    array['cuadriceps:principal','gluteo_mayor:principal','gluteo_medio:estabilizador'],
    array['mancuernas','banco']),
  ('Sentadilla hack en máquina', 'fuerza', 'intermedio', false,
    array['cuadriceps:principal','gluteo_mayor:secundario'],
    array['maquina']),
  ('Sentadilla sumo con kettlebell', 'fuerza', 'principiante', false,
    array['aductores:principal','gluteo_mayor:principal','cuadriceps:secundario'],
    array['kettlebell']),
  ('Extensión de cuádriceps en máquina', 'fuerza', 'principiante', false,
    array['cuadriceps:principal'],
    array['maquina']),
  ('Curl femoral sentado', 'fuerza', 'principiante', false,
    array['isquiotibiales:principal','gastrocnemio:secundario'],
    array['maquina']),
  ('Curl nórdico', 'fuerza', 'avanzado', false,
    array['isquiotibiales:principal','gastrocnemio:secundario'],
    array['peso_corporal']),
  ('Peso muerto rumano a una pierna con mancuerna', 'fuerza', 'intermedio', true,
    array['isquiotibiales:principal','gluteo_mayor:principal','gluteo_medio:estabilizador','erectores_espinales:estabilizador'],
    array['mancuernas']),
  ('Puente de glúteo', 'fuerza', 'principiante', false,
    array['gluteo_mayor:principal','isquiotibiales:secundario'],
    array['peso_corporal']),
  ('Abducción de cadera en máquina', 'fuerza', 'principiante', false,
    array['gluteo_medio:principal','gluteo_menor:secundario','tensor_fascia_lata:secundario'],
    array['maquina']),
  ('Aducción de cadera en máquina', 'fuerza', 'principiante', false,
    array['aductores:principal'],
    array['maquina']),
  ('Plancha Copenhague', 'fuerza', 'intermedio', true,
    array['aductores:principal','oblicuos:secundario','transverso_abdominal:estabilizador'],
    array['banco','peso_corporal']),
  ('Elevación de talones sentado', 'fuerza', 'principiante', false,
    array['soleo:principal','gastrocnemio:secundario'],
    array['maquina']),
  ('Elevación de puntas de pie', 'fuerza', 'principiante', false,
    array['tibial_anterior:principal'],
    array['peso_corporal','banda_elastica']),
  ('Thruster con mancuernas', 'fuerza', 'intermedio', false,
    array['cuadriceps:principal','deltoides_anterior:principal','gluteo_mayor:secundario','triceps_braquial:secundario','recto_abdominal:estabilizador'],
    array['mancuernas']),
  ('Caminata lateral con banda', 'activacion', 'principiante', false,
    array['gluteo_medio:principal','gluteo_menor:secundario','tensor_fascia_lata:secundario'],
    array['banda_elastica']),
  ('Almeja con banda', 'activacion', 'principiante', true,
    array['gluteo_medio:principal','gluteo_menor:secundario','piriforme:secundario'],
    array['banda_elastica']),
  ('Puente de glúteo con banda', 'activacion', 'principiante', false,
    array['gluteo_mayor:principal','gluteo_medio:secundario'],
    array['banda_elastica']),
  -- Core
  ('Plancha lateral', 'fuerza', 'principiante', true,
    array['oblicuos:principal','cuadrado_lumbar:secundario','gluteo_medio:secundario','transverso_abdominal:estabilizador'],
    array['peso_corporal']),
  ('Dead bug', 'activacion', 'principiante', false,
    array['transverso_abdominal:principal','recto_abdominal:secundario','psoas_iliaco:estabilizador'],
    array['peso_corporal']),
  ('Bird dog', 'activacion', 'principiante', false,
    array['multifidos:principal','erectores_espinales:secundario','gluteo_mayor:secundario','transverso_abdominal:estabilizador'],
    array['peso_corporal']),
  ('Crunch abdominal', 'fuerza', 'principiante', false,
    array['recto_abdominal:principal','oblicuos:secundario'],
    array['peso_corporal']),
  ('Elevación de piernas colgado', 'fuerza', 'intermedio', false,
    array['recto_abdominal:principal','psoas_iliaco:principal','oblicuos:secundario','flexores_antebrazo:estabilizador'],
    array['barra_dominadas']),
  ('Rueda abdominal', 'fuerza', 'intermedio', false,
    array['recto_abdominal:principal','transverso_abdominal:principal','dorsal_ancho:secundario'],
    array['otro']),
  ('Hollow hold', 'fuerza', 'intermedio', false,
    array['recto_abdominal:principal','transverso_abdominal:secundario','psoas_iliaco:secundario'],
    array['peso_corporal']),
  ('Leñador en polea', 'fuerza', 'intermedio', true,
    array['oblicuos:principal','transverso_abdominal:secundario','gluteo_medio:estabilizador'],
    array['polea']),
  ('Giro ruso con balón medicinal', 'fuerza', 'principiante', false,
    array['oblicuos:principal','recto_abdominal:secundario'],
    array['balon_medicinal']),
  ('Lanzamiento de balón medicinal al suelo', 'fuerza', 'intermedio', false,
    array['dorsal_ancho:principal','recto_abdominal:principal','triceps_braquial:secundario','deltoides_anterior:secundario'],
    array['balon_medicinal']);

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
