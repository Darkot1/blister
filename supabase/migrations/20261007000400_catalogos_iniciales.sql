-- ============================================================
-- Migración 004 — Catálogos iniciales (anatomía, equipamiento,
-- biblioteca global de ejercicios). Idempotente.
-- ============================================================

create unique index if not exists ejercicios_global_nombre_uidx
  on public.ejercicios (lower(nombre)) where es_global;

-- ---------- Regiones corporales ----------
insert into public.regiones_corporales (slug, nombre, vista, orden) values
  ('cuello',     'Cuello',     'ambas',     1),
  ('hombros',    'Hombros',    'ambas',     2),
  ('pecho',      'Pecho',      'frontal',   3),
  ('espalda',    'Espalda',    'posterior', 4),
  ('brazos',     'Brazos',     'ambas',     5),
  ('antebrazos', 'Antebrazos', 'ambas',     6),
  ('core',       'Core',       'ambas',     7),
  ('cadera',     'Cadera',     'ambas',     8),
  ('piernas',    'Piernas',    'ambas',     9)
on conflict (slug) do nothing;

-- ---------- Grupos musculares ----------
insert into public.grupos_musculares (slug, nombre, region_corporal_id, orden)
select g.slug, g.nombre, r.id, g.orden
from (values
  ('cuello',          'Cuello',                 'cuello',     1),
  ('hombros',         'Hombros',                'hombros',    2),
  ('pectorales',      'Pectorales',             'pecho',      3),
  ('espalda_alta',    'Espalda alta',           'espalda',    4),
  ('dorsales',        'Dorsales',               'espalda',    5),
  ('espalda_baja',    'Espalda baja',           'espalda',    6),
  ('biceps',          'Bíceps',                 'brazos',     7),
  ('triceps',         'Tríceps',                'brazos',     8),
  ('antebrazo',       'Antebrazo',              'antebrazos', 9),
  ('abdominales',     'Abdominales',            'core',      10),
  ('gluteos',         'Glúteos',                'cadera',    11),
  ('aductores',       'Aductores',              'cadera',    12),
  ('flexores_cadera', 'Flexores de cadera',     'cadera',    13),
  ('cuadriceps',      'Cuádriceps',             'piernas',   14),
  ('isquiotibiales',  'Isquiotibiales',         'piernas',   15),
  ('pantorrillas',    'Pantorrillas',           'piernas',   16)
) as g(slug, nombre, region, orden)
join public.regiones_corporales r on r.slug = g.region
on conflict (slug) do nothing;

-- ---------- Músculos (slug = id estable para el SVG) ----------
insert into public.musculos (slug, nombre, grupo_muscular_id, orden)
select m.slug, m.nombre, g.id, m.orden
from (values
  ('esternocleidomastoideo',  'Esternocleidomastoideo',             'cuello',          1),
  ('deltoides_anterior',      'Deltoides anterior',                 'hombros',         2),
  ('deltoides_lateral',       'Deltoides lateral',                  'hombros',         3),
  ('deltoides_posterior',     'Deltoides posterior',                'hombros',         4),
  ('manguito_rotador',        'Manguito rotador',                   'hombros',         5),
  ('pectoral_clavicular',     'Pectoral mayor (porción clavicular)', 'pectorales',     6),
  ('pectoral_esternal',       'Pectoral mayor (porción esternal)',  'pectorales',      7),
  ('serrato_anterior',        'Serrato anterior',                   'pectorales',      8),
  ('trapecio_superior',       'Trapecio superior',                  'espalda_alta',    9),
  ('trapecio_medio_inferior', 'Trapecio medio e inferior',          'espalda_alta',   10),
  ('romboides',               'Romboides',                          'espalda_alta',   11),
  ('dorsal_ancho',            'Dorsal ancho',                       'dorsales',       12),
  ('redondo_mayor',           'Redondo mayor',                      'dorsales',       13),
  ('erectores_espinales',     'Erectores espinales',                'espalda_baja',   14),
  ('biceps_braquial',         'Bíceps braquial',                    'biceps',         15),
  ('braquial',                'Braquial',                           'biceps',         16),
  ('triceps_braquial',        'Tríceps braquial',                   'triceps',        17),
  ('braquiorradial',          'Braquiorradial',                     'antebrazo',      18),
  ('flexores_antebrazo',      'Flexores del antebrazo',             'antebrazo',      19),
  ('extensores_antebrazo',    'Extensores del antebrazo',           'antebrazo',      20),
  ('recto_abdominal',         'Recto abdominal',                    'abdominales',    21),
  ('oblicuos',                'Oblicuos',                           'abdominales',    22),
  ('transverso_abdominal',    'Transverso abdominal',               'abdominales',    23),
  ('gluteo_mayor',            'Glúteo mayor',                       'gluteos',        24),
  ('gluteo_medio',            'Glúteo medio',                       'gluteos',        25),
  ('aductores',               'Aductores',                          'aductores',      26),
  ('psoas_iliaco',            'Psoas ilíaco',                       'flexores_cadera',27),
  ('cuadriceps',              'Cuádriceps',                         'cuadriceps',     28),
  ('isquiotibiales',          'Isquiotibiales',                     'isquiotibiales', 29),
  ('gastrocnemio',            'Gastrocnemio',                       'pantorrillas',   30),
  ('soleo',                   'Sóleo',                              'pantorrillas',   31)
) as m(slug, nombre, grupo, orden)
join public.grupos_musculares g on g.slug = m.grupo
on conflict (slug) do nothing;

-- ---------- Articulaciones ----------
insert into public.articulaciones (slug, nombre, region_corporal_id, orden)
select a.slug, a.nombre, r.id, a.orden
from (values
  ('columna_cervical', 'Columna cervical', 'cuello',     1),
  ('hombro',           'Hombro',           'hombros',    2),
  ('codo',             'Codo',             'brazos',     3),
  ('muneca',           'Muñeca',           'antebrazos', 4),
  ('columna_toracica', 'Columna torácica', 'espalda',    5),
  ('columna_lumbar',   'Columna lumbar',   'espalda',    6),
  ('cadera',           'Cadera',           'cadera',     7),
  ('rodilla',          'Rodilla',          'piernas',    8),
  ('tobillo',          'Tobillo',          'piernas',    9)
) as a(slug, nombre, region, orden)
join public.regiones_corporales r on r.slug = a.region
on conflict (slug) do nothing;

-- ---------- Equipamiento ----------
insert into public.equipamiento (slug, nombre) values
  ('barra',           'Barra'),
  ('mancuernas',      'Mancuernas'),
  ('kettlebell',      'Kettlebell'),
  ('polea',           'Polea'),
  ('maquina',         'Máquina'),
  ('banco',           'Banco'),
  ('banda_elastica',  'Banda elástica'),
  ('peso_corporal',   'Peso corporal'),
  ('barra_dominadas', 'Barra de dominadas'),
  ('balon_medicinal', 'Balón medicinal'),
  ('suspension',      'Entrenamiento en suspensión'),
  ('otro',            'Otro')
on conflict (slug) do nothing;

-- ---------- Biblioteca global de ejercicios ----------
-- Formato de músculos: 'slug:rol'  (rol = principal | secundario | estabilizador)
create temp table _ejercicios_semilla (
  nombre text, tipo text, dificultad text, unilateral boolean,
  musculos text[], equipos text[]
);

insert into _ejercicios_semilla values
  ('Press de banca con barra', 'fuerza', 'intermedio', false,
    array['pectoral_esternal:principal','pectoral_clavicular:secundario','deltoides_anterior:secundario','triceps_braquial:secundario'],
    array['barra','banco']),
  ('Press inclinado con mancuernas', 'fuerza', 'intermedio', false,
    array['pectoral_clavicular:principal','pectoral_esternal:secundario','deltoides_anterior:secundario','triceps_braquial:secundario'],
    array['mancuernas','banco']),
  ('Aperturas con mancuernas', 'fuerza', 'principiante', false,
    array['pectoral_esternal:principal','pectoral_clavicular:secundario'],
    array['mancuernas','banco']),
  ('Flexiones de brazos', 'fuerza', 'principiante', false,
    array['pectoral_esternal:principal','triceps_braquial:secundario','deltoides_anterior:secundario','recto_abdominal:estabilizador'],
    array['peso_corporal']),
  ('Fondos en paralelas', 'fuerza', 'intermedio', false,
    array['pectoral_esternal:principal','triceps_braquial:principal','deltoides_anterior:secundario'],
    array['peso_corporal']),
  ('Press militar con barra', 'fuerza', 'intermedio', false,
    array['deltoides_anterior:principal','deltoides_lateral:secundario','triceps_braquial:secundario','recto_abdominal:estabilizador'],
    array['barra']),
  ('Elevaciones laterales con mancuernas', 'fuerza', 'principiante', false,
    array['deltoides_lateral:principal','trapecio_superior:secundario'],
    array['mancuernas']),
  ('Face pull en polea', 'fuerza', 'principiante', false,
    array['deltoides_posterior:principal','trapecio_medio_inferior:secundario','manguito_rotador:secundario'],
    array['polea']),
  ('Dominadas', 'fuerza', 'intermedio', false,
    array['dorsal_ancho:principal','biceps_braquial:secundario','romboides:secundario','redondo_mayor:secundario'],
    array['barra_dominadas']),
  ('Jalón al pecho', 'fuerza', 'principiante', false,
    array['dorsal_ancho:principal','biceps_braquial:secundario','redondo_mayor:secundario'],
    array['polea','maquina']),
  ('Remo con barra', 'fuerza', 'intermedio', false,
    array['dorsal_ancho:principal','romboides:principal','trapecio_medio_inferior:secundario','biceps_braquial:secundario','erectores_espinales:estabilizador'],
    array['barra']),
  ('Remo con mancuerna a una mano', 'fuerza', 'principiante', true,
    array['dorsal_ancho:principal','romboides:secundario','biceps_braquial:secundario'],
    array['mancuernas','banco']),
  ('Peso muerto convencional', 'fuerza', 'avanzado', false,
    array['gluteo_mayor:principal','isquiotibiales:principal','erectores_espinales:principal','cuadriceps:secundario','trapecio_superior:secundario','flexores_antebrazo:secundario'],
    array['barra']),
  ('Peso muerto rumano', 'fuerza', 'intermedio', false,
    array['isquiotibiales:principal','gluteo_mayor:principal','erectores_espinales:secundario'],
    array['barra']),
  ('Sentadilla trasera con barra', 'fuerza', 'intermedio', false,
    array['cuadriceps:principal','gluteo_mayor:principal','aductores:secundario','erectores_espinales:estabilizador'],
    array['barra']),
  ('Sentadilla goblet', 'fuerza', 'principiante', false,
    array['cuadriceps:principal','gluteo_mayor:secundario','recto_abdominal:estabilizador'],
    array['kettlebell','mancuernas']),
  ('Zancadas con mancuernas', 'fuerza', 'principiante', true,
    array['cuadriceps:principal','gluteo_mayor:principal','gluteo_medio:estabilizador'],
    array['mancuernas']),
  ('Hip thrust con barra', 'fuerza', 'intermedio', false,
    array['gluteo_mayor:principal','isquiotibiales:secundario'],
    array['barra','banco']),
  ('Prensa de piernas', 'fuerza', 'principiante', false,
    array['cuadriceps:principal','gluteo_mayor:secundario'],
    array['maquina']),
  ('Curl femoral tumbado', 'fuerza', 'principiante', false,
    array['isquiotibiales:principal','gastrocnemio:secundario'],
    array['maquina']),
  ('Elevación de talones de pie', 'fuerza', 'principiante', false,
    array['gastrocnemio:principal','soleo:secundario'],
    array['maquina']),
  ('Curl de bíceps con barra', 'fuerza', 'principiante', false,
    array['biceps_braquial:principal','braquial:secundario','braquiorradial:secundario'],
    array['barra']),
  ('Extensión de tríceps en polea', 'fuerza', 'principiante', false,
    array['triceps_braquial:principal'],
    array['polea']),
  ('Plancha frontal', 'fuerza', 'principiante', false,
    array['recto_abdominal:principal','transverso_abdominal:principal','oblicuos:secundario'],
    array['peso_corporal']),
  ('Pallof press', 'fuerza', 'principiante', false,
    array['oblicuos:principal','transverso_abdominal:secundario'],
    array['polea','banda_elastica']),
  ('Movilidad de cadera 90/90', 'movilidad', 'principiante', false,
    array['gluteo_medio:principal','psoas_iliaco:secundario'],
    array['peso_corporal']),
  ('Rotaciones torácicas en cuadrupedia', 'movilidad', 'principiante', true,
    array['trapecio_medio_inferior:principal','oblicuos:secundario'],
    array['peso_corporal']),
  ('Gato-camello', 'movilidad', 'principiante', false,
    array['erectores_espinales:principal','recto_abdominal:secundario'],
    array['peso_corporal']),
  ('Estiramiento de flexores de cadera', 'estiramiento', 'principiante', true,
    array['psoas_iliaco:principal','cuadriceps:secundario'],
    array['peso_corporal']),
  ('Rotación externa de hombro con banda', 'activacion', 'principiante', true,
    array['manguito_rotador:principal','deltoides_posterior:secundario'],
    array['banda_elastica']);

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

drop table _ejercicios_semilla;
