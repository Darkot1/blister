-- ============================================================
-- Relaciones de ejercicios en una transacción e índices que faltaban
--   1. Al editar un ejercicio propio, sus músculos y equipamiento se reemplazan en una
--      sola transacción: antes se borraban y luego se insertaban, y si el insert fallaba
--      el ejercicio se quedaba sin músculos (mapa corporal y sugerencias rotos).
--      security invoker: aplican las políticas de ejercicios_musculos/equipamiento, así que
--      un ejercicio global sigue sin poder tocarse; cualquier rechazo deshace todo.
--   2. Índices para las consultas y los borrados en cascada más frecuentes (auditoría de
--      rendimiento y advisors de Supabase).
-- ============================================================

create or replace function public.reemplazar_relaciones_ejercicio(
  p_ejercicio_id uuid,
  p_musculos     jsonb,   -- [{ "id": uuid, "rol": "principal" | "secundario" | "estabilizador" }]
  p_equipos      uuid[]
)
returns void
language plpgsql volatile security invoker set search_path = ''
as $$
begin
  if jsonb_typeof(p_musculos) <> 'array' or jsonb_array_length(p_musculos) = 0 then
    raise exception 'Elige al menos un músculo.' using errcode = '22023';
  end if;

  delete from public.ejercicios_musculos where ejercicio_id = p_ejercicio_id;
  delete from public.ejercicios_equipamiento where ejercicio_id = p_ejercicio_id;

  insert into public.ejercicios_musculos (ejercicio_id, musculo_id, rol)
  select p_ejercicio_id, (m->>'id')::uuid, m->>'rol'
  from jsonb_array_elements(p_musculos) m;

  insert into public.ejercicios_equipamiento (ejercicio_id, equipamiento_id)
  select p_ejercicio_id, e from unnest(coalesce(p_equipos, '{}'::uuid[])) e;
end;
$$;

revoke execute on function public.reemplazar_relaciones_ejercicio(uuid, jsonb, uuid[]) from public, anon;
grant execute on function public.reemplazar_relaciones_ejercicio(uuid, jsonb, uuid[]) to authenticated;

-- ---------- Índices ----------
-- planesActivos: sesiones de varios planes ordenadas por fecha (calendario, sesiones, inicio, oficina).
create index if not exists sesiones_plan_programada_idx on public.sesiones(plan_id, programada_para desc);
-- FK con on delete set null: sin índice, reescribir un plan recorre toda la tabla de sesiones.
create index if not exists sesiones_plan_dia_idx on public.sesiones(plan_dia_id) where plan_dia_id is not null;
-- terminarSesion / reabrirSesion filtran citas por su sesión.
create index if not exists citas_sesion_idx on public.citas(sesion_id) where sesion_id is not null;
-- Autores (borrado de perfiles y listados por autor).
create index if not exists notas_alumno_autor_idx on public.notas_alumno(autor_id);
create index if not exists juntas_autor_idx on public.juntas(autor_id) where autor_id is not null;
