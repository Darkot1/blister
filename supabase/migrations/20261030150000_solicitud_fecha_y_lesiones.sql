-- ============================================================
-- Solicitudes más completas
--   El formulario de la página pública pide también la fecha de nacimiento y,
--   aparte, lesiones o molestias. Al aceptar la solicitud nada se pierde: el
--   alumno se crea con su fecha de nacimiento, las lesiones quedan como condición
--   (la leen la ficha y los agentes) y lo que contó queda como nota en su perfil.
-- ============================================================

alter table public.solicitudes
  add column fecha_nacimiento date check (fecha_nacimiento is null or fecha_nacimiento >= date '1900-01-01'),
  add column lesiones text check (char_length(lesiones) <= 500);

comment on column public.solicitudes.fecha_nacimiento is 'Fecha de nacimiento que dejó quien pide entrenar (opcional).';
comment on column public.solicitudes.lesiones is 'Lesiones, dolores o condiciones de salud que contó (opcional).';

-- ------------------------------------------------------------
-- enviar_solicitud con los dos campos nuevos. La de 9 parámetros queda como
-- envoltorio para la versión publicada del formulario hasta que se despliegue esta.
-- ------------------------------------------------------------
create or replace function public.enviar_solicitud(
  p_slug             text,
  p_tipo             text,
  p_nombres          text,
  p_apellidos        text,
  p_correo           text,
  p_telefono         text,
  p_objetivo         text,
  p_mensaje          text,
  p_autoriza         boolean,
  p_fecha_nacimiento date,
  p_lesiones         text
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
  if char_length(coalesce(p_lesiones, '')) > 500 then
    raise exception 'Lo de lesiones es muy largo (máximo 500 caracteres).' using errcode = '22023';
  end if;
  if p_fecha_nacimiento is not null
     and (p_fecha_nacimiento > current_date - interval '5 years' or p_fecha_nacimiento < current_date - interval '100 years') then
    raise exception 'Revisa tu fecha de nacimiento.' using errcode = '22023';
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

  insert into public.solicitudes (organizacion_id, tipo, nombres, apellidos, correo, telefono, objetivo, mensaje,
                                  fecha_nacimiento, lesiones, autoriza_datos_en)
  values (
    v_org, p_tipo, trim(p_nombres), trim(coalesce(p_apellidos, '')), v_correo, v_telefono,
    case when p_tipo = 'registro' then nullif(p_objetivo, '') end,
    nullif(trim(coalesce(p_mensaje, '')), ''),
    case when p_tipo = 'registro' then p_fecha_nacimiento end,
    case when p_tipo = 'registro' then nullif(trim(coalesce(p_lesiones, '')), '') end,
    now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.enviar_solicitud(
  p_slug text, p_tipo text, p_nombres text, p_apellidos text, p_correo text,
  p_telefono text, p_objetivo text, p_mensaje text, p_autoriza boolean
)
returns uuid
language sql volatile security definer set search_path = ''
as $$
  select public.enviar_solicitud(p_slug, p_tipo, p_nombres, p_apellidos, p_correo, p_telefono, p_objetivo, p_mensaje,
                                 p_autoriza, null::date, null::text);
$$;

revoke execute on function public.enviar_solicitud(text, text, text, text, text, text, text, text, boolean, date, text) from public;
grant execute on function public.enviar_solicitud(text, text, text, text, text, text, text, text, boolean, date, text) to anon, authenticated;

-- ------------------------------------------------------------
-- Aceptar: además del alumno y su objetivo, su fecha de nacimiento, sus
-- lesiones (como condición) y una nota con todo lo que contó.
-- ------------------------------------------------------------
create or replace function public.aceptar_solicitud(p_solicitud_id uuid)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_s      public.solicitudes;
  v_alumno uuid;
  v_nota   text;
begin
  select * into v_s from public.solicitudes where id = p_solicitud_id for update;
  if not found or not public.es_miembro_org(v_s.organizacion_id) then
    raise exception 'Solicitud no encontrada.' using errcode = 'P0002';
  end if;
  if v_s.estado = 'aceptada' and v_s.alumno_id is not null then
    return v_s.alumno_id;
  end if;

  insert into public.alumnos (organizacion_id, nombres, apellidos, correo, telefono, fecha_nacimiento)
  values (v_s.organizacion_id, v_s.nombres, v_s.apellidos, v_s.correo, v_s.telefono, v_s.fecha_nacimiento)
  returning id into v_alumno;

  if v_s.objetivo is not null then
    insert into public.objetivos_alumno (alumno_id, tipo, nombre, es_principal)
    values (v_alumno, v_s.objetivo, case v_s.objetivo
      when 'hipertrofia' then 'Hipertrofia'      when 'perdida_grasa' then 'Pérdida de grasa'
      when 'fuerza' then 'Fuerza'                when 'movilidad' then 'Movilidad'
      when 'resistencia' then 'Resistencia'      when 'tecnica' then 'Técnica'
      when 'rehabilitacion' then 'Rehabilitación' else 'Salud general' end, true);
  end if;

  -- Contado por el alumno, sin valorar: el entrenador la precisa (tipo, zona, severidad) en su ficha.
  if v_s.lesiones is not null then
    insert into public.condiciones_alumno (alumno_id, tipo, descripcion, notas_entrenador)
    values (v_alumno, 'otro', v_s.lesiones, 'Contado por el alumno en su solicitud; falta valorarlo.');
  end if;

  v_nota := concat_ws(chr(10) || chr(10),
    case when v_s.lesiones is not null then 'Lesiones o molestias: ' || v_s.lesiones end,
    v_s.mensaje);
  if v_nota <> '' and (select auth.uid()) is not null then
    insert into public.notas_alumno (alumno_id, autor_id, contenido)
    values (v_alumno, (select auth.uid()), 'De su solicitud en la página:' || chr(10) || v_nota);
  end if;

  update public.solicitudes set estado = 'aceptada', alumno_id = v_alumno where id = p_solicitud_id;
  return v_alumno;
end;
$$;

-- ------------------------------------------------------------
-- El aviso de Telegram muestra también la edad y las lesiones.
-- ------------------------------------------------------------
create or replace function public.texto_solicitud_telegram(p_s public.solicitudes)
returns text language sql stable security definer set search_path = ''
as $$
  select
    case p_s.tipo when 'registro' then '🙋 <b>Nueva solicitud para entrenar</b>' else '✉️ <b>Nuevo mensaje desde tu página</b>' end
    || chr(10) || chr(10) || '<b>' || public.html_telegram(trim(p_s.nombres || ' ' || p_s.apellidos)) || '</b>'
    || coalesce(', ' || extract(year from age(current_date, p_s.fecha_nacimiento))::int || ' años', '')
    || coalesce(chr(10) || 'Objetivo: ' || case p_s.objetivo
         when 'hipertrofia' then 'Ganar músculo'     when 'perdida_grasa' then 'Perder grasa'
         when 'fuerza' then 'Fuerza'                 when 'movilidad' then 'Movilidad'
         when 'resistencia' then 'Resistencia'       when 'tecnica' then 'Técnica'
         when 'rehabilitacion' then 'Rehabilitación' when 'salud_general' then 'Salud general' end, '')
    || coalesce(chr(10) || '🩹 ' || public.html_telegram(p_s.lesiones), '')
    || coalesce(chr(10) || '📞 ' || public.html_telegram(p_s.telefono), '')
    || coalesce(chr(10) || '📧 ' || public.html_telegram(p_s.correo), '')
    || coalesce(chr(10) || chr(10) || '«' || public.html_telegram(left(p_s.mensaje, 600)) || '»', '')
    || coalesce(chr(10) || chr(10) || rtrim(public.secreto_vault('app_url'), '/') || '/alumnos/solicitudes', '');
$$;

revoke execute on function public.texto_solicitud_telegram(public.solicitudes) from authenticated, anon, public;
