-- ============================================================
-- guardar_plan: no pisar lo que ya se apuntó en una sesión sin empezar
--
--   Una serie se guarda al tocarla, pero la sesión solo pasa a "en curso" cuando
--   una serie se marca como hecha. Una sesión agendada podía tener repeticiones o
--   RPE apuntados sin estar iniciada, y guardar el plan la volvía a llenar desde
--   cero. Ahora solo se vuelven a llenar las sesiones en las que nadie tocó ninguna
--   serie; las demás conservan lo suyo (y su copia de la prescripción).
--   Misma firma y permisos que en 20261103120000.
-- ============================================================

create or replace function public.guardar_plan(
  p_plan_id       uuid,
  p_nombre        text,
  p_descripcion   text,
  p_tipo_objetivo text,
  p_dias          jsonb
)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_estado     text;
  v_dia        record;
  v_bloque     record;
  v_ejercicio  record;
  v_dia_id     uuid;
  v_bloque_id  uuid;
  v_ej_id      uuid;
  v_dias       uuid[] := '{}';
  v_bloques    uuid[] := '{}';
  v_ejercicios uuid[] := '{}';
  v_pendientes uuid[];
  v_sesion     record;
begin
  if jsonb_typeof(p_dias) is distinct from 'array' or jsonb_array_length(p_dias) = 0 then
    raise exception 'El plan debe tener al menos un día' using errcode = '22023';
  end if;

  select estado into v_estado from public.planes where id = p_plan_id for update;
  if not found then
    raise exception 'Plan no encontrado' using errcode = 'P0002';
  end if;
  if v_estado not in ('borrador', 'activo') then
    raise exception 'Solo se editan planes en borrador o activos' using errcode = 'P0001', hint = 'plan_cerrado';
  end if;

  -- Un día con sesiones agendadas o en curso no se puede quitar: primero hay que moverlas o cancelarlas.
  if exists (
    select 1
    from public.sesiones s
    join public.plan_dias d on d.id = s.plan_dia_id
    where d.plan_id = p_plan_id
      and s.estado in ('programada', 'en_curso')
      and not exists (select 1 from jsonb_array_elements(p_dias) x where x->>'id' = d.id::text)
  ) then
    raise exception 'Un día que quitaste tiene sesiones agendadas' using errcode = 'P0001', hint = 'dia_con_sesiones';
  end if;

  -- Sesiones agendadas que aún no empiezan: se vuelven a llenar con la versión nueva.
  select coalesce(array_agg(s.id), '{}') into v_pendientes
  from public.sesiones s
  where s.plan_id = p_plan_id
    and s.estado = 'programada'
    and s.iniciada_en is null
    and s.plan_dia_id is not null
    -- Ni una serie tocada: hecha, con algo apuntado (reps, RPE, RIR, duración, notas) o añadida a mano.
    and not exists (
      select 1 from public.sesion_ejercicios se
      join public.sesion_series ss on ss.sesion_ejercicio_id = se.id
      where se.sesion_id = s.id
        and (ss.completada or ss.repeticiones is not null or ss.rpe is not null or ss.rir is not null
             or ss.duracion_segundos is not null or ss.notas is not null
             or ss.numero_serie > coalesce((se.prescripcion->>'series')::integer, 1))
    );
  delete from public.sesion_ejercicios
   where sesion_id = any(v_pendientes) and plan_ejercicio_id is not null;

  update public.planes
     set nombre = p_nombre, descripcion = p_descripcion, tipo_objetivo = p_tipo_objetivo
   where id = p_plan_id;

  for v_dia in
    select d.valor, d.posicion from jsonb_array_elements(p_dias) with ordinality as d(valor, posicion)
  loop
    v_dia_id := null;
    if v_dia.valor ? 'id' then
      update public.plan_dias
         set nombre = v_dia.valor->>'nombre', orden = v_dia.posicion,
             descripcion = nullif(v_dia.valor->>'descripcion', '')
       where id = (v_dia.valor->>'id')::uuid and plan_id = p_plan_id
      returning id into v_dia_id;
    end if;
    if v_dia_id is null then
      insert into public.plan_dias (plan_id, nombre, orden, descripcion)
      values (p_plan_id, v_dia.valor->>'nombre', v_dia.posicion, nullif(v_dia.valor->>'descripcion', ''))
      returning id into v_dia_id;
    end if;
    v_dias := v_dias || v_dia_id;

    for v_bloque in
      select b.valor, b.posicion
      from jsonb_array_elements(coalesce(v_dia.valor->'bloques', '[]'::jsonb)) with ordinality as b(valor, posicion)
    loop
      v_bloque_id := null;
      if v_bloque.valor ? 'id' then
        update public.plan_bloques b
           set plan_dia_id = v_dia_id, nombre = v_bloque.valor->>'nombre', tipo = v_bloque.valor->>'tipo',
               orden = v_bloque.posicion, descanso_segundos = (v_bloque.valor->>'descanso_segundos')::integer,
               rondas = (v_bloque.valor->>'rondas')::integer, notas = nullif(v_bloque.valor->>'notas', '')
          from public.plan_dias d
         where b.id = (v_bloque.valor->>'id')::uuid and d.id = b.plan_dia_id and d.plan_id = p_plan_id
        returning b.id into v_bloque_id;
      end if;
      if v_bloque_id is null then
        insert into public.plan_bloques (plan_dia_id, nombre, tipo, orden, descanso_segundos, rondas, notas)
        values (v_dia_id, v_bloque.valor->>'nombre', v_bloque.valor->>'tipo', v_bloque.posicion,
                (v_bloque.valor->>'descanso_segundos')::integer, (v_bloque.valor->>'rondas')::integer,
                nullif(v_bloque.valor->>'notas', ''))
        returning id into v_bloque_id;
      end if;
      v_bloques := v_bloques || v_bloque_id;

      for v_ejercicio in
        select e.valor, e.posicion
        from jsonb_array_elements(coalesce(v_bloque.valor->'ejercicios', '[]'::jsonb)) with ordinality as e(valor, posicion)
      loop
        v_ej_id := null;
        if v_ejercicio.valor ? 'id' then
          update public.plan_ejercicios pe
             set plan_bloque_id = v_bloque_id, ejercicio_id = (v_ejercicio.valor->>'ejercicio_id')::uuid,
                 orden = v_ejercicio.posicion, series = (v_ejercicio.valor->>'series')::integer,
                 repeticiones = nullif(v_ejercicio.valor->>'repeticiones', ''),
                 peso = (v_ejercicio.valor->>'peso')::numeric,
                 unidad_peso = coalesce(v_ejercicio.valor->>'unidad_peso', 'kg'),
                 descanso_segundos = (v_ejercicio.valor->>'descanso_segundos')::integer,
                 tempo = nullif(v_ejercicio.valor->>'tempo', ''),
                 rir = (v_ejercicio.valor->>'rir')::numeric, rpe = (v_ejercicio.valor->>'rpe')::numeric,
                 notas = nullif(v_ejercicio.valor->>'notas', '')
            from public.plan_bloques b
            join public.plan_dias d on d.id = b.plan_dia_id
           where pe.id = (v_ejercicio.valor->>'id')::uuid and b.id = pe.plan_bloque_id and d.plan_id = p_plan_id
          returning pe.id into v_ej_id;
        end if;
        if v_ej_id is null then
          insert into public.plan_ejercicios (plan_bloque_id, ejercicio_id, orden, series, repeticiones,
                                              peso, unidad_peso, descanso_segundos, tempo, rir, rpe, notas)
          values (v_bloque_id, (v_ejercicio.valor->>'ejercicio_id')::uuid, v_ejercicio.posicion,
                  (v_ejercicio.valor->>'series')::integer, nullif(v_ejercicio.valor->>'repeticiones', ''),
                  (v_ejercicio.valor->>'peso')::numeric, coalesce(v_ejercicio.valor->>'unidad_peso', 'kg'),
                  (v_ejercicio.valor->>'descanso_segundos')::integer, nullif(v_ejercicio.valor->>'tempo', ''),
                  (v_ejercicio.valor->>'rir')::numeric, (v_ejercicio.valor->>'rpe')::numeric,
                  nullif(v_ejercicio.valor->>'notas', ''))
          returning id into v_ej_id;
        end if;
        v_ejercicios := v_ejercicios || v_ej_id;
      end loop;
    end loop;
  end loop;

  -- Lo que ya no viene se borra (las sesiones hechas conservan su copia de la prescripción).
  delete from public.plan_ejercicios pe
   using public.plan_bloques b, public.plan_dias d
   where b.id = pe.plan_bloque_id and d.id = b.plan_dia_id and d.plan_id = p_plan_id
     and pe.id <> all(v_ejercicios);
  delete from public.plan_bloques b
   using public.plan_dias d
   where d.id = b.plan_dia_id and d.plan_id = p_plan_id
     and b.id <> all(v_bloques);
  delete from public.plan_dias
   where plan_id = p_plan_id and id <> all(v_dias);

  for v_sesion in
    select id, plan_dia_id from public.sesiones where id = any(v_pendientes)
  loop
    perform public.rellenar_sesion_desde_dia(v_sesion.id, v_sesion.plan_dia_id);
  end loop;
end;
$$;
