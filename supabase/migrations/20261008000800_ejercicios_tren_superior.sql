-- ============================================================
-- Migración 008 — Biblioteca global: 37 ejercicios de tren superior: pecho, hombros, espalda, brazos y antebrazos.
-- Usa los músculos de la 007. Idempotente: se puede volver a ejecutar.
-- ============================================================

-- Formato de músculos: 'slug:rol'  (rol = principal | secundario | estabilizador)
-- La tabla temporal desaparece sola al terminar la transacción de la migración.
create temp table _ejercicios_semilla (
  nombre text, tipo text, dificultad text, unilateral boolean,
  musculos text[], equipos text[]
) on commit drop;

insert into _ejercicios_semilla values
  -- Pecho
  ('Press de banca con mancuernas', 'fuerza', 'principiante', false,
    array['pectoral_esternal:principal','pectoral_clavicular:secundario','deltoides_anterior:secundario','triceps_braquial:secundario'],
    array['mancuernas','banco']),
  ('Press declinado con barra', 'fuerza', 'intermedio', false,
    array['pectoral_esternal:principal','triceps_braquial:secundario','deltoides_anterior:secundario'],
    array['barra','banco']),
  ('Cruces en polea', 'fuerza', 'principiante', false,
    array['pectoral_esternal:principal','pectoral_clavicular:secundario','deltoides_anterior:secundario'],
    array['polea']),
  ('Press de pecho en máquina', 'fuerza', 'principiante', false,
    array['pectoral_esternal:principal','deltoides_anterior:secundario','triceps_braquial:secundario'],
    array['maquina']),
  ('Pullover con mancuerna', 'fuerza', 'intermedio', false,
    array['dorsal_ancho:principal','pectoral_esternal:secundario','serrato_anterior:secundario','triceps_braquial:secundario'],
    array['mancuernas','banco']),
  ('Flexión con protracción escapular', 'activacion', 'principiante', false,
    array['serrato_anterior:principal','pectoral_esternal:secundario','pectoral_menor:secundario','recto_abdominal:estabilizador'],
    array['peso_corporal']),
  -- Hombros
  ('Press de hombros con mancuernas sentado', 'fuerza', 'principiante', false,
    array['deltoides_anterior:principal','deltoides_lateral:secundario','triceps_braquial:secundario'],
    array['mancuernas','banco']),
  ('Press Arnold', 'fuerza', 'intermedio', false,
    array['deltoides_anterior:principal','deltoides_lateral:secundario','triceps_braquial:secundario'],
    array['mancuernas','banco']),
  ('Elevaciones frontales con mancuernas', 'fuerza', 'principiante', false,
    array['deltoides_anterior:principal','pectoral_clavicular:secundario'],
    array['mancuernas']),
  ('Elevación lateral en polea a una mano', 'fuerza', 'principiante', true,
    array['deltoides_lateral:principal','trapecio_superior:secundario'],
    array['polea']),
  ('Pájaros con mancuernas', 'fuerza', 'principiante', false,
    array['deltoides_posterior:principal','romboides:secundario','trapecio_medio_inferior:secundario'],
    array['mancuernas']),
  ('Remo al mentón con barra', 'fuerza', 'intermedio', false,
    array['deltoides_lateral:principal','trapecio_superior:principal','biceps_braquial:secundario'],
    array['barra']),
  ('Encogimientos de hombros con mancuernas', 'fuerza', 'principiante', false,
    array['trapecio_superior:principal','elevador_escapula:secundario','flexores_antebrazo:estabilizador'],
    array['mancuernas']),
  ('Y-T-W en banco inclinado', 'activacion', 'principiante', false,
    array['trapecio_medio_inferior:principal','deltoides_posterior:secundario','manguito_rotador:secundario','romboides:secundario'],
    array['mancuernas','banco']),
  ('Separación de banda (pull-apart)', 'activacion', 'principiante', false,
    array['deltoides_posterior:principal','romboides:secundario','trapecio_medio_inferior:secundario'],
    array['banda_elastica']),
  -- Espalda
  ('Remo sentado en polea', 'fuerza', 'principiante', false,
    array['dorsal_ancho:principal','romboides:principal','trapecio_medio_inferior:secundario','biceps_braquial:secundario'],
    array['polea']),
  ('Remo invertido', 'fuerza', 'principiante', false,
    array['dorsal_ancho:principal','romboides:principal','biceps_braquial:secundario','deltoides_posterior:secundario','recto_abdominal:estabilizador'],
    array['suspension','peso_corporal']),
  ('Dominadas supinas', 'fuerza', 'intermedio', false,
    array['dorsal_ancho:principal','biceps_braquial:principal','redondo_mayor:secundario','romboides:secundario'],
    array['barra_dominadas']),
  ('Remo en máquina con apoyo de pecho', 'fuerza', 'principiante', false,
    array['romboides:principal','dorsal_ancho:principal','trapecio_medio_inferior:secundario','deltoides_posterior:secundario'],
    array['maquina']),
  ('Jalón con brazos rectos en polea', 'fuerza', 'principiante', false,
    array['dorsal_ancho:principal','redondo_mayor:secundario','triceps_braquial:secundario'],
    array['polea']),
  ('Retracción escapular colgado', 'activacion', 'principiante', false,
    array['trapecio_medio_inferior:principal','dorsal_ancho:secundario','romboides:secundario','flexores_antebrazo:estabilizador'],
    array['barra_dominadas']),
  ('Hiperextensiones lumbares', 'fuerza', 'principiante', false,
    array['erectores_espinales:principal','gluteo_mayor:secundario','isquiotibiales:secundario','multifidos:secundario'],
    array['maquina']),
  ('Buenos días con barra', 'fuerza', 'intermedio', false,
    array['isquiotibiales:principal','erectores_espinales:principal','gluteo_mayor:secundario'],
    array['barra']),
  ('Superman en el suelo', 'fuerza', 'principiante', false,
    array['erectores_espinales:principal','multifidos:secundario','gluteo_mayor:secundario'],
    array['peso_corporal']),
  ('Swing con kettlebell', 'fuerza', 'intermedio', false,
    array['gluteo_mayor:principal','isquiotibiales:principal','erectores_espinales:secundario','flexores_antebrazo:secundario','recto_abdominal:estabilizador'],
    array['kettlebell']),
  ('Peso muerto con barra hexagonal', 'fuerza', 'intermedio', false,
    array['cuadriceps:principal','gluteo_mayor:principal','isquiotibiales:secundario','erectores_espinales:secundario','trapecio_superior:secundario'],
    array['barra']),
  -- Brazos y antebrazos
  ('Curl de bíceps con mancuernas', 'fuerza', 'principiante', false,
    array['biceps_braquial:principal','braquial:secundario','braquiorradial:secundario'],
    array['mancuernas']),
  ('Curl martillo con mancuernas', 'fuerza', 'principiante', false,
    array['braquiorradial:principal','braquial:principal','biceps_braquial:secundario'],
    array['mancuernas']),
  ('Curl predicador con barra', 'fuerza', 'principiante', false,
    array['biceps_braquial:principal','braquial:secundario'],
    array['barra','banco']),
  ('Curl de bíceps en polea baja', 'fuerza', 'principiante', false,
    array['biceps_braquial:principal','braquial:secundario'],
    array['polea']),
  ('Press francés con barra', 'fuerza', 'intermedio', false,
    array['triceps_braquial:principal'],
    array['barra','banco']),
  ('Extensión de tríceps sobre la cabeza con mancuerna', 'fuerza', 'principiante', false,
    array['triceps_braquial:principal'],
    array['mancuernas']),
  ('Fondos en banco', 'fuerza', 'principiante', false,
    array['triceps_braquial:principal','pectoral_esternal:secundario','deltoides_anterior:secundario'],
    array['banco','peso_corporal']),
  ('Press de banca con agarre cerrado', 'fuerza', 'intermedio', false,
    array['triceps_braquial:principal','pectoral_esternal:secundario','deltoides_anterior:secundario'],
    array['barra','banco']),
  ('Curl de muñeca con barra', 'fuerza', 'principiante', false,
    array['flexores_antebrazo:principal'],
    array['barra']),
  ('Extensión de muñeca con mancuerna', 'fuerza', 'principiante', true,
    array['extensores_antebrazo:principal','braquiorradial:secundario'],
    array['mancuernas']),
  ('Paseo del granjero', 'fuerza', 'intermedio', false,
    array['flexores_antebrazo:principal','trapecio_superior:principal','oblicuos:estabilizador','transverso_abdominal:estabilizador','gluteo_medio:estabilizador'],
    array['mancuernas','kettlebell']);

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
