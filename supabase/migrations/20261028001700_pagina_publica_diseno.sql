-- ============================================================
-- Diseño de la página pública (/e/<slug>)
--   El entrenador ordena y oculta secciones (arrastrando en el editor), elige el
--   color principal, el estilo y el fondo de la portada y el texto del botón.
--   Se guarda como un objeto libre: la app lo valida al guardar y lo normaliza al
--   leer (lo que falte toma el valor inicial), así que añadir opciones no exige
--   migrar datos. Aquí solo se limita el tamaño.
-- ============================================================

alter table public.organizaciones
  add column diseno jsonb not null default '{}'::jsonb,
  add constraint organizaciones_diseno_objeto check (
    jsonb_typeof(diseno) = 'object' and octet_length(diseno::text) <= 2000
  );

comment on column public.organizaciones.diseno is
  'Diseño de la página pública: {secciones:[{id,visible}], acento:"#rrggbb", portada, fondo, boton}.';

create or replace function public.pagina_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', o.nombre,
    'titular', o.titular,
    'presentacion', o.presentacion,
    'foto_ruta', o.foto_ruta,
    'metodos', o.metodos,
    'modalidad', o.modalidad,
    'ubicacion', o.ubicacion,
    'experiencia_anos', o.experiencia_anos,
    'certificaciones', o.certificaciones,
    'instagram', o.instagram,
    'whatsapp', o.whatsapp,
    'diseno', o.diseno,
    'entrenadores', coalesce((
      select jsonb_agg(jsonb_build_object('nombres', p.nombres, 'apellidos', p.apellidos, 'avatar_url', p.avatar_url)
                       order by (m.rol = 'propietario') desc, p.nombres)
      from public.miembros_organizacion m
      join public.perfiles p on p.id = m.usuario_id
      -- Solo quienes entrenan: un admin que no entrena no aparece en la página.
      where m.organizacion_id = o.id and m.estado = 'activo' and m.rol in ('propietario', 'entrenador')
    ), '[]'::jsonb)
  )
  from public.organizaciones o
  where o.slug = lower(p_slug) and o.estado = 'activo' and o.pagina_publica;
$$;
