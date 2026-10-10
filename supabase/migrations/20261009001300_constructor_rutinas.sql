-- ============================================================
-- Constructor de rutinas (milestone 3)
--   guardar_plantilla: guarda una rutina completa (días → bloques → ejercicios)
--                      en una sola transacción. Crea o reemplaza el contenido.
--   activar_plan:      deja un plan como el activo del alumno; el anterior
--                      queda completado (solo puede haber uno activo).
-- Ambas son security invoker: RLS decide qué puede tocar el usuario.
-- ============================================================

-- p_dias: [{ nombre, descripcion?, bloques: [{ nombre, tipo, rondas?, descanso_segundos?, notas?,
--            ejercicios: [{ ejercicio_id, series?, repeticiones?, peso?, unidad_peso?,
--                           descanso_segundos?, tempo?, rir?, rpe?, notas? }] }] }]
-- El orden lo da la posición en cada arreglo.
create or replace function public.guardar_plantilla(
  p_plantilla_id    uuid,
  p_organizacion_id uuid,
  p_nombre          text,
  p_descripcion     text,
  p_tipo_objetivo   text,
  p_dias            jsonb
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_id        uuid := p_plantilla_id;
  v_dia       record;
  v_bloque    record;
  v_dia_id    uuid;
  v_bloque_id uuid;
begin
  if jsonb_typeof(p_dias) is distinct from 'array' then
    raise exception 'La rutina debe tener una lista de días' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.plantillas (organizacion_id, creado_por, nombre, descripcion, tipo_objetivo, estado)
    values (p_organizacion_id, (select auth.uid()), p_nombre, p_descripcion, p_tipo_objetivo, 'activo')
    returning id into v_id;
  else
    update public.plantillas
       set nombre = p_nombre, descripcion = p_descripcion, tipo_objetivo = p_tipo_objetivo
     where id = v_id;
    if not found then
      raise exception 'Rutina no encontrada' using errcode = 'P0002';
    end if;
    -- Las plantillas son prescripción reutilizable, no historial: su contenido se reemplaza.
    -- Los planes ya asignados son copias y no se tocan.
    delete from public.plantilla_dias where plantilla_id = v_id;
  end if;

  for v_dia in
    select d.valor, d.posicion from jsonb_array_elements(p_dias) with ordinality as d(valor, posicion)
  loop
    insert into public.plantilla_dias (plantilla_id, nombre, orden, descripcion)
    values (v_id, v_dia.valor->>'nombre', v_dia.posicion, nullif(v_dia.valor->>'descripcion', ''))
    returning id into v_dia_id;

    for v_bloque in
      select b.valor, b.posicion
      from jsonb_array_elements(coalesce(v_dia.valor->'bloques', '[]'::jsonb)) with ordinality as b(valor, posicion)
    loop
      insert into public.plantilla_bloques (plantilla_dia_id, nombre, tipo, orden, descanso_segundos, rondas, notas)
      values (v_dia_id, v_bloque.valor->>'nombre', v_bloque.valor->>'tipo', v_bloque.posicion,
              (v_bloque.valor->>'descanso_segundos')::integer, (v_bloque.valor->>'rondas')::integer,
              nullif(v_bloque.valor->>'notas', ''))
      returning id into v_bloque_id;

      insert into public.plantilla_ejercicios (plantilla_bloque_id, ejercicio_id, orden, series, repeticiones,
                                               peso, unidad_peso, descanso_segundos, tempo, rir, rpe, notas)
      select v_bloque_id, (e.valor->>'ejercicio_id')::uuid, e.posicion, (e.valor->>'series')::integer,
             nullif(e.valor->>'repeticiones', ''), (e.valor->>'peso')::numeric,
             coalesce(e.valor->>'unidad_peso', 'kg'), (e.valor->>'descanso_segundos')::integer,
             nullif(e.valor->>'tempo', ''), (e.valor->>'rir')::numeric, (e.valor->>'rpe')::numeric,
             nullif(e.valor->>'notas', '')
      from jsonb_array_elements(coalesce(v_bloque.valor->'ejercicios', '[]'::jsonb)) with ordinality as e(valor, posicion);
    end loop;
  end loop;

  return v_id;
end;
$$;

create or replace function public.activar_plan(p_plan_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_alumno_id uuid;
begin
  select alumno_id into v_alumno_id from public.planes where id = p_plan_id;
  if not found then
    raise exception 'Plan no encontrado' using errcode = 'P0002';
  end if;

  update public.planes set estado = 'completado'
   where alumno_id = v_alumno_id and estado = 'activo' and id <> p_plan_id;
  update public.planes set estado = 'activo' where id = p_plan_id;
end;
$$;

revoke execute on function public.guardar_plantilla(uuid, uuid, text, text, text, jsonb) from public, anon;
revoke execute on function public.activar_plan(uuid) from public, anon;
grant execute on function public.guardar_plantilla(uuid, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.activar_plan(uuid) to authenticated;
