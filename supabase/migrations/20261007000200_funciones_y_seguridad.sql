-- ============================================================
-- Migración 002 — Funciones, triggers, auditoría y RLS
-- ============================================================

-- ============================================================
-- 1. FUNCIONES DE AUTORIZACIÓN
-- ============================================================
-- security definer + search_path fijo: se ejecutan sin RLS para
-- evitar recursión y para que las políticas sean cortas y rápidas.

create or replace function public.es_miembro_org(p_organizacion_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_organizacion m
    where m.organizacion_id = p_organizacion_id
      and m.usuario_id = (select auth.uid())
      and m.estado = 'activo'
  );
$$;

create or replace function public.tiene_rol_org(p_organizacion_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_organizacion m
    where m.organizacion_id = p_organizacion_id
      and m.usuario_id = (select auth.uid())
      and m.estado = 'activo'
      and m.rol = any(p_roles)
  );
$$;

create or replace function public.acceso_alumno(p_alumno_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_miembro_org(a.organizacion_id)
  from public.alumnos a where a.id = p_alumno_id;
$$;

create or replace function public.acceso_plantilla(p_plantilla_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_miembro_org(p.organizacion_id)
  from public.plantillas p where p.id = p_plantilla_id;
$$;

create or replace function public.acceso_plan(p_plan_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_miembro_org(p.organizacion_id)
  from public.planes p where p.id = p_plan_id;
$$;

create or replace function public.acceso_sesion(p_sesion_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.es_miembro_org(s.organizacion_id)
  from public.sesiones s where s.id = p_sesion_id;
$$;

-- ¿Puede el usuario USAR este ejercicio en una rutina? (global o de su organización)
create or replace function public.ejercicio_utilizable(p_ejercicio_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select e.es_global or public.es_miembro_org(e.organizacion_id)
  from public.ejercicios e where e.id = p_ejercicio_id;
$$;

-- ¿Comparte organización con otro usuario? (para ver nombres del equipo)
create or replace function public.comparte_organizacion(p_usuario_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.miembros_organizacion yo
    join public.miembros_organizacion otro on otro.organizacion_id = yo.organizacion_id
    where yo.usuario_id = (select auth.uid()) and yo.estado = 'activo'
      and otro.usuario_id = p_usuario_id
  );
$$;

-- ============================================================
-- 2. TRIGGERS GENERALES
-- ============================================================

create or replace function public.actualizar_marca_tiempo()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizaciones', 'perfiles', 'miembros_organizacion', 'alumnos',
    'objetivos_alumno', 'condiciones_alumno', 'notas_alumno', 'ejercicios',
    'plantillas', 'planes', 'sesiones', 'citas'
  ] loop
    execute format(
      'create trigger trg_%1$s_actualizado_en before update on public.%1$I
       for each row execute function public.actualizar_marca_tiempo()', t);
  end loop;
end $$;

-- Crea el perfil automáticamente al registrarse un usuario.
-- El frontend puede enviar { nombres, apellidos } en options.data de signUp.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombres, apellidos)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombres', ''),
    coalesce(new.raw_user_meta_data ->> 'apellidos', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_usuario_creado
after insert on auth.users
for each row execute function public.crear_perfil_nuevo_usuario();

-- Solo propietario, admin o entrenador pueden archivar alumnos (no asistentes).
create or replace function public.validar_archivo_alumno()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.estado = 'archivado' and old.estado is distinct from 'archivado'
     and (select auth.uid()) is not null  -- service_role / backend sin usuario: permitido
     and not public.tiene_rol_org(new.organizacion_id, array['propietario', 'admin', 'entrenador']) then
    raise exception 'No tienes permiso para archivar alumnos' using errcode = '42501';
  end if;
  if new.organizacion_id <> old.organizacion_id then
    raise exception 'Un alumno no puede cambiar de organización' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_alumnos_validar_archivo
before update on public.alumnos
for each row execute function public.validar_archivo_alumno();

-- ============================================================
-- 3. AUDITORÍA AUTOMÁTICA
-- ============================================================
-- La escriben triggers (no el frontend), así no se puede falsificar.

create or replace function public.auditar_cambio()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_fila     jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_org      uuid  := (v_fila ->> 'organizacion_id')::uuid;
  v_cambios  jsonb := null;
begin
  if v_org is null and v_fila ? 'alumno_id' then
    select a.organizacion_id into v_org from public.alumnos a where a.id = (v_fila ->> 'alumno_id')::uuid;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('antes', o.value, 'despues', n.value))
      into v_cambios
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('actualizado_en');
    if v_cambios is null then return new; end if;  -- nada cambió
  end if;

  insert into public.registros_auditoria (organizacion_id, usuario_id, accion, tipo_entidad, entidad_id, metadatos)
  values (v_org, (select auth.uid()), tg_op, tg_table_name, (v_fila ->> 'id')::uuid, v_cambios);

  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'miembros_organizacion', 'alumnos', 'condiciones_alumno', 'mediciones',
    'plantillas', 'planes', 'sesiones', 'citas'
  ] loop
    execute format(
      'create trigger trg_%1$s_auditoria after insert or update or delete on public.%1$I
       for each row execute function public.auditar_cambio()', t);
  end loop;
end $$;

-- ============================================================
-- 4. OPERACIONES DE NEGOCIO (RPC)
-- ============================================================

-- Crea una organización y deja al usuario actual como propietario.
-- Uso: supabase.rpc('crear_organizacion', { p_nombre, p_slug })
create or replace function public.crear_organizacion(p_nombre text, p_slug text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;

  insert into public.organizaciones (nombre, slug)
  values (trim(p_nombre), lower(trim(p_slug)))
  returning id into v_id;

  insert into public.miembros_organizacion (organizacion_id, usuario_id, rol)
  values (v_id, (select auth.uid()), 'propietario');

  return v_id;
end;
$$;

-- Copia profunda plantilla → plan del alumno. El plan queda independiente.
-- Se ejecuta con los permisos del usuario (RLS aplica).
-- Uso: supabase.rpc('asignar_plantilla', { p_plantilla_id, p_alumno_id, p_fecha_inicio })
create or replace function public.asignar_plantilla(
  p_plantilla_id uuid,
  p_alumno_id    uuid,
  p_fecha_inicio date default current_date,
  p_nombre       text default null
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_plantilla public.plantillas;
  v_plan_id   uuid;
  v_dia       record;
  v_bloque    record;
  v_dia_id    uuid;
  v_bloque_id uuid;
begin
  select * into v_plantilla from public.plantillas where id = p_plantilla_id;
  if not found then
    raise exception 'Plantilla no encontrada' using errcode = 'P0002';
  end if;

  insert into public.planes (organizacion_id, alumno_id, creado_por, plantilla_origen_id,
                             nombre, descripcion, tipo_objetivo, fecha_inicio, estado)
  values (v_plantilla.organizacion_id, p_alumno_id, (select auth.uid()), v_plantilla.id,
          coalesce(p_nombre, v_plantilla.nombre), v_plantilla.descripcion,
          v_plantilla.tipo_objetivo, p_fecha_inicio, 'borrador')
  returning id into v_plan_id;

  for v_dia in
    select * from public.plantilla_dias where plantilla_id = p_plantilla_id order by orden
  loop
    insert into public.plan_dias (plan_id, nombre, orden, descripcion)
    values (v_plan_id, v_dia.nombre, v_dia.orden, v_dia.descripcion)
    returning id into v_dia_id;

    for v_bloque in
      select * from public.plantilla_bloques where plantilla_dia_id = v_dia.id order by orden
    loop
      insert into public.plan_bloques (plan_dia_id, nombre, tipo, orden, descanso_segundos, rondas, notas)
      values (v_dia_id, v_bloque.nombre, v_bloque.tipo, v_bloque.orden,
              v_bloque.descanso_segundos, v_bloque.rondas, v_bloque.notas)
      returning id into v_bloque_id;

      insert into public.plan_ejercicios (plan_bloque_id, ejercicio_id, orden, series, repeticiones,
                                          peso, unidad_peso, descanso_segundos, tempo, rir, rpe, notas)
      select v_bloque_id, pe.ejercicio_id, pe.orden, pe.series, pe.repeticiones,
             pe.peso, pe.unidad_peso, pe.descanso_segundos, pe.tempo, pe.rir, pe.rpe, pe.notas
      from public.plantilla_ejercicios pe
      where pe.plantilla_bloque_id = v_bloque.id;
    end loop;
  end loop;

  return v_plan_id;
end;
$$;

-- Crea una sesión a partir de un día del plan, con ejercicios y series
-- pre-cargadas según la prescripción (listas para registrar resultados).
-- Uso: supabase.rpc('iniciar_sesion_desde_plan', { p_plan_dia_id, p_programada_para })
create or replace function public.iniciar_sesion_desde_plan(
  p_plan_dia_id     uuid,
  p_programada_para timestamptz default now()
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_plan      public.planes;
  v_sesion_id uuid;
  v_pe        record;
  v_se_id     uuid;
begin
  select p.* into v_plan
  from public.plan_dias d join public.planes p on p.id = d.plan_id
  where d.id = p_plan_dia_id;
  if not found then
    raise exception 'Día de plan no encontrado' using errcode = 'P0002';
  end if;

  insert into public.sesiones (organizacion_id, alumno_id, plan_id, plan_dia_id, programada_para)
  values (v_plan.organizacion_id, v_plan.alumno_id, v_plan.id, p_plan_dia_id, p_programada_para)
  returning id into v_sesion_id;

  for v_pe in
    select pe.*, row_number() over (order by b.orden, pe.orden) as posicion
    from public.plan_ejercicios pe
    join public.plan_bloques b on b.id = pe.plan_bloque_id
    where b.plan_dia_id = p_plan_dia_id
  loop
    insert into public.sesion_ejercicios (sesion_id, plan_ejercicio_id, ejercicio_id, orden)
    values (v_sesion_id, v_pe.id, v_pe.ejercicio_id, v_pe.posicion)
    returning id into v_se_id;

    -- Usa plan_series si existen; si no, genera N series con la prescripción general.
    if exists (select 1 from public.plan_series where plan_ejercicio_id = v_pe.id) then
      insert into public.sesion_series (sesion_ejercicio_id, numero_serie, peso, unidad_peso)
      select v_se_id, ps.numero_serie, ps.peso, v_pe.unidad_peso
      from public.plan_series ps where ps.plan_ejercicio_id = v_pe.id;
    else
      insert into public.sesion_series (sesion_ejercicio_id, numero_serie, peso, unidad_peso)
      select v_se_id, n, v_pe.peso, v_pe.unidad_peso
      from generate_series(1, coalesce(v_pe.series, 1)) n;
    end if;
  end loop;

  return v_sesion_id;
end;
$$;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'organizaciones', 'perfiles', 'miembros_organizacion', 'alumnos', 'objetivos_alumno',
    'condiciones_alumno', 'notas_alumno', 'mediciones', 'fotos_progreso',
    'regiones_corporales', 'grupos_musculares', 'musculos', 'articulaciones',
    'ejercicios', 'equipamiento', 'ejercicios_musculos', 'ejercicios_equipamiento',
    'plantillas', 'plantilla_dias', 'plantilla_bloques', 'plantilla_ejercicios',
    'planes', 'plan_dias', 'plan_bloques', 'plan_ejercicios', 'plan_series',
    'sesiones', 'sesion_ejercicios', 'sesion_series', 'citas', 'registros_auditoria'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Perfiles ----------
create policy perfiles_ver on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or public.comparte_organizacion(id));
create policy perfiles_editar_propio on public.perfiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- Organizaciones (se crean con la RPC crear_organizacion) ----------
create policy organizaciones_ver on public.organizaciones for select to authenticated
  using (public.es_miembro_org(id));
create policy organizaciones_editar on public.organizaciones for update to authenticated
  using (public.tiene_rol_org(id, array['propietario', 'admin']))
  with check (public.tiene_rol_org(id, array['propietario', 'admin']));

-- ---------- Miembros ----------
create policy miembros_ver on public.miembros_organizacion for select to authenticated
  using (public.es_miembro_org(organizacion_id) or usuario_id = (select auth.uid()));
create policy miembros_gestionar on public.miembros_organizacion for all to authenticated
  using (public.tiene_rol_org(organizacion_id, array['propietario', 'admin']))
  with check (public.tiene_rol_org(organizacion_id, array['propietario', 'admin']));

-- ---------- Alumnos ----------
create policy alumnos_ver on public.alumnos for select to authenticated
  using (public.es_miembro_org(organizacion_id));
create policy alumnos_crear on public.alumnos for insert to authenticated
  with check (public.es_miembro_org(organizacion_id));
create policy alumnos_editar on public.alumnos for update to authenticated
  using (public.es_miembro_org(organizacion_id))
  with check (public.es_miembro_org(organizacion_id));
create policy alumnos_eliminar on public.alumnos for delete to authenticated
  using (public.tiene_rol_org(organizacion_id, array['propietario', 'admin']));

-- ---------- Tablas hijas del alumno ----------
create policy objetivos_acceso on public.objetivos_alumno for all to authenticated
  using (public.acceso_alumno(alumno_id)) with check (public.acceso_alumno(alumno_id));
create policy condiciones_acceso on public.condiciones_alumno for all to authenticated
  using (public.acceso_alumno(alumno_id)) with check (public.acceso_alumno(alumno_id));
create policy fotos_acceso on public.fotos_progreso for all to authenticated
  using (public.acceso_alumno(alumno_id)) with check (public.acceso_alumno(alumno_id));

-- Notas: todos las leen; solo el autor las edita.
create policy notas_ver on public.notas_alumno for select to authenticated
  using (public.acceso_alumno(alumno_id));
create policy notas_crear on public.notas_alumno for insert to authenticated
  with check (public.acceso_alumno(alumno_id) and autor_id = (select auth.uid()));
create policy notas_editar_autor on public.notas_alumno for update to authenticated
  using (autor_id = (select auth.uid()) and public.acceso_alumno(alumno_id))
  with check (autor_id = (select auth.uid()));

-- Mediciones: histórico inmutable (sin UPDATE). Un error se corrige
-- borrando (propietario/admin) y registrando de nuevo.
create policy mediciones_ver on public.mediciones for select to authenticated
  using (public.acceso_alumno(alumno_id));
create policy mediciones_crear on public.mediciones for insert to authenticated
  with check (public.acceso_alumno(alumno_id));
create policy mediciones_eliminar on public.mediciones for delete to authenticated
  using (exists (select 1 from public.alumnos a where a.id = alumno_id
                 and public.tiene_rol_org(a.organizacion_id, array['propietario', 'admin'])));

-- ---------- Catálogos globales (solo lectura; se cargan con seeds) ----------
create policy regiones_ver       on public.regiones_corporales for select to authenticated using (true);
create policy grupos_ver         on public.grupos_musculares  for select to authenticated using (true);
create policy musculos_ver       on public.musculos           for select to authenticated using (true);
create policy articulaciones_ver on public.articulaciones     for select to authenticated using (true);
create policy equipamiento_ver   on public.equipamiento       for select to authenticated using (true);

-- ---------- Ejercicios: globales + privados de la organización ----------
create policy ejercicios_ver on public.ejercicios for select to authenticated
  using (es_global or public.es_miembro_org(organizacion_id));
create policy ejercicios_crear on public.ejercicios for insert to authenticated
  with check (not es_global and public.es_miembro_org(organizacion_id));
create policy ejercicios_editar on public.ejercicios for update to authenticated
  using (not es_global and public.es_miembro_org(organizacion_id))
  with check (not es_global and public.es_miembro_org(organizacion_id));
create policy ejercicios_eliminar on public.ejercicios for delete to authenticated
  using (not es_global and public.tiene_rol_org(organizacion_id, array['propietario', 'admin']));

create policy ej_musculos_ver on public.ejercicios_musculos for select to authenticated
  using (public.ejercicio_utilizable(ejercicio_id));
create policy ej_musculos_gestionar on public.ejercicios_musculos for all to authenticated
  using (exists (select 1 from public.ejercicios e where e.id = ejercicio_id
                 and not e.es_global and public.es_miembro_org(e.organizacion_id)))
  with check (exists (select 1 from public.ejercicios e where e.id = ejercicio_id
                 and not e.es_global and public.es_miembro_org(e.organizacion_id)));

create policy ej_equipamiento_ver on public.ejercicios_equipamiento for select to authenticated
  using (public.ejercicio_utilizable(ejercicio_id));
create policy ej_equipamiento_gestionar on public.ejercicios_equipamiento for all to authenticated
  using (exists (select 1 from public.ejercicios e where e.id = ejercicio_id
                 and not e.es_global and public.es_miembro_org(e.organizacion_id)))
  with check (exists (select 1 from public.ejercicios e where e.id = ejercicio_id
                 and not e.es_global and public.es_miembro_org(e.organizacion_id)));

-- ---------- Plantillas ----------
create policy plantillas_acceso on public.plantillas for all to authenticated
  using (public.es_miembro_org(organizacion_id))
  with check (public.es_miembro_org(organizacion_id));
create policy plantilla_dias_acceso on public.plantilla_dias for all to authenticated
  using (public.acceso_plantilla(plantilla_id))
  with check (public.acceso_plantilla(plantilla_id));
create policy plantilla_bloques_acceso on public.plantilla_bloques for all to authenticated
  using (exists (select 1 from public.plantilla_dias d where d.id = plantilla_dia_id
                 and public.acceso_plantilla(d.plantilla_id)))
  with check (exists (select 1 from public.plantilla_dias d where d.id = plantilla_dia_id
                 and public.acceso_plantilla(d.plantilla_id)));
create policy plantilla_ejercicios_acceso on public.plantilla_ejercicios for all to authenticated
  using (exists (select 1 from public.plantilla_bloques b
                 join public.plantilla_dias d on d.id = b.plantilla_dia_id
                 where b.id = plantilla_bloque_id and public.acceso_plantilla(d.plantilla_id)))
  with check (public.ejercicio_utilizable(ejercicio_id)
              and exists (select 1 from public.plantilla_bloques b
                 join public.plantilla_dias d on d.id = b.plantilla_dia_id
                 where b.id = plantilla_bloque_id and public.acceso_plantilla(d.plantilla_id)));

-- ---------- Planes ----------
create policy planes_acceso on public.planes for all to authenticated
  using (public.es_miembro_org(organizacion_id))
  with check (public.es_miembro_org(organizacion_id));
create policy plan_dias_acceso on public.plan_dias for all to authenticated
  using (public.acceso_plan(plan_id)) with check (public.acceso_plan(plan_id));
create policy plan_bloques_acceso on public.plan_bloques for all to authenticated
  using (exists (select 1 from public.plan_dias d where d.id = plan_dia_id
                 and public.acceso_plan(d.plan_id)))
  with check (exists (select 1 from public.plan_dias d where d.id = plan_dia_id
                 and public.acceso_plan(d.plan_id)));
create policy plan_ejercicios_acceso on public.plan_ejercicios for all to authenticated
  using (exists (select 1 from public.plan_bloques b join public.plan_dias d on d.id = b.plan_dia_id
                 where b.id = plan_bloque_id and public.acceso_plan(d.plan_id)))
  with check (public.ejercicio_utilizable(ejercicio_id)
              and exists (select 1 from public.plan_bloques b join public.plan_dias d on d.id = b.plan_dia_id
                 where b.id = plan_bloque_id and public.acceso_plan(d.plan_id)));
create policy plan_series_acceso on public.plan_series for all to authenticated
  using (exists (select 1 from public.plan_ejercicios pe
                 join public.plan_bloques b on b.id = pe.plan_bloque_id
                 join public.plan_dias d on d.id = b.plan_dia_id
                 where pe.id = plan_ejercicio_id and public.acceso_plan(d.plan_id)))
  with check (exists (select 1 from public.plan_ejercicios pe
                 join public.plan_bloques b on b.id = pe.plan_bloque_id
                 join public.plan_dias d on d.id = b.plan_dia_id
                 where pe.id = plan_ejercicio_id and public.acceso_plan(d.plan_id)));

-- ---------- Sesiones ----------
create policy sesiones_acceso on public.sesiones for all to authenticated
  using (public.es_miembro_org(organizacion_id))
  with check (public.es_miembro_org(organizacion_id));
create policy sesion_ejercicios_acceso on public.sesion_ejercicios for all to authenticated
  using (public.acceso_sesion(sesion_id))
  with check (public.acceso_sesion(sesion_id) and public.ejercicio_utilizable(ejercicio_id));
create policy sesion_series_acceso on public.sesion_series for all to authenticated
  using (exists (select 1 from public.sesion_ejercicios se where se.id = sesion_ejercicio_id
                 and public.acceso_sesion(se.sesion_id)))
  with check (exists (select 1 from public.sesion_ejercicios se where se.id = sesion_ejercicio_id
                 and public.acceso_sesion(se.sesion_id)));

-- ---------- Citas ----------
create policy citas_acceso on public.citas for all to authenticated
  using (public.es_miembro_org(organizacion_id))
  with check (public.es_miembro_org(organizacion_id));

-- ---------- Auditoría: solo lectura para propietario/admin ----------
create policy auditoria_ver on public.registros_auditoria for select to authenticated
  using (public.tiene_rol_org(organizacion_id, array['propietario', 'admin']));

-- ============================================================
-- 6. PERMISOS
-- ============================================================

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- La auditoría solo la escriben los triggers.
revoke insert, update, delete on public.registros_auditoria from authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.es_miembro_org(uuid),
  public.tiene_rol_org(uuid, text[]),
  public.acceso_alumno(uuid),
  public.acceso_plantilla(uuid),
  public.acceso_plan(uuid),
  public.acceso_sesion(uuid),
  public.ejercicio_utilizable(uuid),
  public.comparte_organizacion(uuid),
  public.crear_organizacion(text, text),
  public.asignar_plantilla(uuid, uuid, date, text),
  public.iniciar_sesion_desde_plan(uuid, timestamptz)
to authenticated;
