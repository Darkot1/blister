-- ============================================================
-- Página pública: testimonios, tiempo de respuesta y oferta inicial
--   - testimonios: lo que dicen sus alumnos (prueba social). Hasta 6:
--     [{ "nombre": "Laura G.", "texto": "...", "resultado": "−8 kg en 4 meses" }].
--     El entrenador declara en el editor que son reales y que el alumno autorizó publicarlos.
--   - respuesta_horas: "te respondo en menos de N horas", junto al formulario.
--   - oferta_inicial: gancho corto en la portada ("Primera sesión gratis").
--   Las secciones nuevas que se ordenan u ocultan (testimonios, equipo) viven en `diseno`
--   (jsonb libre, ver 20261028001700): no necesitan columna.
-- ============================================================

alter table public.organizaciones
  add column testimonios     jsonb not null default '[]'::jsonb,
  add column respuesta_horas smallint check (respuesta_horas between 1 and 72),
  add column oferta_inicial  text check (char_length(oferta_inicial) <= 80),
  -- El tope de tamaño frena textos enormes aunque alguien se salte la app.
  add constraint organizaciones_testimonios_lista check (
    jsonb_typeof(testimonios) = 'array' and jsonb_array_length(testimonios) <= 6 and octet_length(testimonios::text) <= 3000
  );

comment on column public.organizaciones.testimonios is 'Testimonios de alumnos: [{nombre, texto, resultado}], máximo 6. Publicados con su permiso.';
comment on column public.organizaciones.respuesta_horas is 'En cuántas horas responde las solicitudes (1 a 72), para la página pública.';
comment on column public.organizaciones.oferta_inicial is 'Oferta para empezar, en la portada (p. ej., "Primera sesión gratis").';

-- pagina_publica() devuelve también el contenido nuevo.
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
    'testimonios', o.testimonios,
    'respuesta_horas', o.respuesta_horas,
    'oferta_inicial', o.oferta_inicial,
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
