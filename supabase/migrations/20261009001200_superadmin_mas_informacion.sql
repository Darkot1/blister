-- ============================================================
-- Superadministrador: más información y bitácora privada
--
-- 1. La bitácora de accesos deja de ser visible para el propietario del espacio:
--    solo se lee con la RPC admin_accesos (superadministrador).
-- 2. admin_panel(): resumen de la plataforma (cifras, crecimiento semanal, citas por
--    estado, espacios con más columnas y actividad reciente). Sustituye a admin_espacios.
-- 3. admin_usuarios(): todas las cuentas, con sus espacios, proveedor e ingresos.
-- 4. admin_detalle_espacio(): añade citas, asistencia, planes, plantillas, actividad y
--    más datos de cada alumno (objetivo, mediciones, última sesión).
-- Sin `drop`: las políticas se alteran y la función antigua solo pierde el permiso.
-- ============================================================

-- ---------- 1. Bitácora privada ----------
alter policy accesos_superadmin_ver_propietario on public.accesos_superadmin using (false);
alter policy accesos_superadmin_ver_propietario on public.accesos_superadmin rename to accesos_superadmin_cerrada;

-- ---------- Etiquetas para la actividad ----------
create or replace function public.admin_actividad(p_organizacion_id uuid, p_limite integer)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x.creado_en desc), '[]'::jsonb)
  from (
    select r.creado_en, r.accion, r.tipo_entidad, r.organizacion_id as espacio_id,
           o.nombre as espacio,
           nullif(trim(p.nombres || ' ' || p.apellidos), '') as usuario
    from public.registros_auditoria r
    left join public.organizaciones o on o.id = r.organizacion_id
    left join public.perfiles p on p.id = r.usuario_id
    where p_organizacion_id is null or r.organizacion_id = p_organizacion_id
    order by r.creado_en desc
    limit p_limite
  ) x;
$$;

-- ---------- 2. Panel de la plataforma ----------
create or replace function public.admin_panel()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_lunes date := date_trunc('week', now() at time zone 'America/Bogota')::date;
begin
  perform public.exigir_superadmin();

  return jsonb_build_object(
    'totales', jsonb_build_object(
      'espacios', (select count(*) from public.organizaciones),
      'espacios_activos', (select count(*) from public.organizaciones where estado = 'activo'),
      'espacios_suspendidos', (select count(*) from public.organizaciones where estado = 'suspendido'),
      'usuarios', (select count(*) from auth.users),
      'usuarios_nuevos_30d', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
      'usuarios_activos_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
      'alumnos', (select count(*) from public.alumnos),
      'alumnos_activos', (select count(*) from public.alumnos where estado = 'activo'),
      'alumnos_nuevos_30d', (select count(*) from public.alumnos where creado_en >= now() - interval '30 days'),
      'plantillas', (select count(*) from public.plantillas),
      'planes_activos', (select count(*) from public.planes where estado = 'activo'),
      'sesiones_completadas_30d', (select count(*) from public.sesiones
                                    where estado = 'completada' and completada_en >= now() - interval '30 days'),
      'mediciones_30d', (select count(*) from public.mediciones where medido_en >= now() - interval '30 days'),
      'ejercicios_globales', (select count(*) from public.ejercicios where es_global),
      'ejercicios_propios', (select count(*) from public.ejercicios where organizacion_id is not null)
    ),
    'citas_30d', coalesce((
      select jsonb_object_agg(estado, n) from (
        select c.estado, count(*) as n from public.citas c
        where c.inicia_en >= now() - interval '30 days' and c.inicia_en < now() + interval '30 days'
        group by c.estado) e), '{}'::jsonb),
    -- Últimas 12 semanas (lunes a domingo, hora de Bogotá).
    'semanas', (
      select jsonb_agg(jsonb_build_object(
        'semana', s.lunes,
        'usuarios', (select count(*) from auth.users u
                      where (u.created_at at time zone 'America/Bogota')::date between s.lunes and s.lunes + 6),
        'alumnos', (select count(*) from public.alumnos a
                     where (a.creado_en at time zone 'America/Bogota')::date between s.lunes and s.lunes + 6),
        'citas', (select count(*) from public.citas c
                   where (c.inicia_en at time zone 'America/Bogota')::date between s.lunes and s.lunes + 6
                     and c.estado not in ('cancelada', 'reprogramada'))
      ) order by s.lunes)
      from (select (v_lunes - (i * 7))::date as lunes from generate_series(0, 11) i) s
    ),
    'espacios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'nombre', o.nombre, 'slug', o.slug, 'estado', o.estado, 'creado_en', o.creado_en,
        'propietario', (select nullif(trim(p.nombres || ' ' || p.apellidos), '')
                          from public.miembros_organizacion m join public.perfiles p on p.id = m.usuario_id
                         where m.organizacion_id = o.id and m.rol = 'propietario' order by m.creado_en limit 1),
        'propietario_correo', (select u.email from public.miembros_organizacion m join auth.users u on u.id = m.usuario_id
                                where m.organizacion_id = o.id and m.rol = 'propietario' order by m.creado_en limit 1),
        'ultimo_ingreso', (select max(u.last_sign_in_at) from public.miembros_organizacion m
                             join auth.users u on u.id = m.usuario_id where m.organizacion_id = o.id),
        'miembros', (select count(*) from public.miembros_organizacion m where m.organizacion_id = o.id),
        'alumnos', (select count(*) from public.alumnos a where a.organizacion_id = o.id),
        'alumnos_activos', (select count(*) from public.alumnos a where a.organizacion_id = o.id and a.estado = 'activo'),
        'planes_activos', (select count(*) from public.planes pl where pl.organizacion_id = o.id and pl.estado = 'activo'),
        'citas_30d', (select count(*) from public.citas c
                       where c.organizacion_id = o.id and c.inicia_en >= now() - interval '30 days' and c.inicia_en < now()),
        'ultima_actividad', (select max(r.creado_en) from public.registros_auditoria r where r.organizacion_id = o.id)
      ) order by o.creado_en desc)
      from public.organizaciones o), '[]'::jsonb),
    'actividad', public.admin_actividad(null, 15)
  );
end;
$$;

-- ---------- 3. Usuarios ----------
create or replace function public.admin_usuarios()
returns table (
  id             uuid,
  nombres        text,
  apellidos      text,
  avatar_url     text,
  correo         text,
  proveedores    text[],
  creado_en      timestamptz,
  ultimo_ingreso timestamptz,
  confirmado     boolean,
  es_superadmin  boolean,
  espacios       jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.exigir_superadmin();
  return query
  select u.id, coalesce(p.nombres, ''), coalesce(p.apellidos, ''), p.avatar_url, u.email::text,
    coalesce(array(select jsonb_array_elements_text(u.raw_app_meta_data -> 'providers')), array[]::text[]),
    u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
    exists (select 1 from public.superadministradores s where s.usuario_id = u.id),
    coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'nombre', o.nombre, 'estado', o.estado, 'rol', m.rol)
                       order by m.creado_en)
      from public.miembros_organizacion m join public.organizaciones o on o.id = m.organizacion_id
      where m.usuario_id = u.id), '[]'::jsonb)
  from auth.users u
  left join public.perfiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

-- ---------- 4. Detalle de un espacio ----------
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
               and c.inicia_en >= now() and c.estado in ('programada', 'confirmada')),
          'citas_completadas_30d', (
            select count(*) from public.citas c
             where c.organizacion_id = o.id and c.entrenador_id = m.usuario_id
               and c.inicia_en >= now() - interval '30 days' and c.estado = 'completada')
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
          'objetivo', (select ob.nombre from public.objetivos_alumno ob
                        where ob.alumno_id = a.id and ob.es_principal and ob.estado = 'activo' limit 1),
          'planes_activos', (
            select count(*) from public.planes pl where pl.alumno_id = a.id and pl.estado = 'activo'),
          'sesiones_completadas', (
            select count(*) from public.sesiones s where s.alumno_id = a.id and s.estado = 'completada'),
          'ultima_sesion', (
            select max(s.completada_en) from public.sesiones s where s.alumno_id = a.id and s.estado = 'completada'),
          'mediciones', (select count(*) from public.mediciones me where me.alumno_id = a.id),
          'ultima_medicion', (select max(me.medido_en) from public.mediciones me where me.alumno_id = a.id),
          'proxima_cita', (
            select min(c.inicia_en) from public.citas c
             where c.alumno_id = a.id and c.inicia_en >= now() and c.estado in ('programada', 'confirmada'))
        ) order by a.apellidos, a.nombres)
      from public.alumnos a where a.organizacion_id = o.id), '[]'::jsonb),
    'citas_30d', coalesce((
      select jsonb_object_agg(e.estado, e.n) from (
        select c.estado, count(*) as n from public.citas c
        where c.organizacion_id = o.id and c.inicia_en >= now() - interval '30 days' and c.inicia_en < now()
        group by c.estado) e), '{}'::jsonb),
    'proximas_citas', coalesce((
      select jsonb_agg(x order by x.inicia_en) from (
        select c.id, c.inicia_en, c.termina_en, c.tipo, c.estado,
               a.nombres || ' ' || a.apellidos as alumno,
               nullif(trim(p.nombres || ' ' || p.apellidos), '') as entrenador
        from public.citas c
        join public.alumnos a on a.id = c.alumno_id
        left join public.perfiles p on p.id = c.entrenador_id
        where c.organizacion_id = o.id and c.inicia_en >= now() and c.estado in ('programada', 'confirmada')
        order by c.inicia_en limit 10) x), '[]'::jsonb),
    'planes', coalesce((
      select jsonb_agg(x order by x.estado = 'activo' desc, x.fecha_inicio desc) from (
        select pl.id, pl.nombre, pl.estado, pl.fecha_inicio, pl.fecha_fin, pl.tipo_objetivo,
               a.nombres || ' ' || a.apellidos as alumno,
               nullif(trim(p.nombres || ' ' || p.apellidos), '') as creado_por
        from public.planes pl
        join public.alumnos a on a.id = pl.alumno_id
        left join public.perfiles p on p.id = pl.creado_por
        where pl.organizacion_id = o.id and pl.estado <> 'archivado'
        order by pl.fecha_inicio desc limit 20) x), '[]'::jsonb),
    'plantillas', coalesce((
      select jsonb_agg(x order by x.creado_en desc) from (
        select t.id, t.nombre, t.estado, t.tipo_objetivo, t.creado_en,
               (select count(*) from public.planes pl where pl.plantilla_origen_id = t.id) as asignaciones
        from public.plantillas t
        where t.organizacion_id = o.id and t.estado <> 'archivado'
        order by t.creado_en desc limit 20) x), '[]'::jsonb),
    'actividad', public.admin_actividad(o.id, 20),
    'totales', jsonb_build_object(
      'plantillas', (select count(*) from public.plantillas t where t.organizacion_id = o.id),
      'planes', (select count(*) from public.planes pl where pl.organizacion_id = o.id),
      'sesiones', (select count(*) from public.sesiones s where s.organizacion_id = o.id),
      'citas', (select count(*) from public.citas c where c.organizacion_id = o.id),
      'mediciones', (select count(*) from public.mediciones me
                      join public.alumnos a on a.id = me.alumno_id where a.organizacion_id = o.id),
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

-- ---------- Permisos ----------
revoke execute on function public.admin_actividad(uuid, integer) from public, anon, authenticated;
-- admin_panel la sustituye.
revoke execute on function public.admin_espacios() from authenticated;
revoke execute on function public.admin_panel() from public, anon;
revoke execute on function public.admin_usuarios() from public, anon;
grant execute on function public.admin_panel(), public.admin_usuarios() to authenticated;
