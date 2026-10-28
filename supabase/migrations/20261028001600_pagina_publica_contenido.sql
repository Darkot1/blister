-- ============================================================
-- Contenido de la página pública (/e/<slug>)
--   Más que una presentación: foto de portada, titular, métodos de trabajo,
--   modalidad y zona, experiencia, certificaciones y contacto directo opcional.
--   Todo vive en organizaciones (lo edita propietario/admin, como el resto de la
--   página) y se publica solo a través de pagina_publica().
--
--   La foto va al bucket público paginas-publicas/{organizacion_id}/...: cualquiera
--   puede verla (es una página pública), pero solo propietario/admin la sube o borra.
-- ============================================================

alter table public.organizaciones
  add column titular          text check (char_length(titular) <= 120),
  add column foto_ruta        text check (char_length(foto_ruta) <= 300),
  add column metodos          jsonb not null default '[]'::jsonb,
  add column modalidad        text check (modalidad in ('presencial', 'en_linea', 'mixta')),
  add column ubicacion        text check (char_length(ubicacion) <= 80),
  add column experiencia_anos smallint check (experiencia_anos between 0 and 60),
  add column certificaciones  text check (char_length(certificaciones) <= 400),
  add column instagram        text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add column whatsapp         text check (whatsapp ~ '^\+?[0-9]{7,15}$'),
  -- Hasta 6 métodos: [{ "titulo": "...", "descripcion": "..." }].
  -- El tope de tamaño frena textos enormes aunque alguien se salte la app.
  add constraint organizaciones_metodos_lista check (
    jsonb_typeof(metodos) = 'array' and jsonb_array_length(metodos) <= 6 and octet_length(metodos::text) <= 4000
  );

-- "Sobre mí" con más espacio que la presentación corta original.
alter table public.organizaciones drop constraint if exists organizaciones_presentacion_check;
alter table public.organizaciones add constraint organizaciones_presentacion_check check (char_length(presentacion) <= 1500);

-- La foto de un espacio solo puede vivir en su propia carpeta.
alter table public.organizaciones add constraint organizaciones_foto_en_su_carpeta
  check (foto_ruta is null or foto_ruta like id::text || '/%');

comment on column public.organizaciones.titular is 'Frase principal de la página pública.';
comment on column public.organizaciones.foto_ruta is 'Portada en el bucket paginas-publicas ({organizacion_id}/...).';
comment on column public.organizaciones.metodos is 'Métodos de trabajo: [{titulo, descripcion}], máximo 6.';

-- ------------------------------------------------------------
-- Bucket de portadas: lectura pública, escritura de propietario/admin del espacio.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('paginas-publicas', 'paginas-publicas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy paginas_publicas_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'paginas-publicas'
              and public.tiene_rol_org(public.org_de_ruta(name), array['propietario', 'admin']));
create policy paginas_publicas_editar on storage.objects for update to authenticated
  using (bucket_id = 'paginas-publicas'
         and public.tiene_rol_org(public.org_de_ruta(name), array['propietario', 'admin']));
create policy paginas_publicas_eliminar on storage.objects for delete to authenticated
  using (bucket_id = 'paginas-publicas'
         and public.tiene_rol_org(public.org_de_ruta(name), array['propietario', 'admin']));
-- Para listar/borrar desde la app con la sesión (la lectura pública del archivo no pasa por aquí).
create policy paginas_publicas_ver on storage.objects for select to authenticated
  using (bucket_id = 'paginas-publicas' and public.es_miembro_org(public.org_de_ruta(name)));

-- ------------------------------------------------------------
-- pagina_publica() devuelve también el contenido nuevo.
-- ------------------------------------------------------------
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
