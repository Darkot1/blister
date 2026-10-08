-- ============================================================
-- Migración 007 — Músculos que faltaban en el catálogo (profundos
-- o sin trazo en el mapa) y el grupo "Tibiales". Idempotente.
-- ============================================================

-- ---------- Grupo muscular nuevo ----------
insert into public.grupos_musculares (slug, nombre, region_corporal_id, orden)
select 'tibiales', 'Tibiales', r.id, 17
from public.regiones_corporales r
where r.slug = 'piernas'
on conflict (slug) do nothing;

-- ---------- Músculos que faltaban ----------
-- No tienen trazo en el mapa corporal: aparecen en la lista de "músculos profundos".
insert into public.musculos (slug, nombre, grupo_muscular_id, orden)
select m.slug, m.nombre, g.id, m.orden
from (values
  ('elevador_escapula', 'Elevador de la escápula', 'espalda_alta',    32),
  ('pectoral_menor',    'Pectoral menor',          'pectorales',      33),
  ('cuadrado_lumbar',   'Cuadrado lumbar',         'espalda_baja',    34),
  ('multifidos',        'Multífidos',              'espalda_baja',    35),
  ('gluteo_menor',      'Glúteo menor',            'gluteos',         36),
  ('piriforme',         'Piriforme',               'gluteos',         37),
  ('tensor_fascia_lata','Tensor de la fascia lata','gluteos',         38),
  ('tibial_anterior',   'Tibial anterior',         'tibiales',        39)
) as m(slug, nombre, grupo, orden)
join public.grupos_musculares g on g.slug = m.grupo
on conflict (slug) do nothing;
