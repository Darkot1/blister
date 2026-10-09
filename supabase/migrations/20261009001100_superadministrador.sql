-- ============================================================
-- Superadministrador de la plataforma
--
-- Ve todos los espacios de trabajo (organizaciones), sus entrenadores y sus alumnos,
-- en SOLO LECTURA, y puede suspender o reactivar un espacio.
--
-- Diseño:
-- - No se tocan las políticas RLS de las tablas de negocio: el superadministrador no
--   gana acceso directo a ninguna tabla. Todo pasa por RPC `admin_*` (security definer)
--   que comprueban `es_superadmin()` y devuelven solo lo necesario (sin contacto ni
--   datos de salud de los alumnos).
-- - Cada vista de un espacio y cada cambio de estado se registra en `accesos_superadmin`
--   dentro de la misma RPC: no se puede consultar sin dejar rastro. El propietario del
--   espacio puede leer esos registros.
-- - Un espacio suspendido o archivado deja de dar acceso: `es_miembro_org` y
--   `tiene_rol_org` exigen que la organización esté activa.
-- ============================================================

create table if not exists public.superadministradores (
  usuario_id uuid primary key references public.perfiles(id) on delete cascade,
  creado_en  timestamptz not null default now()
);
alter table public.superadministradores enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'superadmin_ver_propio'
                 and polrelid = 'public.superadministradores'::regclass) then
    -- Cada usuario solo puede saber si él mismo lo es (para mostrar el menú).
    create policy superadmin_ver_propio on public.superadministradores for select to authenticated
      using (usuario_id = (select auth.uid()));
  end if;
end $$;
revoke insert, update, delete on public.superadministradores from authenticated;

create table if not exists public.accesos_superadmin (
  id              uuid primary key default gen_random_uuid(),
  superadmin_id   uuid not null references public.perfiles(id) on delete cascade,
  organizacion_id uuid references public.organizaciones(id) on delete set null,
  accion          text not null check (accion in ('ver_espacio', 'suspender', 'reactivar')),
  motivo          text,
  creado_en       timestamptz not null default now()
);
create index if not exists accesos_superadmin_creado_idx on public.accesos_superadmin(creado_en desc);
create index if not exists accesos_superadmin_org_idx on public.accesos_superadmin(organizacion_id, creado_en desc);
alter table public.accesos_superadmin enable row level security;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'accesos_superadmin_ver_propietario'
                 and polrelid = 'public.accesos_superadmin'::regclass) then
    -- Transparencia: el propietario ve quién consultó su espacio.
    create policy accesos_superadmin_ver_propietario on public.accesos_superadmin for select to authenticated
      using (public.tiene_rol_org(organizacion_id, array['propietario', 'admin']));
  end if;
end $$;
revoke insert, update, delete on public.accesos_superadmin from authenticated;

-- ---------- Autorización ----------

create or replace function public.es_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.superadministradores s where s.usuario_id = (select auth.uid()));
$$;

-- Un espacio suspendido o archivado deja de dar acceso a sus miembros.
create or replace function public.es_miembro_org(p_organizacion_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_organizacion m
    join public.organizaciones o on o.id = m.organizacion_id
    where m.organizacion_id = p_organizacion_id
      and m.usuario_id = (select auth.uid())
      and m.estado = 'activo'
      and o.estado = 'activo'
  );
$$;

create or replace function public.tiene_rol_org(p_organizacion_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_organizacion m
    join public.organizaciones o on o.id = m.organizacion_id
    where m.organizacion_id = p_organizacion_id
      and m.usuario_id = (select auth.uid())
      and m.estado = 'activo'
      and o.estado = 'activo'
      and m.rol = any(p_roles)
  );
$$;

-- El miembro de un espacio suspendido sigue viendo su organización (nombre y estado)
-- para que la app le explique por qué no puede entrar.
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'organizaciones_ver_propia'
                 and polrelid = 'public.organizaciones'::regclass) then
    create policy organizaciones_ver_propia on public.organizaciones for select to authenticated
      using (exists (
        select 1 from public.miembros_organizacion m
        where m.organizacion_id = organizaciones.id
          and m.usuario_id = (select auth.uid())
          and m.estado = 'activo'
      ));
  end if;
end $$;

create or replace function public.exigir_superadmin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.es_superadmin() then
    raise exception 'Solo el superadministrador puede hacer esto.' using errcode = '42501';
  end if;
end;
$$;

-- ---------- RPC de lectura ----------

-- Todos los espacios con sus cifras. Sin registro: solo muestra conteos y el propietario.
create or replace function public.admin_espacios()
returns table (
  id                 uuid,
  nombre             text,
  slug               text,
  estado             text,
  creado_en          timestamptz,
  propietario        text,
  propietario_correo text,
  miembros           integer,
  alumnos            integer,
  alumnos_activos    integer,
  citas_30d          integer,
  ultima_actividad   timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.exigir_superadmin();
  return query
  select o.id, o.nombre, o.slug, o.estado, o.creado_en,
    (select nullif(trim(p.nombres || ' ' || p.apellidos), '')
       from public.miembros_organizacion m join public.perfiles p on p.id = m.usuario_id
      where m.organizacion_id = o.id and m.rol = 'propietario'
      order by m.creado_en limit 1),
    (select u.email::text
       from public.miembros_organizacion m join auth.users u on u.id = m.usuario_id
      where m.organizacion_id = o.id and m.rol = 'propietario'
      order by m.creado_en limit 1),
    (select count(*)::integer from public.miembros_organizacion m where m.organizacion_id = o.id),
    (select count(*)::integer from public.alumnos a where a.organizacion_id = o.id),
    (select count(*)::integer from public.alumnos a where a.organizacion_id = o.id and a.estado = 'activo'),
    (select count(*)::integer from public.citas c
      where c.organizacion_id = o.id and c.inicia_en >= now() - interval '30 days'),
    (select max(r.creado_en) from public.registros_auditoria r where r.organizacion_id = o.id)
  from public.organizaciones o
  order by o.creado_en desc;
end;
$$;

-- Un espacio en detalle: entrenadores y alumnos (con quién los atiende). Queda registrado.
create or replace function public.admin_detalle_espacio(p_organizacion_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_resultado jsonb;
begin
  perform public.exigir_superadmin();

  select jsonb_build_object(
    'espacio', jsonb_build_object(
      'id', o.id, 'nombre', o.nombre, 'slug', o.slug, 'estado', o.estado,
      'zona_horaria', o.zona_horaria, 'creado_en', o.creado_en),
    'miembros', coalesce((
      select jsonb_agg(jsonb_build_object(
          'usuario_id', m.usuario_id,
          'nombres', p.nombres, 'apellidos', p.apellidos, 'avatar_url', p.avatar_url,
          'correo', u.email, 'rol', m.rol, 'estado', m.estado, 'creado_en', m.creado_en,
          'ultimo_ingreso', u.last_sign_in_at,
          'alumnos', (
            select count(distinct x.alumno_id) from (
              select c.alumno_id from public.citas c
               where c.organizacion_id = o.id and c.entrenador_id = m.usuario_id
              union
              select pl.alumno_id from public.planes pl
               where pl.organizacion_id = o.id and pl.creado_por = m.usuario_id
            ) x),
          'citas_proximas', (
            select count(*) from public.citas c
             where c.organizacion_id = o.id and c.entrenador_id = m.usuario_id
               and c.inicia_en >= now() and c.estado in ('programada', 'confirmada'))
        ) order by m.creado_en)
      from public.miembros_organizacion m
      join public.perfiles p on p.id = m.usuario_id
      left join auth.users u on u.id = m.usuario_id
      where m.organizacion_id = o.id), '[]'::jsonb),
    'alumnos', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', a.id, 'nombres', a.nombres, 'apellidos', a.apellidos,
          'estado', a.estado, 'fecha_inicio', a.fecha_inicio, 'creado_en', a.creado_en,
          'entrenadores', coalesce((
            select jsonb_agg(distinct x.entrenador_id) from (
              select c.entrenador_id from public.citas c where c.alumno_id = a.id
              union
              select pl.creado_por from public.planes pl where pl.alumno_id = a.id
            ) x), '[]'::jsonb),
          'planes_activos', (
            select count(*) from public.planes pl where pl.alumno_id = a.id and pl.estado = 'activo'),
          'sesiones_completadas', (
            select count(*) from public.sesiones s where s.alumno_id = a.id and s.estado = 'completada'),
          'proxima_cita', (
            select min(c.inicia_en) from public.citas c
             where c.alumno_id = a.id and c.inicia_en >= now() and c.estado in ('programada', 'confirmada'))
        ) order by a.apellidos, a.nombres)
      from public.alumnos a where a.organizacion_id = o.id), '[]'::jsonb),
    'totales', jsonb_build_object(
      'plantillas', (select count(*) from public.plantillas t where t.organizacion_id = o.id),
      'planes', (select count(*) from public.planes pl where pl.organizacion_id = o.id),
      'sesiones', (select count(*) from public.sesiones s where s.organizacion_id = o.id),
      'citas', (select count(*) from public.citas c where c.organizacion_id = o.id),
      'ejercicios_propios', (select count(*) from public.ejercicios e where e.organizacion_id = o.id),
      'musculos_propios', (select count(*) from public.musculos mu where mu.organizacion_id = o.id))
  )
  into v_resultado
  from public.organizaciones o
  where o.id = p_organizacion_id;

  if v_resultado is null then
    return null;
  end if;

  insert into public.accesos_superadmin (superadmin_id, organizacion_id, accion)
  values ((select auth.uid()), p_organizacion_id, 'ver_espacio');

  return v_resultado;
end;
$$;

-- Bitácora de accesos del superadministrador.
create or replace function public.admin_accesos(p_limite integer default 100)
returns table (
  id          uuid,
  creado_en   timestamptz,
  accion      text,
  motivo      text,
  espacio_id  uuid,
  espacio     text,
  superadmin  text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.exigir_superadmin();
  return query
  select r.id, r.creado_en, r.accion, r.motivo, r.organizacion_id, o.nombre,
         nullif(trim(p.nombres || ' ' || p.apellidos), '')
  from public.accesos_superadmin r
  left join public.organizaciones o on o.id = r.organizacion_id
  left join public.perfiles p on p.id = r.superadmin_id
  order by r.creado_en desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
end;
$$;

-- ---------- RPC de escritura (la única) ----------

create or replace function public.admin_cambiar_estado_espacio(
  p_organizacion_id uuid, p_estado text, p_motivo text default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  perform public.exigir_superadmin();

  if p_estado not in ('activo', 'suspendido') then
    raise exception 'Estado no permitido: %', p_estado using errcode = '22023';
  end if;
  if p_estado = 'suspendido' and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indica el motivo de la suspensión.' using errcode = '22023';
  end if;
  -- Evita que el superadministrador se deje fuera de su propio espacio.
  if exists (select 1 from public.miembros_organizacion m
             where m.organizacion_id = p_organizacion_id and m.usuario_id = (select auth.uid())) then
    raise exception 'No puedes suspender un espacio del que eres miembro.' using errcode = '42501';
  end if;

  update public.organizaciones set estado = p_estado
  where id = p_organizacion_id and estado <> p_estado and estado <> 'archivado';
  if not found then
    raise exception 'El espacio no existe o ya está en ese estado.' using errcode = 'P0002';
  end if;

  insert into public.accesos_superadmin (superadmin_id, organizacion_id, accion, motivo)
  values ((select auth.uid()), p_organizacion_id,
          case p_estado when 'suspendido' then 'suspender' else 'reactivar' end,
          nullif(trim(p_motivo), ''));
end;
$$;

-- ---------- Permisos ----------

revoke execute on function public.es_superadmin() from public, anon, authenticated;
revoke execute on function public.exigir_superadmin() from public, anon, authenticated;
revoke execute on function public.admin_espacios() from public, anon;
revoke execute on function public.admin_detalle_espacio(uuid) from public, anon;
revoke execute on function public.admin_accesos(integer) from public, anon;
revoke execute on function public.admin_cambiar_estado_espacio(uuid, text, text) from public, anon;
grant execute on function
  public.admin_espacios(),
  public.admin_detalle_espacio(uuid),
  public.admin_accesos(integer),
  public.admin_cambiar_estado_espacio(uuid, text, text)
to authenticated;
