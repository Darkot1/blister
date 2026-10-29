-- ============================================================
-- Endurecer seguridad (auditoría del 28-10-2026)
--   1. Membresías: nadie inserta ni edita miembros por la API. Antes un propietario
--      podía meter a cualquier usuario en su espacio (y con un creado_en antiguo,
--      obtenerContexto() lo llevaba a trabajar ahí) o un admin subirse a propietario.
--      Las altas las hacen los triggers de registro; las invitaciones, cuando existan,
--      irán por una RPC que valide quién acepta.
--   2. Notas: el autor no puede mover una nota a un alumno de otro espacio.
--   3. Página pública: autorización de tratamiento de datos (Ley 1581 de 2012) guardada
--      con cada solicitud y tope diario por espacio contra el spam con correos distintos.
--   4. rls_auto_enable (creada fuera de las migraciones) no debe ser invocable por la API.
--   5. Lista de páginas públicas para el sitemap (buscadores).
-- ============================================================

-- ---------- 1. Membresías ----------
drop policy if exists miembros_gestionar on public.miembros_organizacion;

-- Solo quitar a alguien del espacio; nunca al propietario.
create policy miembros_quitar on public.miembros_organizacion for delete to authenticated
  using (public.tiene_rol_org(organizacion_id, array['propietario', 'admin']) and rol <> 'propietario');

revoke insert, update on public.miembros_organizacion from authenticated, anon;

-- ---------- 2. Notas ----------
drop policy if exists notas_editar_autor on public.notas_alumno;
create policy notas_editar_autor on public.notas_alumno for update to authenticated
  using (autor_id = (select auth.uid()) and public.acceso_alumno(alumno_id))
  with check (autor_id = (select auth.uid()) and public.acceso_alumno(alumno_id));

-- ---------- 3. Solicitudes de la página pública ----------
alter table public.solicitudes add column autoriza_datos_en timestamptz;
comment on column public.solicitudes.autoriza_datos_en is
  'Cuándo la persona autorizó el tratamiento de sus datos (incluidos los de salud) al enviar el formulario. Prueba de la autorización (Ley 1581 de 2012, art. 9).';

-- La versión de 8 parámetros se deja viva mientras se despliega el código nuevo (que llama a
-- esta de 9); la siguiente migración la borra. Sus solicitudes quedan con autoriza_datos_en null.
create or replace function public.enviar_solicitud(
  p_slug      text,
  p_tipo      text,
  p_nombres   text,
  p_apellidos text,
  p_correo    text,
  p_telefono  text,
  p_objetivo  text,
  p_mensaje   text,
  p_autoriza  boolean
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_org      uuid;
  v_correo   text := nullif(lower(trim(p_correo)), '');
  v_telefono text := nullif(regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g'), '');
  v_id       uuid;
begin
  select o.id into v_org from public.organizaciones o
  where o.slug = lower(p_slug) and o.estado = 'activo' and o.pagina_publica;
  if v_org is null then
    raise exception 'Esta página no está disponible.' using errcode = 'P0002';
  end if;

  if p_autoriza is not true then
    raise exception 'Para enviar tus datos necesitamos tu autorización.' using errcode = '22023';
  end if;
  if p_tipo not in ('registro', 'contacto') then
    raise exception 'Tipo de solicitud no válido.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_nombres, ''))) not between 1 and 80
     or char_length(trim(coalesce(p_apellidos, ''))) > 80 then
    raise exception 'Revisa tu nombre.' using errcode = '22023';
  end if;
  if v_correo is null and v_telefono is null then
    raise exception 'Deja un correo o un teléfono para contactarte.' using errcode = '22023';
  end if;
  if v_correo is not null and (char_length(v_correo) > 254 or v_correo !~ '^[^@\s?&/]+@[^@\s?&/]+\.[^@\s?&/]+$') then
    raise exception 'Revisa tu correo.' using errcode = '22023';
  end if;
  if v_telefono is not null and char_length(v_telefono) not between 7 and 16 then
    raise exception 'Revisa tu teléfono.' using errcode = '22023';
  end if;
  if char_length(coalesce(p_mensaje, '')) > 1000 then
    raise exception 'El mensaje es muy largo (máximo 1000 caracteres).' using errcode = '22023';
  end if;

  -- Límites: la misma persona 3 por día; el espacio 60 nuevas por hora y 200 por día
  -- (este último cuenta todas, para que cambiar de correo en cada envío no sirva).
  if (select count(*) from public.solicitudes s
      where s.organizacion_id = v_org and s.creado_en > now() - interval '1 day'
        and (s.correo = v_correo or s.telefono = v_telefono)) >= 3
     or (select count(*) from public.solicitudes s
         where s.organizacion_id = v_org and s.estado = 'nueva'
           and s.creado_en > now() - interval '1 hour') >= 60
     or (select count(*) from public.solicitudes s
         where s.organizacion_id = v_org and s.creado_en > now() - interval '1 day') >= 200 then
    raise exception 'Ya recibimos tu mensaje. Inténtalo de nuevo más tarde.' using errcode = '54000';
  end if;

  insert into public.solicitudes (organizacion_id, tipo, nombres, apellidos, correo, telefono, objetivo, mensaje, autoriza_datos_en)
  values (
    v_org, p_tipo, trim(p_nombres), trim(coalesce(p_apellidos, '')), v_correo, v_telefono,
    case when p_tipo = 'registro' then nullif(p_objetivo, '') end,
    nullif(trim(coalesce(p_mensaje, '')), ''),
    now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.enviar_solicitud(text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.enviar_solicitud(text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- ---------- 4. rls_auto_enable ----------
-- Existe en producción pero no en las migraciones: se revoca solo si está.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

-- ---------- 5. Páginas públicas para el sitemap ----------
-- Solo lo que ya es público: el slug de las páginas encendidas de espacios activos.
create or replace function public.paginas_publicas()
returns table (slug text, actualizado_en timestamptz)
language sql stable security definer set search_path = ''
as $$
  select o.slug, o.actualizado_en
  from public.organizaciones o
  where o.estado = 'activo' and o.pagina_publica
  order by o.actualizado_en desc
  limit 5000;
$$;

revoke execute on function public.paginas_publicas() from public;
grant execute on function public.paginas_publicas() to anon, authenticated;
