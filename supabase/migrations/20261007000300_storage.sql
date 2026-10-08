-- ============================================================
-- Migración 003 — Supabase Storage
-- ============================================================
-- Convención de rutas (la primera carpeta SIEMPRE es la organización):
--   fotos-progreso/{organizacion_id}/{alumno_id}/{uuid}.jpg
--   medios-ejercicios/{organizacion_id}/{ejercicio_id}/{archivo}
--   adjuntos/{organizacion_id}/{...}
--   avatares/{usuario_id}/{archivo}
-- Los buckets privados se leen con URLs firmadas (createSignedUrl).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatares',          'avatares',          true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('fotos-progreso',    'fotos-progreso',    false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('medios-ejercicios', 'medios-ejercicios', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']),
  ('adjuntos',          'adjuntos',          false, 20971520, null)
on conflict (id) do nothing;

-- Devuelve la organización de la ruta, o null si la ruta no empieza por un uuid.
create or replace function public.org_de_ruta(p_nombre text)
returns uuid language sql immutable set search_path = ''
as $$
  select case
    when (storage.foldername(p_nombre))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_nombre))[1])::uuid
  end;
$$;
grant execute on function public.org_de_ruta(text) to authenticated;

-- Archivos de organización: solo miembros de esa organización.
create policy archivos_org_ver on storage.objects for select to authenticated
  using (bucket_id in ('fotos-progreso', 'medios-ejercicios', 'adjuntos')
         and public.es_miembro_org(public.org_de_ruta(name)));
create policy archivos_org_subir on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos-progreso', 'medios-ejercicios', 'adjuntos')
              and public.es_miembro_org(public.org_de_ruta(name)));
create policy archivos_org_editar on storage.objects for update to authenticated
  using (bucket_id in ('fotos-progreso', 'medios-ejercicios', 'adjuntos')
         and public.es_miembro_org(public.org_de_ruta(name)));
create policy archivos_org_eliminar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos-progreso', 'medios-ejercicios', 'adjuntos')
         and public.tiene_rol_org(public.org_de_ruta(name), array['propietario', 'admin', 'entrenador']));

-- Avatares: cada usuario gestiona su propia carpeta.
create policy avatares_gestionar on storage.objects for all to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
