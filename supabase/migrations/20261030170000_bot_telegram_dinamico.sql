-- ============================================================
-- Bot de Telegram más claro y más dinámico
--   · Mensajes con estructura: título, datos en bloques y el texto de la
--     persona citado aparte.
--   · Los avisos se editan en su sitio: al aceptar una solicitud o marcar una
--     cita, el mismo mensaje cambia y dice qué se hizo (con los siguientes
--     pasos como botones: ver ficha, registrar peso, escribir por WhatsApp…).
--   · Navegación con botones: menú, día a día (◀ ▶), semana a semana y ficha
--     de alumno, todo editando el mismo mensaje.
--   · Flujos guiados: «Nota» o «Peso» y el bot espera tu siguiente mensaje.
--     Escribir el nombre de un alumno muestra su ficha.
-- ============================================================

-- Lo que el bot espera del usuario tras tocar «Nota» o «Peso».
alter table public.conexiones_telegram
  add column esperando jsonb,
  add column esperando_hasta timestamptz;

comment on column public.conexiones_telegram.esperando is 'Acción a medias en el chat: {"tipo": "nota"|"peso", "alumno": uuid}.';

-- ------------------------------------------------------------
-- Piezas de formato
-- ------------------------------------------------------------

/** "jue 30 oct". */
create or replace function public.fecha_corta_tg(p_dia date)
returns text language sql immutable set search_path = ''
as $$
  select (array['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])[extract(isodow from p_dia)::int]
      || ' ' || extract(day from p_dia)
      || ' ' || (array['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])[extract(month from p_dia)::int];
$$;

/** "jueves 30 de octubre". */
create or replace function public.fecha_larga_tg(p_dia date)
returns text language sql immutable set search_path = ''
as $$
  select (array['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'])[extract(isodow from p_dia)::int]
      || ' ' || extract(day from p_dia) || ' de '
      || (array['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'])[extract(month from p_dia)::int];
$$;

/** Botón que abre un enlace. */
create or replace function public.boton_url_tg(p_texto text, p_url text)
returns jsonb language sql immutable set search_path = ''
as $$ select jsonb_build_object('text', p_texto, 'url', p_url); $$;

/** wa.me del teléfono (10 dígitos que empiezan por 3: celular de Colombia sin indicativo). Null sin teléfono. */
create or replace function public.whatsapp_tg(p_telefono text)
returns text language sql immutable set search_path = ''
as $$
  select case when d = '' then null
              when length(d) = 10 and d like '3%' then 'https://wa.me/57' || d
              else 'https://wa.me/' || d end
  from (select regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g') as d) x;
$$;

/** Enlace a una ruta de la app, si se conoce su dirección. */
create or replace function public.url_app_tg(p_ruta text)
returns text language sql stable security definer set search_path = ''
as $$ select rtrim(public.secreto_vault('app_url'), '/') || p_ruta; $$;

/** Cambia un mensaje ya enviado (texto y botones). Sin botones, se quitan. */
create or replace function public.editar_telegram(p_chat_id bigint, p_mensaje_id bigint, p_texto text, p_teclado jsonb default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_chat_id is null or p_mensaje_id is null then return; end if;
  perform public.telegram_api('editMessageText', jsonb_build_object(
    'chat_id', p_chat_id, 'message_id', p_mensaje_id, 'text', left(p_texto, 4000), 'parse_mode', 'HTML',
    'link_preview_options', jsonb_build_object('is_disabled', true),
    'reply_markup', jsonb_build_object('inline_keyboard', coalesce(p_teclado, '[]'::jsonb))));
end;
$$;

/** Envía o, si viene de un botón, cambia el mensaje en su sitio. */
create or replace function public.responder_telegram(p_chat_id bigint, p_mensaje_id bigint, p_texto text, p_teclado jsonb default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_mensaje_id is null then
    perform public.enviar_telegram(p_chat_id, p_texto, p_teclado);
  else
    perform public.editar_telegram(p_chat_id, p_mensaje_id, p_texto, p_teclado);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Menú
-- ------------------------------------------------------------
create or replace function public.teclado_menu_tg(p_org uuid, p_zona text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_array(
      jsonb_build_array(
        public.boton_telegram('📅 Hoy', 'd:' || (now() at time zone p_zona)::date),
        public.boton_telegram('📆 Semana', 'w:' || (now() at time zone p_zona)::date)),
      jsonb_build_array(public.boton_telegram(
        '📥 Solicitudes' || coalesce(' (' || nullif((select count(*) from public.solicitudes s
                                                    where s.organizacion_id = p_org and s.estado = 'nueva'), 0) || ')', ''),
        'm:sol')))
    || case when public.url_app_tg('/inicio') is null then '[]'::jsonb
            else jsonb_build_array(jsonb_build_array(public.boton_url_tg('🔗 Abrir Blister', public.url_app_tg('/inicio')))) end;
$$;

create or replace function public.texto_menu_tg(p_usuario uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select '👋 <b>Hola' || coalesce(', ' || public.html_telegram(nullif((select p.nombres from public.perfiles p where p.id = p_usuario), '')), '') || '</b>'
    || chr(10) || chr(10) || 'Toca un botón o escribe el <b>nombre de un alumno</b> para ver su ficha.'
    || chr(10) || chr(10) || '<i>Atajos</i>'
    || chr(10) || '<code>/nota Ana: le molestó la rodilla</code>'
    || chr(10) || '<code>/peso Ana 64,5</code>';
$$;

-- ------------------------------------------------------------
-- Día y semana
-- ------------------------------------------------------------

/** Las citas vigentes del día, una por bloque: hora en negrita, alumno y, debajo, tipo y día del plan. */
create or replace function public.bloques_citas_tg(p_usuario uuid, p_dia date, p_zona text)
returns text language sql stable security definer set search_path = ''
as $$
  select string_agg(
           '<b>' || public.hora_telegram(c.inicia_en, p_zona) || '</b> — ' || public.html_telegram(trim(a.nombres || ' ' || a.apellidos))
           || case when c.estado = 'confirmada' then ' 👍' else '' end
           || chr(10) || '<i>' || public.tipo_cita_telegram(c.tipo) || coalesce(' · ' || public.html_telegram(d.nombre), '') || '</i>',
           chr(10) || chr(10) order by c.inicia_en)
  from public.citas c
  join public.alumnos a on a.id = c.alumno_id
  left join public.sesiones s on s.id = c.sesion_id
  left join public.plan_dias d on d.id = s.plan_dia_id
  where c.entrenador_id = p_usuario and c.estado in ('programada', 'confirmada')
    and (c.inicia_en at time zone p_zona)::date = p_dia;
$$;

create or replace function public.vista_dia_tg(p_usuario uuid, p_org uuid, p_dia date, p_zona text, p_titulo text default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy     date := (now() at time zone p_zona)::date;
  v_citas   int;
  v_conf    int;
  v_nombre  text;
begin
  select count(*), count(*) filter (where c.estado = 'confirmada') into v_citas, v_conf
  from public.citas c
  where c.entrenador_id = p_usuario and c.estado in ('programada', 'confirmada') and (c.inicia_en at time zone p_zona)::date = p_dia;

  v_nombre := case p_dia - v_hoy when 0 then 'Hoy' when 1 then 'Mañana' when -1 then 'Ayer' else null end;
  return jsonb_build_object(
    'texto',
      coalesce(p_titulo, '📅 <b>' || coalesce(v_nombre || ' · ', '') || public.fecha_larga_tg(p_dia) || '</b>')
      || chr(10) || '<i>' || case when v_citas = 0 then 'Sin citas'
                                  else v_citas || ' cita' || case when v_citas = 1 then '' else 's' end
                                       || case when v_conf > 0 then ' · ' || v_conf || ' confirmada' || case when v_conf = 1 then '' else 's' end else '' end
                             end || '</i>'
      || chr(10) || chr(10) || coalesce(public.bloques_citas_tg(p_usuario, p_dia, p_zona), 'Día libre. 🙌'),
    'teclado', jsonb_build_array(
      jsonb_build_array(
        public.boton_telegram('◀ ' || public.fecha_corta_tg(p_dia - 1), 'd:' || (p_dia - 1)),
        public.boton_telegram(case when p_dia = v_hoy then '🔄' else '📅 Hoy' end, 'd:' || v_hoy),
        public.boton_telegram(public.fecha_corta_tg(p_dia + 1) || ' ▶', 'd:' || (p_dia + 1))),
      jsonb_build_array(public.boton_telegram('📆 Semana', 'w:' || p_dia), public.boton_telegram('☰ Menú', 'm:menu'))));
end;
$$;

create or replace function public.vista_semana_tg(p_usuario uuid, p_desde date, p_zona text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hasta date := p_desde + 6;
  v_total int;
  v_dias  text;
begin
  select count(*) into v_total from public.citas c
  where c.entrenador_id = p_usuario and c.estado in ('programada', 'confirmada')
    and (c.inicia_en at time zone p_zona)::date between p_desde and v_hasta;

  select string_agg(
           '<b>' || upper(left(public.fecha_corta_tg(d::date), 1)) || substring(public.fecha_corta_tg(d::date) from 2) || '</b>'
           || coalesce(chr(10) || (select string_agg(
                  public.hora_telegram(c.inicia_en, p_zona) || ' — ' || public.html_telegram(trim(a.nombres || ' ' || a.apellidos))
                  || case when c.estado = 'confirmada' then ' 👍' else '' end, chr(10) order by c.inicia_en)
                from public.citas c join public.alumnos a on a.id = c.alumno_id
                where c.entrenador_id = p_usuario and c.estado in ('programada', 'confirmada')
                  and (c.inicia_en at time zone p_zona)::date = d::date), ' · <i>libre</i>'),
           chr(10) || chr(10) order by d)
    into v_dias
  from generate_series(p_desde, v_hasta, interval '1 day') d;

  return jsonb_build_object(
    'texto', '📆 <b>Semana · ' || public.fecha_corta_tg(p_desde) || ' al ' || public.fecha_corta_tg(v_hasta) || '</b>'
      || chr(10) || '<i>' || case when v_total = 0 then 'Sin citas' else v_total || ' cita' || case when v_total = 1 then '' else 's' end end || '</i>'
      || chr(10) || chr(10) || v_dias,
    'teclado', jsonb_build_array(
      jsonb_build_array(public.boton_telegram('◀ Semana anterior', 'w:' || (p_desde - 7)), public.boton_telegram('Siguiente ▶', 'w:' || (p_desde + 7))),
      jsonb_build_array(public.boton_telegram('📅 Hoy', 'd:' || (now() at time zone p_zona)::date), public.boton_telegram('☰ Menú', 'm:menu'))));
end;
$$;

-- ------------------------------------------------------------
-- Solicitudes
-- ------------------------------------------------------------
create or replace function public.texto_solicitud_telegram(p_s public.solicitudes)
returns text language sql stable security definer set search_path = ''
as $$
  select
    case p_s.tipo when 'registro' then '🙋 <b>Quiere entrenar contigo</b>' else '✉️ <b>Te escribieron desde tu página</b>' end
    || chr(10) || chr(10) || '👤 <b>' || public.html_telegram(trim(p_s.nombres || ' ' || p_s.apellidos)) || '</b>'
    || coalesce(' · ' || extract(year from age(current_date, p_s.fecha_nacimiento))::int || ' años', '')
    || coalesce(chr(10) || '🎯 ' || case p_s.objetivo
         when 'hipertrofia' then 'Ganar músculo'     when 'perdida_grasa' then 'Perder grasa'
         when 'fuerza' then 'Fuerza'                 when 'movilidad' then 'Movilidad'
         when 'resistencia' then 'Resistencia'       when 'tecnica' then 'Técnica'
         when 'rehabilitacion' then 'Rehabilitación' when 'salud_general' then 'Salud general' end, '')
    || coalesce(chr(10) || chr(10) || '🩹 <b>Lesiones o molestias</b>' || chr(10) || '<blockquote>' || public.html_telegram(p_s.lesiones) || '</blockquote>', '')
    || coalesce(chr(10) || chr(10) || '💬 <b>' || case p_s.tipo when 'registro' then 'Lo que cuenta' else 'Su mensaje' end || '</b>'
                || chr(10) || '<blockquote>' || public.html_telegram(left(p_s.mensaje, 700)) || '</blockquote>', '')
    || chr(10) || chr(10) || concat_ws(chr(10),
         '📞 ' || public.html_telegram(p_s.telefono),
         '📧 ' || public.html_telegram(p_s.correo))
    || chr(10) || '<i>Llegó el ' || public.fecha_corta_tg((p_s.creado_en at time zone coalesce(
         (select o.zona_horaria from public.organizaciones o where o.id = p_s.organizacion_id), 'America/Bogota'))::date) || '</i>'
    || case p_s.estado when 'aceptada' then chr(10) || chr(10) || '✅ <b>Aceptada.</b> Ya es tu alumno.'
                       when 'descartada' then chr(10) || chr(10) || '🗑 <b>Descartada.</b>' else '' end;
$$;

/** Botones según en qué va la solicitud: decidir, o los siguientes pasos con el alumno ya creado. */
create or replace function public.teclado_solicitud_tg(p_s public.solicitudes)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case p_s.estado
      when 'nueva' then jsonb_build_array(jsonb_build_array(
             public.boton_telegram('✅ Aceptar como alumno', 'sa:' || p_s.id), public.boton_telegram('🗑 Descartar', 'sd:' || p_s.id)))
      when 'aceptada' then case when p_s.alumno_id is null then '[]'::jsonb else jsonb_build_array(jsonb_build_array(
             public.boton_telegram('👤 Ver ficha', 'af:' || p_s.alumno_id), public.boton_telegram('📝 Nota', 'an:' || p_s.alumno_id))) end
      else '[]'::jsonb end
    || case when p_s.estado <> 'descartada' and public.whatsapp_tg(p_s.telefono) is not null
            then jsonb_build_array(jsonb_build_array(public.boton_url_tg('💬 Escribirle por WhatsApp', public.whatsapp_tg(p_s.telefono))))
            else '[]'::jsonb end;
$$;

-- Compatibilidad: el aviso al llegar una solicitud usa el teclado nuevo.
create or replace function public.teclado_solicitud_telegram(p_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$ select public.teclado_solicitud_tg(s) from public.solicitudes s where s.id = p_id; $$;

-- ------------------------------------------------------------
-- Citas: un solo texto que cambia con su estado (antes, al terminar, ya decidida)
-- ------------------------------------------------------------
create or replace function public.texto_cita_tg(p_cita uuid, p_modo text)
returns text language sql stable security definer set search_path = ''
as $$
  select
    case
      when c.estado = 'completada' then '✅ <b>Sesión hecha · ' || n.alumno || '</b>'
      when c.estado = 'no_asistio' then '🚫 <b>' || n.alumno || ' no asistió</b>'
      when c.estado = 'cancelada' then '✖️ <b>Cita cancelada · ' || n.alumno || '</b>'
      when p_modo = 'despues' then '🏁 <b>¿Se hizo la sesión con ' || n.alumno || '?</b>'
      when c.inicia_en > now() then '⏰ <b>En ' || greatest(1, ceil(extract(epoch from c.inicia_en - now()) / 60))::int || ' min · ' || n.alumno || '</b>'
      else '▶️ <b>Ahora · ' || n.alumno || '</b>'
    end
    || chr(10) || chr(10) || '🕖 ' || public.hora_telegram(c.inicia_en, o.zona_horaria) || ' – ' || public.hora_telegram(c.termina_en, o.zona_horaria)
    || case when (c.inicia_en at time zone o.zona_horaria)::date <> (now() at time zone o.zona_horaria)::date
            then ' · ' || public.fecha_corta_tg((c.inicia_en at time zone o.zona_horaria)::date) else '' end
    || chr(10) || '🏋️ ' || public.tipo_cita_telegram(c.tipo) || coalesce(' · ' || public.html_telegram(d.nombre), '')
    || case when c.estado = 'confirmada' and p_modo = 'antes' then chr(10) || '👍 Confirmada' else '' end
    || case when c.estado = 'completada' and p_modo = 'despues' then chr(10) || chr(10) || '¿Anotas algo de la sesión?' else '' end
    || case when c.google_pendiente then chr(10) || chr(10) || '<i>Google Calendar se pone al día cuando abras Blister.</i>' else '' end
  from public.citas c
  join public.organizaciones o on o.id = c.organizacion_id
  join public.alumnos a on a.id = c.alumno_id
  cross join lateral (select public.html_telegram(trim(a.nombres || ' ' || a.apellidos)) as alumno) n
  left join public.sesiones s on s.id = c.sesion_id
  left join public.plan_dias d on d.id = s.plan_dia_id
  where c.id = p_cita;
$$;

create or replace function public.teclado_cita_tg(p_cita uuid, p_modo text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select case
      when c.estado = 'programada' and p_modo = 'antes' then jsonb_build_array(
             jsonb_build_array(public.boton_telegram('👍 Confirmar', 'cf:' || c.id), public.boton_telegram('✖️ Cancelar', 'cc:' || c.id)),
             jsonb_build_array(public.boton_telegram('👤 Ficha de ' || a.nombres, 'af:' || a.id)))
      when c.estado = 'confirmada' and p_modo = 'antes' then jsonb_build_array(
             jsonb_build_array(public.boton_telegram('✖️ Cancelar', 'cc:' || c.id), public.boton_telegram('👤 Ficha', 'af:' || a.id)))
      when c.estado in ('programada', 'confirmada') then jsonb_build_array(
             jsonb_build_array(public.boton_telegram('✅ Sí, se hizo', 'ck:' || c.id), public.boton_telegram('🚫 No asistió', 'cn:' || c.id)))
      when c.estado = 'completada' then jsonb_build_array(
             jsonb_build_array(public.boton_telegram('⚖️ Peso', 'ap:' || a.id), public.boton_telegram('📝 Nota', 'an:' || a.id)))
      else jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ficha de ' || a.nombres, 'af:' || a.id)))
         || case when c.estado = 'no_asistio' and public.whatsapp_tg(a.telefono) is not null
                 then jsonb_build_array(jsonb_build_array(public.boton_url_tg('💬 Escribirle', public.whatsapp_tg(a.telefono))))
                 else '[]'::jsonb end
    end
  from public.citas c join public.alumnos a on a.id = c.alumno_id
  where c.id = p_cita;
$$;

-- ------------------------------------------------------------
-- Ficha de alumno
-- ------------------------------------------------------------
create or replace function public.vista_alumno_tg(p_alumno public.alumnos, p_zona text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_texto text;
  v_peso  record;
  v_hoy   date := (now() at time zone p_zona)::date;
begin
  select m.peso_kg, m.medido_en,
         m.peso_kg - (select m2.peso_kg from public.mediciones m2 where m2.alumno_id = p_alumno.id and m2.peso_kg is not null
                      and m2.medido_en < m.medido_en order by m2.medido_en desc limit 1) as cambio
    into v_peso
  from public.mediciones m where m.alumno_id = p_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;

  v_texto := '👤 <b>' || public.html_telegram(p_alumno.nombres || ' ' || p_alumno.apellidos) || '</b>'
    || coalesce(' · ' || extract(year from age(current_date, p_alumno.fecha_nacimiento))::int || ' años', '')
    || coalesce(chr(10) || '🎯 ' || public.html_telegram((select o.nombre from public.objetivos_alumno o
         where o.alumno_id = p_alumno.id and o.estado = 'activo' order by o.es_principal desc, o.creado_en desc limit 1)), '')
    || coalesce(chr(10) || '📋 ' || public.html_telegram((select p.nombre from public.planes p
         where p.alumno_id = p_alumno.id and p.estado = 'activo' limit 1)), '')
    || coalesce(chr(10) || chr(10) || '🩹 <b>A tener en cuenta</b>' || chr(10) || (select string_agg('• ' || public.html_telegram(left(k.descripcion, 160)), chr(10))
         from (select k.descripcion from public.condiciones_alumno k where k.alumno_id = p_alumno.id and k.estado = 'activo'
               order by k.creado_en desc limit 3) k), '')
    || chr(10) || chr(10) || '📅 Próxima cita: ' || coalesce((select '<b>' || public.fecha_corta_tg((c.inicia_en at time zone p_zona)::date) || ', '
              || public.hora_telegram(c.inicia_en, p_zona) || '</b>'
         from public.citas c where c.alumno_id = p_alumno.id and c.estado in ('programada', 'confirmada') and c.inicia_en > now()
         order by c.inicia_en limit 1), '<i>ninguna</i>')
    || chr(10) || '🏋️ Última sesión: ' || coalesce((select public.fecha_corta_tg(x.dia)
              || ' <i>(' || case v_hoy - x.dia when 0 then 'hoy' when 1 then 'ayer' else 'hace ' || (v_hoy - x.dia) || ' días' end || ')</i>'
         from (select (c.inicia_en at time zone p_zona)::date as dia from public.citas c
               where c.alumno_id = p_alumno.id and c.estado = 'completada' order by c.inicia_en desc limit 1) x), '<i>ninguna</i>')
    || case when v_peso.peso_kg is null then ''
            else chr(10) || '⚖️ Peso: <b>' || replace(to_char(v_peso.peso_kg, 'FM999990.0'), '.', ',') || ' kg</b>'
                 || coalesce(' (' || case when v_peso.cambio >= 0 then '+' else '' end || replace(to_char(v_peso.cambio, 'FM999990.0'), '.', ',') || ')', '')
                 || ' <i>' || public.fecha_corta_tg((v_peso.medido_en at time zone p_zona)::date) || '</i>' end
    || coalesce(chr(10) || '📞 ' || public.html_telegram(p_alumno.telefono), '');

  return jsonb_build_object('texto', v_texto, 'teclado',
    jsonb_build_array(jsonb_build_array(public.boton_telegram('📝 Nota', 'an:' || p_alumno.id), public.boton_telegram('⚖️ Peso', 'ap:' || p_alumno.id)))
    || case when public.whatsapp_tg(p_alumno.telefono) is null and public.url_app_tg('/') is null then '[]'::jsonb
            else jsonb_build_array(
                   case when public.whatsapp_tg(p_alumno.telefono) is not null then jsonb_build_array(public.boton_url_tg('💬 WhatsApp', public.whatsapp_tg(p_alumno.telefono))) else '[]'::jsonb end
                   || case when public.url_app_tg('/') is not null then jsonb_build_array(public.boton_url_tg('🔗 Abrir en Blister', public.url_app_tg('/alumnos/' || p_alumno.id))) else '[]'::jsonb end)
       end
    || jsonb_build_array(jsonb_build_array(public.boton_telegram('☰ Menú', 'm:menu'))));
end;
$$;

-- ------------------------------------------------------------
-- Vincular: el saludo trae ya el menú
-- ------------------------------------------------------------
create or replace function public.vincular_telegram(p_secreto text, p_codigo text, p_chat_id bigint)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_esperado text := public.secreto_vault('telegram_webhook_secreto');
  v_usuario  uuid;
  v_org      uuid;
  v_zona     text;
begin
  if v_esperado is null or p_secreto is distinct from v_esperado then return 'no_autorizado'; end if;
  if p_chat_id is null then return 'invalido'; end if;

  select c.usuario_id into v_usuario
  from public.conexiones_telegram c
  where c.codigo = p_codigo and c.codigo_expira_en > now();

  if v_usuario is null then
    perform public.enviar_telegram(p_chat_id,
      '⚠️ <b>Este enlace ya no sirve</b>' || chr(10) || chr(10) || 'Ábrelo de nuevo desde <b>Ajustes → Avisos en Telegram</b> en Blister.');
    return 'codigo_invalido';
  end if;

  delete from public.conexiones_telegram where chat_id = p_chat_id and usuario_id <> v_usuario;
  update public.conexiones_telegram
     set chat_id = p_chat_id, vinculado_en = now(), codigo = null, codigo_expira_en = null
   where usuario_id = v_usuario;

  select m.organizacion_id, o.zona_horaria into v_org, v_zona
  from public.miembros_organizacion m join public.organizaciones o on o.id = m.organizacion_id
  where m.usuario_id = v_usuario and m.estado = 'activo' order by m.creado_en limit 1;

  perform public.enviar_telegram(p_chat_id,
    '✅ <b>Listo, quedaste conectado</b>' || chr(10) || chr(10)
    || 'Te aviso aquí de:' || chr(10)
    || '🙋 cada solicitud nueva de tu página' || chr(10)
    || '☀️ tus citas del día, cada mañana' || chr(10)
    || '⏰ cada cita, 1 hora antes y al terminar' || chr(10) || chr(10)
    || public.texto_menu_tg(v_usuario),
    case when v_org is null then null else public.teclado_menu_tg(v_org, coalesce(v_zona, 'America/Bogota')) end);
  return 'vinculado';
end;
$$;

-- ------------------------------------------------------------
-- Entrada única del webhook
-- ------------------------------------------------------------
create or replace function public.telegram_procesar(p_secreto text, p_update jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_esperado  text := public.secreto_vault('telegram_webhook_secreto');
  v_callback  jsonb := p_update -> 'callback_query';
  v_mensaje   jsonb := coalesce(p_update -> 'message', v_callback -> 'message');
  v_chat      bigint := (v_mensaje -> 'chat' ->> 'id')::bigint;
  -- Al venir de un botón, se edita ese mensaje; si no, se responde con uno nuevo.
  v_editar    bigint := case when v_callback is not null then (v_mensaje ->> 'message_id')::bigint end;
  v_texto     text := trim(coalesce(p_update -> 'message' ->> 'text', ''));
  v_con       public.conexiones_telegram;
  v_usuario   uuid;
  v_org       uuid;
  v_zona      text;
  v_hoy       date;
  v_comando   text;
  v_resto     text;
  v_accion    text;
  v_valor     text;
  v_id        uuid;
  v_res       text;
  v_aviso     text;
  v_vista     jsonb;
  v_s         public.solicitudes;
  v_alumno    public.alumnos;
  v_eleccion  record;
  v_problema  text;
  v_numero    numeric;
  v_anterior  numeric;
  v_dia       date;
  v_lista     public.alumnos[];
begin
  if v_esperado is null or p_secreto is distinct from v_esperado then return 'no_autorizado'; end if;
  if v_chat is null or (v_mensaje -> 'chat' ->> 'type') is distinct from 'private' then return 'ignorado'; end if;

  if v_texto ~ '^/start(@\w+)?\s+[a-f0-9]{36}$' then
    return public.vincular_telegram(p_secreto, substring(v_texto from '([a-f0-9]{36})$'), v_chat);
  end if;

  select * into v_con from public.conexiones_telegram t where t.chat_id = v_chat;
  v_usuario := v_con.usuario_id;
  if v_usuario is null then
    if v_callback is not null then
      perform public.telegram_api('answerCallbackQuery', jsonb_build_object('callback_query_id', v_callback ->> 'id',
        'text', 'Este chat ya no está conectado a Blister.', 'show_alert', true));
    else
      perform public.enviar_telegram(v_chat, '🔌 <b>Este chat no está conectado</b>' || chr(10) || chr(10)
        || 'Conéctalo desde <b>Ajustes → Avisos en Telegram</b> en Blister.');
    end if;
    return 'sin_vincular';
  end if;

  select m.organizacion_id, o.zona_horaria into v_org, v_zona
  from public.miembros_organizacion m
  join public.organizaciones o on o.id = m.organizacion_id and o.estado = 'activo'
  where m.usuario_id = v_usuario and m.estado = 'activo' and m.rol in ('propietario', 'admin', 'entrenador')
  order by m.creado_en limit 1;
  if v_org is null then
    perform public.enviar_telegram(v_chat, 'Tu cuenta no tiene un espacio activo en Blister.');
    return 'sin_espacio';
  end if;
  v_hoy := (now() at time zone v_zona)::date;

  -- Desde aquí, actúa como el usuario: auth.uid() es él (RPC, auditoría, pertenencia).
  perform set_config('request.jwt.claim.sub', v_usuario::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

  -- =============== Botones ===============
  if v_callback is not null then
    v_accion := split_part(coalesce(v_callback ->> 'data', ''), ':', 1);
    v_valor := substring(coalesce(v_callback ->> 'data', '') from position(':' in coalesce(v_callback ->> 'data', '')) + 1);
    if v_valor ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_id := v_valor::uuid; end if;
    if v_valor ~ '^\d{4}-\d{2}-\d{2}$' then v_dia := v_valor::date; end if;

    -- Navegación: se edita el mismo mensaje.
    if v_accion = 'd' and v_dia is not null then
      v_vista := public.vista_dia_tg(v_usuario, v_org, v_dia, v_zona);
    elsif v_accion = 'w' and v_dia is not null then
      v_vista := public.vista_semana_tg(v_usuario, v_dia, v_zona);
    elsif v_accion = 'm' and v_valor = 'menu' then
      v_vista := jsonb_build_object('texto', public.texto_menu_tg(v_usuario), 'teclado', public.teclado_menu_tg(v_org, v_zona));
    elsif v_accion = 'm' and v_valor = 'sol' then
      if not exists (select 1 from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva') then
        v_aviso := 'No tienes solicitudes pendientes ✨';
      else
        for v_s in select * from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva' order by s.creado_en desc limit 5 loop
          perform public.enviar_telegram(v_chat, public.texto_solicitud_telegram(v_s), public.teclado_solicitud_tg(v_s));
        end loop;
      end if;
    elsif v_accion = 'af' and v_id is not null then
      select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      if v_alumno.id is null then v_aviso := 'No encontré ese alumno.';
      else v_vista := public.vista_alumno_tg(v_alumno, v_zona); v_editar := null; -- la ficha sale aparte: el aviso se queda
      end if;

    -- Nota o peso: el bot espera tu siguiente mensaje.
    elsif v_accion in ('an', 'ap') and v_id is not null then
      select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      if v_alumno.id is null then v_aviso := 'No encontré ese alumno.';
      else
        update public.conexiones_telegram
           set esperando = jsonb_build_object('tipo', case v_accion when 'an' then 'nota' else 'peso' end, 'alumno', v_alumno.id),
               esperando_hasta = now() + interval '15 minutes'
         where usuario_id = v_usuario;
        perform public.telegram_api('sendMessage', jsonb_build_object('chat_id', v_chat, 'parse_mode', 'HTML',
          'text', case v_accion
                    when 'an' then '📝 <b>Nota para ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '</b>' || chr(10) || 'Escríbela en tu próximo mensaje.'
                    else '⚖️ <b>¿Cuánto pesa ' || public.html_telegram(v_alumno.nombres) || ' hoy?</b>' || chr(10) || 'Escribe solo el número, en kg.' end
                  || chr(10) || '<i>/cancelar para dejarlo</i>',
          'reply_markup', jsonb_build_object('force_reply', true,
            'input_field_placeholder', case v_accion when 'an' then 'Ej.: le molestó la rodilla en sentadilla' else 'Ej.: 64,5' end)));
      end if;

    -- Solicitudes
    elsif v_accion in ('sa', 'sd', 'sD', 'sx') and v_id is not null then
      select * into v_s from public.solicitudes where id = v_id and organizacion_id = v_org;
      if not found then
        v_aviso := 'No encontré esa solicitud.';
      elsif v_accion = 'sd' and v_s.estado = 'nueva' then
        -- Confirmar antes de descartar: solo cambian los botones.
        perform public.telegram_api('editMessageReplyMarkup', jsonb_build_object('chat_id', v_chat, 'message_id', v_editar,
          'reply_markup', jsonb_build_object('inline_keyboard', jsonb_build_array(jsonb_build_array(
            public.boton_telegram('🗑 Sí, descartar', 'sD:' || v_id), public.boton_telegram('↩ No', 'sx:' || v_id))))));
        v_editar := null;
      else
        if v_s.estado = 'nueva' and v_accion = 'sa' then
          perform public.aceptar_solicitud(v_id);
          v_aviso := '✅ Ya es tu alumno';
        elsif v_s.estado = 'nueva' and v_accion = 'sD' then
          update public.solicitudes set estado = 'descartada' where id = v_id;
          v_aviso := 'Descartada';
        elsif v_s.estado <> 'nueva' and v_accion <> 'sx' then
          v_aviso := 'Ya estaba ' || case v_s.estado when 'aceptada' then 'aceptada' else 'descartada' end;
        end if;
        select * into v_s from public.solicitudes where id = v_id;
        v_vista := jsonb_build_object('texto', public.texto_solicitud_telegram(v_s), 'teclado', public.teclado_solicitud_tg(v_s));
      end if;

    -- Citas
    elsif v_accion in ('cf', 'cc', 'cC', 'cx', 'ck', 'cn') and v_id is not null then
      if not exists (select 1 from public.citas c where c.id = v_id and c.entrenador_id = v_usuario) then
        v_aviso := 'Esa cita no es tuya.';
      elsif v_accion = 'cc' then
        perform public.telegram_api('editMessageReplyMarkup', jsonb_build_object('chat_id', v_chat, 'message_id', v_editar,
          'reply_markup', jsonb_build_object('inline_keyboard', jsonb_build_array(jsonb_build_array(
            public.boton_telegram('✖️ Sí, cancelar', 'cC:' || v_id), public.boton_telegram('↩ No', 'cx:' || v_id))))));
        v_editar := null;
      else
        if v_accion <> 'cx' then
          v_res := public.cambiar_estado_cita_telegram(v_usuario, v_id,
            case v_accion when 'cf' then 'confirmada' when 'cC' then 'cancelada' when 'ck' then 'completada' else 'no_asistio' end);
          v_aviso := case when v_res like 'cerrada:%' then 'Esa cita ya estaba cerrada'
                          else case v_accion when 'cf' then '👍 Confirmada' when 'cC' then 'Cancelada' when 'ck' then '✅ Sesión completada' else 'Marcada: no asistió' end end;
        end if;
        v_vista := jsonb_build_object(
          'texto', public.texto_cita_tg(v_id, case when v_accion in ('ck', 'cn') then 'despues' else 'antes' end),
          'teclado', public.teclado_cita_tg(v_id, case when v_accion in ('ck', 'cn') then 'despues' else 'antes' end));
      end if;
    end if;

    perform public.telegram_api('answerCallbackQuery', jsonb_build_object('callback_query_id', v_callback ->> 'id')
      || case when v_aviso is null then '{}'::jsonb else jsonb_build_object('text', v_aviso) end);
    if v_vista is not null then
      perform public.responder_telegram(v_chat, v_editar, v_vista ->> 'texto', v_vista -> 'teclado');
    end if;
    return 'boton';
  end if;

  -- =============== Mensajes de texto ===============
  v_comando := lower(substring(v_texto from '^/(\w+)'));
  v_resto := trim(regexp_replace(v_texto, '^/\w+(@\w+)?', ''));

  -- Respuesta a «Nota» o «Peso» (cualquier comando la cancela).
  if v_comando is null and v_con.esperando is not null and v_con.esperando_hasta > now() and v_texto <> '' then
    select * into v_alumno from public.alumnos a where a.id = (v_con.esperando ->> 'alumno')::uuid and a.organizacion_id = v_org;
    if v_alumno.id is not null and v_con.esperando ->> 'tipo' = 'nota' then
      insert into public.notas_alumno (alumno_id, autor_id, contenido) values (v_alumno.id, v_usuario, left(v_texto, 2000));
      update public.conexiones_telegram set esperando = null, esperando_hasta = null where usuario_id = v_usuario;
      perform public.enviar_telegram(v_chat, '📝 <b>Nota guardada</b> en el perfil de ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '.',
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id), public.boton_telegram('☰ Menú', 'm:menu'))));
      return 'nota';
    elsif v_alumno.id is not null and v_con.esperando ->> 'tipo' = 'peso' then
      v_numero := nullif(replace(substring(v_texto from '^\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg)?\s*$'), ',', '.'), '')::numeric;
      if v_numero is null or v_numero <= 20 or v_numero >= 400 then
        perform public.enviar_telegram(v_chat, 'Escribe solo el número en kg, por ejemplo <code>64,5</code>. O /cancelar.');
        return 'peso_invalido';
      end if;
      select m.peso_kg into v_anterior from public.mediciones m
       where m.alumno_id = v_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;
      insert into public.mediciones (alumno_id, registrado_por, peso_kg) values (v_alumno.id, v_usuario, round(v_numero, 2));
      update public.conexiones_telegram set esperando = null, esperando_hasta = null where usuario_id = v_usuario;
      perform public.enviar_telegram(v_chat, '⚖️ <b>' || public.html_telegram(v_alumno.nombres) || ': ' || replace(to_char(v_numero, 'FM999990.0'), '.', ',') || ' kg</b>'
          || coalesce(chr(10) || case when v_numero - v_anterior > 0 then '📈 +' when v_numero - v_anterior < 0 then '📉 ' else '➖ ' end
                      || replace(to_char(v_numero - v_anterior, 'FM999990.0'), '.', ',') || ' kg desde la medición anterior', ''),
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id), public.boton_telegram('📝 Nota', 'an:' || v_alumno.id))));
      return 'peso';
    end if;
  end if;
  if v_con.esperando is not null then
    update public.conexiones_telegram set esperando = null, esperando_hasta = null where usuario_id = v_usuario;
  end if;

  if v_comando = 'cancelar' then
    perform public.enviar_telegram(v_chat, 'Listo, lo dejé. 👌', public.teclado_menu_tg(v_org, v_zona));

  -- Un saludo o pedir ayuda no es buscar a un alumno con ese nombre.
  elsif v_comando is null and lower(v_texto) ~ '^(hola|holi|buenas|buenos|buen dia|buen día|menu|menú|ayuda|inicio|hey|hi|gracias)\M' then
    perform public.enviar_telegram(v_chat, public.texto_menu_tg(v_usuario), public.teclado_menu_tg(v_org, v_zona));

  elsif v_comando in ('hoy', 'manana', 'mañana') then
    v_vista := public.vista_dia_tg(v_usuario, v_org, v_hoy + case when v_comando = 'hoy' then 0 else 1 end, v_zona);
    perform public.enviar_telegram(v_chat, v_vista ->> 'texto', v_vista -> 'teclado');

  elsif v_comando = 'semana' then
    v_vista := public.vista_semana_tg(v_usuario, v_hoy, v_zona);
    perform public.enviar_telegram(v_chat, v_vista ->> 'texto', v_vista -> 'teclado');

  elsif v_comando = 'solicitudes' then
    if not exists (select 1 from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva') then
      perform public.enviar_telegram(v_chat, '📥 No tienes solicitudes pendientes. ✨', public.teclado_menu_tg(v_org, v_zona));
    else
      for v_s in select * from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva' order by s.creado_en desc limit 5 loop
        perform public.enviar_telegram(v_chat, public.texto_solicitud_telegram(v_s), public.teclado_solicitud_tg(v_s));
      end loop;
    end if;

  elsif v_comando = 'nota' and position(':' in v_resto) > 0 and trim(split_part(v_resto, ':', 2)) <> '' then
    select * into v_eleccion from public.elegir_alumno_telegram(v_org, split_part(v_resto, ':', 1));
    v_alumno := v_eleccion.alumno; v_problema := v_eleccion.problema;
    if v_problema is not null then
      perform public.enviar_telegram(v_chat, v_problema);
    else
      insert into public.notas_alumno (alumno_id, autor_id, contenido)
      values (v_alumno.id, v_usuario, left(trim(substring(v_resto from position(':' in v_resto) + 1)), 2000));
      perform public.enviar_telegram(v_chat, '📝 <b>Nota guardada</b> en el perfil de ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '.',
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id))));
    end if;

  elsif v_comando = 'peso' and v_resto ~ '[0-9]+([.,][0-9]+)?\s*(kg)?$' then
    v_numero := nullif(replace(substring(v_resto from '([0-9]+(?:[.,][0-9]+)?)\s*(?:kg)?$'), ',', '.'), '')::numeric;
    select * into v_eleccion from public.elegir_alumno_telegram(v_org, regexp_replace(v_resto, '\s*[0-9]+([.,][0-9]+)?\s*(kg)?$', ''));
    v_alumno := v_eleccion.alumno; v_problema := v_eleccion.problema;
    if v_numero is null or v_numero <= 20 or v_numero >= 400 then
      perform public.enviar_telegram(v_chat, 'Escríbelo así: <code>/peso Ana 64,5</code> (en kg).');
    elsif v_problema is not null then
      perform public.enviar_telegram(v_chat, v_problema);
    else
      select m.peso_kg into v_anterior from public.mediciones m
       where m.alumno_id = v_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;
      insert into public.mediciones (alumno_id, registrado_por, peso_kg) values (v_alumno.id, v_usuario, round(v_numero, 2));
      perform public.enviar_telegram(v_chat, '⚖️ <b>' || public.html_telegram(v_alumno.nombres) || ': ' || replace(to_char(v_numero, 'FM999990.0'), '.', ',') || ' kg</b>'
          || coalesce(chr(10) || case when v_numero - v_anterior > 0 then '📈 +' when v_numero - v_anterior < 0 then '📉 ' else '➖ ' end
                      || replace(to_char(v_numero - v_anterior, 'FM999990.0'), '.', ',') || ' kg desde la medición anterior', ''),
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id))));
    end if;

  -- /alumno Ana, /nota Ana y /peso Ana, o el nombre a secas: la ficha (o a quién te refieres).
  elsif (v_comando in ('alumno', 'nota', 'peso') and v_resto <> '') or (v_comando is null and v_texto <> '') then
    select array_agg(b) into v_lista
    from public.buscar_alumnos_telegram(v_org, split_part(coalesce(nullif(v_resto, ''), v_texto), ':', 1)) b;
    select * into v_eleccion from public.elegir_alumno_telegram(v_org, split_part(coalesce(nullif(v_resto, ''), v_texto), ':', 1));
    v_alumno := v_eleccion.alumno;
    if v_alumno.id is not null then
      v_vista := public.vista_alumno_tg(v_alumno, v_zona);
      perform public.enviar_telegram(v_chat, v_vista ->> 'texto', v_vista -> 'teclado');
      if v_comando in ('nota', 'peso') then
        -- Sin el texto o el número: se pide con el mismo flujo de los botones.
        update public.conexiones_telegram
           set esperando = jsonb_build_object('tipo', v_comando, 'alumno', v_alumno.id), esperando_hasta = now() + interval '15 minutes'
         where usuario_id = v_usuario;
        perform public.telegram_api('sendMessage', jsonb_build_object('chat_id', v_chat, 'parse_mode', 'HTML',
          'text', case v_comando when 'nota' then '📝 Escribe la nota para <b>' || public.html_telegram(v_alumno.nombres) || '</b>.'
                                 else '⚖️ ¿Cuánto pesa <b>' || public.html_telegram(v_alumno.nombres) || '</b> hoy? (en kg)' end,
          'reply_markup', jsonb_build_object('force_reply', true)));
      end if;
    elsif v_lista is not null then
      perform public.enviar_telegram(v_chat, '🔎 <b>¿A quién te refieres?</b>',
        (select jsonb_agg(jsonb_build_array(public.boton_telegram(x.nombres || ' ' || x.apellidos, 'af:' || x.id))) from unnest(v_lista) x));
    elsif v_comando is null then
      perform public.enviar_telegram(v_chat, '🤔 No encontré a ningún alumno con «' || public.html_telegram(left(v_texto, 60)) || '».'
        || chr(10) || chr(10) || public.texto_menu_tg(v_usuario), public.teclado_menu_tg(v_org, v_zona));
    else
      perform public.enviar_telegram(v_chat, '🤔 No encontré a ningún alumno con «' || public.html_telegram(left(v_resto, 60)) || '».');
    end if;

  else
    perform public.enviar_telegram(v_chat, public.texto_menu_tg(v_usuario), public.teclado_menu_tg(v_org, v_zona));
  end if;
  return 'comando';
end;
$$;

-- ------------------------------------------------------------
-- Avisos programados con el formato nuevo
-- ------------------------------------------------------------
create or replace function public.procesar_avisos_telegram()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  r          record;
  v_vista    jsonb;
  v_revisar  text;
  v_hoy      date;
  v_hora     int;
  v_lunes    date;
  v_hechas   int;
  v_faltas   int;
  v_citas    int;
  v_pend     int;
begin
  if public.secreto_vault('telegram_bot_token') is null then return; end if;

  -- 1. 1 h antes.
  for r in
    select c.id, c.inicia_en, t.chat_id
    from public.citas c
    join public.conexiones_telegram t on t.usuario_id = c.entrenador_id and t.chat_id is not null
    join public.organizaciones o on o.id = c.organizacion_id and o.estado = 'activo'
    where c.estado in ('programada', 'confirmada')
      and c.inicia_en > now() and c.inicia_en <= now() + interval '1 hour'
      and not exists (select 1 from public.avisos_telegram_citas v where v.cita_id = c.id and v.inicia_en = c.inicia_en and v.tipo = 'antes')
  loop
    perform public.enviar_telegram(r.chat_id, public.texto_cita_tg(r.id, 'antes'), public.teclado_cita_tg(r.id, 'antes'));
    insert into public.avisos_telegram_citas (cita_id, inicia_en, tipo) values (r.id, r.inicia_en, 'antes') on conflict do nothing;
  end loop;

  -- 2. Al terminar (hasta 12 h después).
  for r in
    select c.id, c.inicia_en, t.chat_id
    from public.citas c
    join public.conexiones_telegram t on t.usuario_id = c.entrenador_id and t.chat_id is not null
    join public.organizaciones o on o.id = c.organizacion_id and o.estado = 'activo'
    where c.estado in ('programada', 'confirmada')
      and c.termina_en <= now() and c.termina_en > now() - interval '12 hours'
      and not exists (select 1 from public.avisos_telegram_citas v where v.cita_id = c.id and v.inicia_en = c.inicia_en and v.tipo = 'despues')
  loop
    perform public.enviar_telegram(r.chat_id, public.texto_cita_tg(r.id, 'despues'), public.teclado_cita_tg(r.id, 'despues'));
    insert into public.avisos_telegram_citas (cita_id, inicia_en, tipo) values (r.id, r.inicia_en, 'despues') on conflict do nothing;
  end loop;

  -- 3. Por usuario: la mañana (6 a 11) y el domingo (6 a 9 p. m.).
  for r in
    select t.usuario_id, t.chat_id, t.ultimo_resumen, t.ultimo_resumen_semanal, e.organizacion_id, coalesce(e.zona_horaria, 'America/Bogota') as zona
    from public.conexiones_telegram t
    left join lateral (
      select m.organizacion_id, o.zona_horaria
      from public.miembros_organizacion m
      join public.organizaciones o on o.id = m.organizacion_id and o.estado = 'activo'
      where m.usuario_id = t.usuario_id and m.estado = 'activo' and m.rol in ('propietario', 'admin', 'entrenador')
      order by m.creado_en limit 1
    ) e on true
    where t.chat_id is not null and e.organizacion_id is not null
  loop
    v_hoy := (now() at time zone r.zona)::date;
    v_hora := extract(hour from now() at time zone r.zona)::int;

    if v_hora between 6 and 10 and r.ultimo_resumen is distinct from v_hoy then
      select count(*) into v_citas from public.citas c
      where c.entrenador_id = r.usuario_id and c.estado in ('programada', 'confirmada') and (c.inicia_en at time zone r.zona)::date = v_hoy;

      -- Cada punto en su bloque, con aire entre uno y otro.
      select string_agg(linea, chr(10) || chr(10) order by orden) into v_revisar from (
        select '😴 <b>Sin entrenar hace 14+ días</b>' || chr(10) || string_agg(public.html_telegram(a.nombres || ' ' || a.apellidos), ', ' order by u.ultima)
               || case when count(*) > 5 then '…' else '' end as linea, 1 as orden
        from (
          select a.id, max(c.inicia_en) as ultima
          from public.alumnos a
          join public.citas c on c.alumno_id = a.id and c.estado = 'completada'
          where a.organizacion_id = r.organizacion_id and a.estado = 'activo'
          group by a.id
          having max(c.inicia_en) < now() - interval '14 days'
             and not exists (select 1 from public.citas f where f.alumno_id = a.id and f.estado in ('programada', 'confirmada') and f.inicia_en > now())
          order by max(c.inicia_en) limit 6
        ) u join public.alumnos a on a.id = u.id
        having count(*) > 0
        union all
        select '🚫 <b>Faltaron a sus 2 últimas citas</b>' || chr(10) || string_agg(public.html_telegram(a.nombres || ' ' || a.apellidos), ', '), 2
        from public.alumnos a
        where a.organizacion_id = r.organizacion_id and a.estado = 'activo'
          and (select count(*) from (select c.estado from public.citas c where c.alumno_id = a.id and c.inicia_en < now()
                 and c.estado in ('completada', 'cancelada', 'no_asistio') order by c.inicia_en desc limit 2) x
               where x.estado in ('cancelada', 'no_asistio')) = 2
        having count(*) > 0
        union all
        select '📏 <b>Toca medir</b>' || chr(10) || count(*) || ' alumno' || case when count(*) = 1 then '' else 's' end || ' sin medición hace 30+ días', 3
        from public.alumnos a
        where a.organizacion_id = r.organizacion_id and a.estado = 'activo'
          and coalesce((select max(m.medido_en) from public.mediciones m where m.alumno_id = a.id), a.creado_en) < now() - interval '30 days'
        having count(*) > 0
        union all
        select '📋 <b>Plan que termina esta semana</b>' || chr(10) || string_agg(public.html_telegram(a.nombres || ' ' || a.apellidos), ', '), 4
        from public.planes p join public.alumnos a on a.id = p.alumno_id
        where p.organizacion_id = r.organizacion_id and p.estado = 'activo' and p.fecha_fin between v_hoy and v_hoy + 7
        having count(*) > 0
        union all
        select '📥 <b>Solicitudes esperando respuesta</b>' || chr(10) || count(*) || ' pasaron el plazo que prometes', 5
        from public.solicitudes s join public.organizaciones o on o.id = s.organizacion_id
        where s.organizacion_id = r.organizacion_id and s.estado = 'nueva'
          and s.creado_en < now() - make_interval(hours => coalesce(o.respuesta_horas, 24))
        having count(*) > 0
      ) z;

      if v_citas > 0 or v_revisar is not null then
        v_vista := public.vista_dia_tg(r.usuario_id, r.organizacion_id, v_hoy, r.zona,
          '☀️ <b>Buenos días · ' || public.fecha_larga_tg(v_hoy) || '</b>');
        perform public.enviar_telegram(r.chat_id, v_vista ->> 'texto', v_vista -> 'teclado');
      end if;
      if v_revisar is not null then
        select count(*) into v_pend from public.solicitudes s where s.organizacion_id = r.organizacion_id and s.estado = 'nueva';
        perform public.enviar_telegram(r.chat_id, '🔎 <b>Para revisar hoy</b>' || chr(10) || chr(10) || v_revisar,
          case when v_pend > 0 then jsonb_build_array(jsonb_build_array(public.boton_telegram('📥 Ver solicitudes (' || v_pend || ')', 'm:sol'))) end);
      end if;
      update public.conexiones_telegram set ultimo_resumen = v_hoy where usuario_id = r.usuario_id;
    end if;

    if extract(isodow from v_hoy) = 7 and v_hora between 18 and 20 and r.ultimo_resumen_semanal is distinct from v_hoy then
      v_lunes := v_hoy - 6;
      select count(*) filter (where c.estado = 'completada'), count(*) filter (where c.estado = 'no_asistio')
        into v_hechas, v_faltas
      from public.citas c
      where c.entrenador_id = r.usuario_id and (c.inicia_en at time zone r.zona)::date between v_lunes and v_hoy;
      select count(*) into v_citas from public.citas c
      where c.entrenador_id = r.usuario_id and c.estado in ('programada', 'confirmada')
        and (c.inicia_en at time zone r.zona)::date between v_hoy + 1 and v_hoy + 7;

      perform public.enviar_telegram(r.chat_id,
        '📊 <b>Tu semana · ' || public.fecha_corta_tg(v_lunes) || ' al ' || public.fecha_corta_tg(v_hoy) || '</b>' || chr(10) || chr(10)
        || '✅ Sesiones hechas: <b>' || v_hechas || '</b>' || chr(10)
        || '📈 Asistencia: <b>' || case when v_hechas + v_faltas = 0 then '—' else round(100.0 * v_hechas / (v_hechas + v_faltas)) || ' %' end || '</b>' || chr(10)
        || '🆕 Alumnos nuevos: <b>' || (select count(*) from public.alumnos a where a.organizacion_id = r.organizacion_id
                                     and (a.creado_en at time zone r.zona)::date between v_lunes and v_hoy) || '</b>' || chr(10)
        || '📩 Solicitudes recibidas: <b>' || (select count(*) from public.solicitudes s where s.organizacion_id = r.organizacion_id
                                     and (s.creado_en at time zone r.zona)::date between v_lunes and v_hoy) || '</b>'
        || chr(10) || chr(10) || case when v_citas = 0 then 'La próxima semana aún no tienes citas.'
                                      else 'La próxima semana tienes <b>' || v_citas || ' cita' || case when v_citas = 1 then '' else 's' end || '</b>.' end,
        jsonb_build_array(jsonb_build_array(public.boton_telegram('📆 Ver la próxima semana', 'w:' || (v_hoy + 1)))));
      update public.conexiones_telegram set ultimo_resumen_semanal = v_hoy where usuario_id = r.usuario_id;
    end if;
  end loop;
end;
$$;

revoke execute on function
  public.fecha_corta_tg(date),
  public.fecha_larga_tg(date),
  public.boton_url_tg(text, text),
  public.whatsapp_tg(text),
  public.url_app_tg(text),
  public.editar_telegram(bigint, bigint, text, jsonb),
  public.responder_telegram(bigint, bigint, text, jsonb),
  public.teclado_menu_tg(uuid, text),
  public.texto_menu_tg(uuid),
  public.bloques_citas_tg(uuid, date, text),
  public.vista_dia_tg(uuid, uuid, date, text, text),
  public.vista_semana_tg(uuid, date, text),
  public.texto_solicitud_telegram(public.solicitudes),
  public.teclado_solicitud_tg(public.solicitudes),
  public.teclado_solicitud_telegram(uuid),
  public.texto_cita_tg(uuid, text),
  public.teclado_cita_tg(uuid, text),
  public.vista_alumno_tg(public.alumnos, text),
  public.procesar_avisos_telegram()
from authenticated, anon, public;

-- Menú de comandos más corto: lo demás va con botones.
select public.telegram_api('setMyCommands', jsonb_build_object('language_code', 'es', 'commands', jsonb_build_array(
  jsonb_build_object('command', 'menu', 'description', 'Menú con todo'),
  jsonb_build_object('command', 'hoy', 'description', 'Tus citas de hoy'),
  jsonb_build_object('command', 'semana', 'description', 'Los próximos 7 días'),
  jsonb_build_object('command', 'solicitudes', 'description', 'Solicitudes sin responder'),
  jsonb_build_object('command', 'cancelar', 'description', 'Dejar lo que estabas anotando')
)));
select public.telegram_api('setMyCommands', jsonb_build_object('commands', jsonb_build_array(
  jsonb_build_object('command', 'menu', 'description', 'Menú con todo'),
  jsonb_build_object('command', 'hoy', 'description', 'Tus citas de hoy'),
  jsonb_build_object('command', 'semana', 'description', 'Los próximos 7 días'),
  jsonb_build_object('command', 'solicitudes', 'description', 'Solicitudes sin responder'),
  jsonb_build_object('command', 'cancelar', 'description', 'Dejar lo que estabas anotando')
)));
