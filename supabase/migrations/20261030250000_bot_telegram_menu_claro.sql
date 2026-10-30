-- ============================================================
-- Bot de Telegram: menú más claro
--   · «Inicio» (antes «Menú»): saludo, cómo va tu día (citas de hoy y la
--     próxima, solicitudes por responder) y botones agrupados:
--       📅 Hoy · ➡️ Mañana / 🗓️ Esta semana / 👥 Mis alumnos · 📥 Solicitudes /
--       ❓ Ayuda · 🔗 Abrir Blister
--   · 👥 Mis alumnos: la lista (de 8 en 8) para abrir la ficha sin escribir.
--   · ❓ Ayuda: qué hace cada cosa, con ejemplos (también /ayuda o «ayuda»).
--   · «☰ Menú» pasa a «🏠 Inicio» en todas las vistas.
--   · Comandos con descripciones claras, y /alumnos, /manana, /ayuda nuevos.
--   · Al no encontrar un alumno: mensaje corto con «Mis alumnos» e «Inicio».
-- ============================================================

-- ------------------------------------------------------------
-- Inicio
-- ------------------------------------------------------------
create or replace function public.texto_menu_tg(p_usuario uuid)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  v_org      uuid;
  v_zona     text;
  v_hoy      date;
  v_nombre   text := nullif((select p.nombres from public.perfiles p where p.id = p_usuario), '');
  v_citas    int;
  v_proxima  record;
  v_sol      int;
begin
  select m.organizacion_id, o.zona_horaria into v_org, v_zona
  from public.miembros_organizacion m
  join public.organizaciones o on o.id = m.organizacion_id and o.estado = 'activo'
  where m.usuario_id = p_usuario and m.estado = 'activo' and m.rol in ('propietario', 'admin', 'entrenador')
  order by m.creado_en limit 1;
  v_zona := coalesce(v_zona, 'America/Bogota');
  v_hoy := (now() at time zone v_zona)::date;

  select count(*) into v_citas from public.citas c
   where c.entrenador_id = p_usuario and c.estado in ('programada', 'confirmada') and (c.inicia_en at time zone v_zona)::date = v_hoy;
  select c.inicia_en, a.nombres into v_proxima from public.citas c join public.alumnos a on a.id = c.alumno_id
   where c.entrenador_id = p_usuario and c.estado in ('programada', 'confirmada') and c.inicia_en > now()
     and (c.inicia_en at time zone v_zona)::date = v_hoy
   order by c.inicia_en limit 1;
  select count(*) into v_sol from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva';

  return '🏠 <b>Inicio</b> · ' || public.fecha_larga_tg(v_hoy)
    || chr(10) || chr(10) || '👋 Hola' || coalesce(', <b>' || public.html_telegram(v_nombre) || '</b>', '')
    || chr(10) || chr(10) || '<blockquote>'
    || case when v_citas = 0 then '📅 Hoy no tienes citas'
            else '📅 Hoy tienes <b>' || v_citas || ' cita' || case when v_citas = 1 then '' else 's' end || '</b>'
                 || case when v_proxima.inicia_en is not null
                         then chr(10) || '⏰ La próxima: <b>' || public.hora_telegram(v_proxima.inicia_en, v_zona) || '</b> con ' || public.html_telegram(v_proxima.nombres)
                         else chr(10) || '✅ Ya pasaron todas' end end
    || chr(10) || case when v_sol = 0 then '📥 Sin solicitudes por responder'
                       else '📥 <b>' || v_sol || ' solicitud' || case when v_sol = 1 then '' else 'es' end || '</b> por responder' end
    || '</blockquote>'
    || chr(10) || chr(10) || '<b>¿Qué quieres hacer?</b>'
    || chr(10) || '👇 Toca un botón, o'
    || chr(10) || '👤 Escribe el <b>nombre de un alumno</b> para abrir su ficha'
    || chr(10) || '🎙️ Mándame una <b>nota de voz</b> o una <b>foto</b> nombrándolo';
end;
$$;

create or replace function public.teclado_menu_tg(p_org uuid, p_zona text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with n as (
    select (now() at time zone p_zona)::date as hoy,
           (select count(*) from public.solicitudes s where s.organizacion_id = p_org and s.estado = 'nueva') as sol
  )
  select jsonb_build_array(
      jsonb_build_array(public.boton_telegram('📅 Hoy', 'd:' || n.hoy), public.boton_telegram('➡️ Mañana', 'd:' || (n.hoy + 1))),
      jsonb_build_array(public.boton_telegram('🗓️ Esta semana', 'w:' || n.hoy)),
      jsonb_build_array(public.boton_telegram('👥 Mis alumnos', 'm:alu'),
                        public.boton_telegram('📥 Solicitudes' || case when n.sol > 0 then ' (' || n.sol || ')' else '' end, 'm:sol')),
      jsonb_build_array(public.boton_telegram('❓ Ayuda', 'm:ayuda'))
        || case when public.url_app_tg('/inicio') is null then '[]'::jsonb
                else jsonb_build_array(public.boton_url_tg('🔗 Abrir Blister', public.url_app_tg('/inicio'))) end)
  from n;
$$;

-- ------------------------------------------------------------
-- Mis alumnos (de 8 en 8)
-- ------------------------------------------------------------
create or replace function public.vista_alumnos_tg(p_org uuid, p_pagina int)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_total   int;
  v_pagina  int;
  v_botones jsonb;
begin
  select count(*) into v_total from public.alumnos a where a.organizacion_id = p_org and a.estado = 'activo';
  v_pagina := greatest(0, least(coalesce(p_pagina, 0), greatest(0, (v_total - 1) / 8)));

  select jsonb_agg(jsonb_build_array(public.boton_telegram('👤 ' || left(public.nombre_tg(a.nombres || ' ' || a.apellidos), 40), 'af:' || a.id))
                   order by a.nombres, a.apellidos)
    into v_botones
  from (select a.* from public.alumnos a where a.organizacion_id = p_org and a.estado = 'activo'
        order by a.nombres, a.apellidos offset v_pagina * 8 limit 8) a;

  return jsonb_build_object(
    'texto', '👥 <b>Mis alumnos</b>'
      || chr(10) || '<i>' || case when v_total = 0 then 'Aún no tienes alumnos activos'
                                  else v_total || ' activo' || case when v_total = 1 then '' else 's' end
                                       || case when v_total > 8 then ' · página ' || (v_pagina + 1) || ' de ' || ((v_total - 1) / 8 + 1) else '' end end || '</i>'
      || chr(10) || chr(10) || case when v_total = 0 then 'Agrégalos en Blister o acepta una solicitud.'
                                    else 'Toca uno para ver su ficha. También puedes escribir su nombre.' end,
    'teclado', coalesce(v_botones, '[]'::jsonb)
      || case when v_total > 8 then jsonb_build_array(
              case when v_pagina > 0 then jsonb_build_array(public.boton_telegram('◀ Anteriores', 'm:alu:' || (v_pagina - 1))) else '[]'::jsonb end
              || case when (v_pagina + 1) * 8 < v_total then jsonb_build_array(public.boton_telegram('Siguientes ▶', 'm:alu:' || (v_pagina + 1))) else '[]'::jsonb end)
              else '[]'::jsonb end
      || jsonb_build_array(jsonb_build_array(public.boton_telegram('🏠 Inicio', 'm:menu'))));
end;
$$;

-- ------------------------------------------------------------
-- Ayuda
-- ------------------------------------------------------------
create or replace function public.vista_ayuda_tg()
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'texto', '❓ <b>Cómo usar el bot</b>'
      || chr(10) || chr(10) || '📅 <b>Tu agenda</b>'
      || chr(10) || 'Hoy, Mañana y Esta semana muestran tus citas. En cada una puedes confirmar, mover, cancelar y, al terminar, marcar si asistió.'
      || chr(10) || chr(10) || '👤 <b>Tus alumnos</b>'
      || chr(10) || 'Escribe o pega su nombre (o toca «Mis alumnos») y se abre su ficha: rutina, próxima cita, última sesión, nota, peso, foto y WhatsApp.'
      || chr(10) || chr(10) || '🎙️ <b>Notas de voz</b>'
      || chr(10) || 'Di el nombre y lo que pasó:'
      || chr(10) || '<i>«Kevin hoy subió a 80 en sentadilla»</i>'
      || chr(10) || 'Queda como nota en su perfil.'
      || chr(10) || chr(10) || '📸 <b>Fotos de progreso</b>'
      || chr(10) || 'Mándame la foto con el nombre del alumno en el texto.'
      || chr(10) || chr(10) || '🔔 <b>Avisos</b>'
      || chr(10) || 'Te escribo cuando llega una solicitud, cada mañana con tu agenda y una hora antes de cada cita.'
      || chr(10) || chr(10) || '⌨️ <b>Atajos</b>'
      || chr(10) || '<code>/nota Ana: le molestó la rodilla</code>'
      || chr(10) || '<code>/peso Ana 64,5</code>'
      || chr(10) || '/cancelar deja lo que estabas anotando',
    'teclado', jsonb_build_array(jsonb_build_array(public.boton_telegram('👥 Mis alumnos', 'm:alu'), public.boton_telegram('🏠 Inicio', 'm:menu'))));
$$;

-- ------------------------------------------------------------
-- Vistas con «🏠 Inicio» en vez de «☰ Menú»
-- ------------------------------------------------------------
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
      jsonb_build_array(public.boton_telegram('🗓️ Semana', 'w:' || p_dia), public.boton_telegram('🏠 Inicio', 'm:menu'))));
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
    'texto', '🗓️ <b>Semana · ' || public.fecha_corta_tg(p_desde) || ' al ' || public.fecha_corta_tg(v_hasta) || '</b>'
      || chr(10) || '<i>' || case when v_total = 0 then 'Sin citas' else v_total || ' cita' || case when v_total = 1 then '' else 's' end end || '</i>'
      || chr(10) || chr(10) || v_dias,
    'teclado', jsonb_build_array(
      jsonb_build_array(public.boton_telegram('◀ Semana anterior', 'w:' || (p_desde - 7)), public.boton_telegram('Siguiente ▶', 'w:' || (p_desde + 7))),
      jsonb_build_array(public.boton_telegram('📅 Hoy', 'd:' || (now() at time zone p_zona)::date), public.boton_telegram('🏠 Inicio', 'm:menu'))));
end;
$$;

create or replace function public.guardar_nota_voz_tg(p_chat bigint, p_usuario uuid, p_alumno public.alumnos, p_texto text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notas_alumno (alumno_id, autor_id, contenido) values (p_alumno.id, p_usuario, '🎙️ ' || left(p_texto, 2000));
  update public.conexiones_telegram set esperando = null, esperando_hasta = null where usuario_id = p_usuario;
  perform public.enviar_telegram(p_chat,
    '🎙️ <b>Nota de voz guardada</b> en el perfil de ' || public.html_telegram(p_alumno.nombres || ' ' || p_alumno.apellidos)
    || chr(10) || chr(10) || '<blockquote>' || public.html_telegram(left(p_texto, 1500)) || '</blockquote>',
    jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || p_alumno.id), public.boton_telegram('🏠 Inicio', 'm:menu'))));
end;
$$;

create or replace function public.vista_alumno_tg(p_alumno public.alumnos, p_zona text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_texto     text;
  v_peso      record;
  v_hoy       date := (now() at time zone p_zona)::date;
  v_fotos     int;
  v_plan      text;
  v_toca      text;
  v_objetivo  text;
  v_cuidados  text;
  v_proxima   timestamptz;
  v_ultima    date;
begin
  select m.peso_kg, m.medido_en,
         m.peso_kg - (select m2.peso_kg from public.mediciones m2 where m2.alumno_id = p_alumno.id and m2.peso_kg is not null
                      and m2.medido_en < m.medido_en order by m2.medido_en desc limit 1) as cambio
    into v_peso
  from public.mediciones m where m.alumno_id = p_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;
  select count(*) into v_fotos from public.fotos_progreso f where f.alumno_id = p_alumno.id;
  select p.nombre into v_plan from public.planes p where p.alumno_id = p_alumno.id and p.estado = 'activo' limit 1;
  select d.nombre into v_toca from public.plan_dias d where d.id = public.siguiente_dia_plan_tg(p_alumno.id);
  select o.nombre into v_objetivo from public.objetivos_alumno o
   where o.alumno_id = p_alumno.id and o.estado = 'activo' order by o.es_principal desc, o.creado_en desc limit 1;
  select string_agg('• ' || public.html_telegram(left(k.descripcion, 160)), chr(10)) into v_cuidados
  from (select k.descripcion from public.condiciones_alumno k where k.alumno_id = p_alumno.id and k.estado = 'activo'
        order by k.creado_en desc limit 3) k;
  select c.inicia_en into v_proxima from public.citas c
   where c.alumno_id = p_alumno.id and c.estado in ('programada', 'confirmada') and c.inicia_en > now() order by c.inicia_en limit 1;
  select (c.inicia_en at time zone p_zona)::date into v_ultima from public.citas c
   where c.alumno_id = p_alumno.id and c.estado = 'completada' order by c.inicia_en desc limit 1;

  -- Quién es
  v_texto := '👤 <b>' || public.html_telegram(public.nombre_tg(p_alumno.nombres || ' ' || p_alumno.apellidos)) || '</b>'
    || coalesce(chr(10) || '<i>' || nullif(concat_ws(' · ',
         extract(year from age(current_date, p_alumno.fecha_nacimiento))::int || ' años',
         public.html_telegram(v_objetivo)), '') || '</i>', '')

  -- Su rutina
    || chr(10) || chr(10) || case when v_plan is null then '📋 <i>Sin rutina activa</i>'
         else '📋 <b>' || public.html_telegram(v_plan) || '</b>'
              || coalesce(chr(10) || '<blockquote>Le toca: <b>' || public.html_telegram(v_toca) || '</b></blockquote>', '') end

  -- A tener en cuenta
    || coalesce(chr(10) || chr(10) || '🩹 <b>A tener en cuenta</b>' || chr(10) || '<blockquote>' || v_cuidados || '</blockquote>', '')

  -- Agenda y seguimiento
    || chr(10) || chr(10) || '📅 Próxima cita: ' || coalesce('<b>' || public.fecha_corta_tg((v_proxima at time zone p_zona)::date) || ', '
              || public.hora_telegram(v_proxima, p_zona) || '</b>', '<i>ninguna</i>')
    || chr(10) || '🕘 Última sesión: ' || coalesce('<b>' || public.fecha_corta_tg(v_ultima) || '</b>'
              || ' <i>(' || case v_hoy - v_ultima when 0 then 'hoy' when 1 then 'ayer' else 'hace ' || (v_hoy - v_ultima) || ' días' end || ')</i>', '<i>ninguna</i>')
    || case when v_peso.peso_kg is null then ''
            else chr(10) || '⚖️ Peso: <b>' || replace(to_char(v_peso.peso_kg, 'FM999990.0'), '.', ',') || ' kg</b>'
                 || coalesce(' (' || case when v_peso.cambio >= 0 then '+' else '' end || replace(to_char(v_peso.cambio, 'FM999990.0'), '.', ',') || ')', '')
                 || ' <i>· ' || public.fecha_corta_tg((v_peso.medido_en at time zone p_zona)::date) || '</i>' end
    || case when v_fotos > 0 then chr(10) || '📸 ' || v_fotos || ' foto' || case when v_fotos = 1 then '' else 's' end || ' de progreso' else '' end

  -- Contacto: en texto normal para que Telegram lo reconozca y abra su menú al tocarlo.
    || coalesce(chr(10) || chr(10) || '📞 ' || public.html_telegram(p_alumno.telefono), '')
    || coalesce(chr(10) || '📧 ' || public.html_telegram(p_alumno.correo), '');

  return jsonb_build_object('texto', v_texto, 'teclado',
    jsonb_build_array(
      jsonb_build_array(public.boton_telegram(coalesce('📋 ' || left(v_plan, 30), '📋 Asignar rutina'), 'pl:' || p_alumno.id)),
      case when v_proxima is null
           then jsonb_build_array(public.boton_telegram('📅 Agendar cita', 'ag:' || p_alumno.id))
           else jsonb_build_array(
                  public.boton_telegram('📅 ' || public.fecha_corta_tg((v_proxima at time zone p_zona)::date) || ', ' || public.hora_telegram(v_proxima, p_zona), 'pc:' || p_alumno.id),
                  public.boton_telegram('➕ Agendar', 'ag:' || p_alumno.id)) end,
      jsonb_build_array(public.boton_telegram('🕘 Última sesión', 'us:' || p_alumno.id))
        || case when v_plan is not null then jsonb_build_array(public.boton_telegram('🏋️ Rutina de hoy', 'va:' || p_alumno.id)) else '[]'::jsonb end,
      jsonb_build_array(public.boton_telegram('📝 Nota', 'an:' || p_alumno.id), public.boton_telegram('⚖️ Peso', 'ap:' || p_alumno.id),
                        public.boton_telegram('📸 Foto', 'fo:' || p_alumno.id)))
    || case when public.whatsapp_tg(p_alumno.telefono) is null and public.url_app_tg('/') is null then '[]'::jsonb
            else jsonb_build_array(
                   case when public.whatsapp_tg(p_alumno.telefono) is not null then jsonb_build_array(public.boton_url_tg('💬 WhatsApp', public.whatsapp_tg(p_alumno.telefono))) else '[]'::jsonb end
                   || case when public.url_app_tg('/') is not null then jsonb_build_array(public.boton_url_tg('🔗 Abrir en Blister', public.url_app_tg('/alumnos/' || p_alumno.id))) else '[]'::jsonb end)
       end
    || jsonb_build_array(jsonb_build_array(public.boton_telegram('🏠 Inicio', 'm:menu'))));
end;
$$;

-- ------------------------------------------------------------
-- Entrada del webhook: Mis alumnos, Ayuda y los comandos nuevos
-- ------------------------------------------------------------
create or replace function public.telegram_procesar(p_secreto text, p_update jsonb)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_esperado  text := public.secreto_vault('telegram_webhook_secreto');
  v_callback  jsonb := p_update -> 'callback_query';
  v_mensaje   jsonb := coalesce(p_update -> 'message', v_callback -> 'message');
  v_chat      bigint := (v_mensaje -> 'chat' ->> 'id')::bigint;
  v_editar    bigint := case when v_callback is not null then (v_mensaje ->> 'message_id')::bigint end;
  v_texto     text := trim(coalesce(p_update -> 'message' ->> 'text', ''));
  v_voz       boolean := coalesce((p_update -> 'message' ->> 'voz')::boolean, false);
  v_con       public.conexiones_telegram;
  v_usuario   uuid;
  v_org       uuid;
  v_zona      text;
  v_hoy       date;
  v_comando   text;
  v_resto     text;
  v_accion    text;
  v_valor     text;
  v_extra     text;
  v_id        uuid;
  v_res       text;
  v_aviso     text;
  v_vista     jsonb;
  v_s         public.solicitudes;
  v_alumno    public.alumnos;
  v_cita      public.citas;
  v_eleccion  record;
  v_problema  text;
  v_numero    numeric;
  v_anterior  numeric;
  v_dia       date;
  v_inicio    timestamptz;
  v_dia_plan  uuid;
  v_sesion    uuid;
  v_nueva     uuid;
  v_lista     public.alumnos[];
  v_google    boolean;
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
  v_google := exists (select 1 from public.conexiones_google g where g.usuario_id = v_usuario);

  -- Desde aquí, actúa como el usuario: auth.uid() es él (RPC, auditoría, pertenencia).
  perform set_config('request.jwt.claim.sub', v_usuario::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

  -- =============== Botones ===============
  if v_callback is not null then
    v_accion := split_part(coalesce(v_callback ->> 'data', ''), ':', 1);
    v_valor := split_part(coalesce(v_callback ->> 'data', ''), ':', 2);
    v_extra := split_part(coalesce(v_callback ->> 'data', ''), ':', 3);
    if v_valor ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_id := v_valor::uuid; end if;
    if v_valor ~ '^\d{4}-\d{2}-\d{2}$' then v_dia := v_valor::date; end if;

    -- Navegación: se edita el mismo mensaje.
    if v_accion = 'd' and v_dia is not null then
      v_vista := public.vista_dia_tg(v_usuario, v_org, v_dia, v_zona);
    elsif v_accion = 'w' and v_dia is not null then
      v_vista := public.vista_semana_tg(v_usuario, v_dia, v_zona);
    elsif v_accion = 'm' and v_valor = 'menu' then
      v_vista := jsonb_build_object('texto', public.texto_menu_tg(v_usuario), 'teclado', public.teclado_menu_tg(v_org, v_zona));
    elsif v_accion = 'm' and v_valor = 'alu' then
      v_vista := public.vista_alumnos_tg(v_org, coalesce(nullif(v_extra, '')::int, 0));
    elsif v_accion = 'm' and v_valor = 'ayuda' then
      v_vista := public.vista_ayuda_tg();
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
      else v_vista := public.vista_alumno_tg(v_alumno, v_zona); v_editar := null;
      end if;

    -- Nota, peso o foto: el bot espera tu siguiente mensaje.
    elsif v_accion in ('an', 'ap', 'fo') and v_id is not null then
      select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      if v_alumno.id is null then v_aviso := 'No encontré ese alumno.';
      else
        update public.conexiones_telegram
           set esperando = jsonb_build_object('tipo', case v_accion when 'an' then 'nota' when 'ap' then 'peso' else 'foto' end, 'alumno', v_alumno.id),
               esperando_hasta = now() + interval '15 minutes'
         where usuario_id = v_usuario;
        if v_accion = 'fo' then
          perform public.enviar_telegram(v_chat, '📸 <b>Mándame la foto de ' || public.html_telegram(v_alumno.nombres) || '</b>'
            || chr(10) || 'La guardo como foto de progreso en su perfil.' || chr(10) || '<i>/cancelar para dejarlo</i>');
        else
          perform public.telegram_api('sendMessage', jsonb_build_object('chat_id', v_chat, 'parse_mode', 'HTML',
            'text', case v_accion
                      when 'an' then '📝 <b>Nota para ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '</b>' || chr(10) || 'Escríbela o mándala como nota de voz.'
                      else '⚖️ <b>¿Cuánto pesa ' || public.html_telegram(v_alumno.nombres) || ' hoy?</b>' || chr(10) || 'Escribe solo el número, en kg.' end
                    || chr(10) || '<i>/cancelar para dejarlo</i>',
            'reply_markup', jsonb_build_object('force_reply', true,
              'input_field_placeholder', case v_accion when 'an' then 'Ej.: le molestó la rodilla en sentadilla' else 'Ej.: 64,5' end)));
        end if;
      end if;

    -- Nota de voz sin alumno claro: ¿de quién era?
    elsif v_accion = 'nv' and v_id is not null then
      select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      if v_alumno.id is null or v_con.esperando ->> 'tipo' is distinct from 'voz' then
        v_aviso := 'Esa nota ya no está pendiente.';
      else
        perform public.guardar_nota_voz_tg(v_chat, v_usuario, v_alumno, v_con.esperando ->> 'texto');
        v_aviso := '🎙️ Guardada';
        perform public.telegram_api('editMessageReplyMarkup', jsonb_build_object('chat_id', v_chat, 'message_id', v_editar,
          'reply_markup', jsonb_build_object('inline_keyboard', '[]'::jsonb)));
      end if;

    -- Rutina del día (de una cita, o la que le toca a un alumno).
    elsif v_accion in ('vr', 'va') and v_id is not null then
      if v_accion = 'vr' then
        select c.* into v_cita from public.citas c where c.id = v_id and c.organizacion_id = v_org;
        select s.plan_dia_id into v_dia_plan from public.sesiones s where s.id = v_cita.sesion_id;
        v_dia_plan := coalesce(v_dia_plan, public.siguiente_dia_plan_tg(v_cita.alumno_id));
        select * into v_alumno from public.alumnos a where a.id = v_cita.alumno_id;
      else
        select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
        -- Si hoy entrena, la de hoy; si no, la que le toca.
        select s.plan_dia_id into v_dia_plan from public.citas c join public.sesiones s on s.id = c.sesion_id
         where c.alumno_id = v_alumno.id and c.estado in ('programada', 'confirmada') and (c.inicia_en at time zone v_zona)::date = v_hoy
         order by c.inicia_en limit 1;
        v_dia_plan := coalesce(v_dia_plan, public.siguiente_dia_plan_tg(v_alumno.id));
      end if;
      if v_alumno.id is null then v_aviso := 'No encontré ese alumno.';
      elsif v_dia_plan is null then v_aviso := v_alumno.nombres || ' no tiene una rutina activa';
      elsif v_accion = 'va' then
        v_vista := jsonb_build_object('texto', public.texto_rutina_tg(v_dia_plan, public.html_telegram(v_alumno.nombres)),
          'teclado', jsonb_build_array(jsonb_build_array(
            public.boton_telegram('↩ Ficha', 'ax:' || v_alumno.id), public.boton_telegram('📋 Cambiar rutina', 'pl:' || v_alumno.id))));
      else
        perform public.enviar_telegram(v_chat, public.texto_rutina_tg(v_dia_plan, public.html_telegram(v_alumno.nombres)),
          jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ficha de ' || v_alumno.nombres, 'af:' || v_alumno.id))));
      end if;

    -- Agendar (a) o mover (m): día → hora → confirmar.
    -- «ab»/«mb»: lo mismo, pero volviendo desde las horas en el mismo mensaje.
    elsif v_accion in ('ag', 'mv', 'ab', 'mb') and v_id is not null then
      if v_accion in ('ag', 'ab') then
        select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      else
        select c.* into v_cita from public.citas c where c.id = v_id and c.entrenador_id = v_usuario and c.estado in ('programada', 'confirmada');
        select * into v_alumno from public.alumnos a where a.id = v_cita.alumno_id;
      end if;
      if v_alumno.id is null then v_aviso := case when v_accion in ('ag', 'ab') then 'No encontré ese alumno.' else 'Esa cita ya no se puede mover.' end;
      else
        v_vista := jsonb_build_object(
          'texto', case when v_accion in ('ag', 'ab') then '📅 <b>Agendar a ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '</b>'
                                 else '🔁 <b>Mover la cita de ' || public.html_telegram(v_alumno.nombres) || '</b>' || chr(10) || '<i>Ahora: '
                                      || public.fecha_corta_tg((v_cita.inicia_en at time zone v_zona)::date) || ', ' || public.hora_telegram(v_cita.inicia_en, v_zona) || '</i>' end
                   || chr(10) || chr(10) || '¿Qué día?',
          'teclado', public.teclado_dias_tg(case when v_accion in ('ag', 'ab') then 'a' else 'm' end, v_id, v_zona, 'm:menu'));
        -- Al empezar, el selector sale en un mensaje propio: la ficha o el aviso de la cita se quedan como estaban.
        if v_accion in ('ag', 'mv') then v_editar := null; end if;
      end if;

    elsif v_accion in ('ad', 'md', 'ah', 'mh', 'ac', 'mc') and v_id is not null then
      if left(v_accion, 1) = 'a' then
        select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      else
        select c.* into v_cita from public.citas c where c.id = v_id and c.entrenador_id = v_usuario and c.estado in ('programada', 'confirmada');
        select * into v_alumno from public.alumnos a where a.id = v_cita.alumno_id;
      end if;

      if v_alumno.id is null then
        v_aviso := 'Esa cita ya no se puede mover.';
      elsif right(v_accion, 1) = 'd' then
        -- Día elegido: las horas libres.
        v_dia := to_date(v_extra, 'YYYYMMDD');
        v_vista := jsonb_build_object(
          'texto', case left(v_accion, 1) when 'a' then '📅 <b>Agendar a ' || public.html_telegram(v_alumno.nombres) || '</b>'
                                          else '🔁 <b>Mover la cita de ' || public.html_telegram(v_alumno.nombres) || '</b>' end
                   || chr(10) || chr(10) || '<b>' || public.capital_tg(public.fecha_larga_tg(v_dia)) || '</b> · ¿a qué hora?'
                   || chr(10) || '<i>Solo salen las horas en que estás libre.</i>',
          'teclado', public.teclado_horas_tg(left(v_accion, 1), v_id, v_dia, v_usuario, v_zona,
                       coalesce((extract(epoch from v_cita.termina_en - v_cita.inicia_en) / 60)::int, 60), v_cita.id,
                       left(v_accion, 1) || 'b:' || v_id));
      else
        v_inicio := public.instante_tg(v_extra, v_zona);
        if v_inicio is null or v_inicio <= now() then
          v_aviso := 'Esa hora ya pasó. Elige otra.';
        elsif right(v_accion, 1) = 'h' then
          -- Confirmar antes de guardar.
          v_dia_plan := case when left(v_accion, 1) = 'a' then public.siguiente_dia_plan_tg(v_alumno.id) end;
          v_vista := jsonb_build_object(
            'texto', case left(v_accion, 1) when 'a' then '📅 <b>¿Agendo esta cita?</b>' else '🔁 <b>¿La muevo aquí?</b>' end
                     || chr(10) || chr(10) || '👤 ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos)
                     || chr(10) || '🗓 ' || public.capital_tg(public.fecha_larga_tg((v_inicio at time zone v_zona)::date))
                     || chr(10) || '🕖 ' || public.hora_telegram(v_inicio, v_zona) || ' – '
                     || public.hora_telegram(v_inicio + coalesce(v_cita.termina_en - v_cita.inicia_en, interval '1 hour'), v_zona)
                     || coalesce(chr(10) || '🏋️ Toca: ' || public.html_telegram((select d.nombre from public.plan_dias d where d.id = v_dia_plan)), ''),
            'teclado', jsonb_build_array(jsonb_build_array(
              public.boton_telegram(case left(v_accion, 1) when 'a' then '✅ Agendar' else '✅ Mover' end, left(v_accion, 1) || 'c:' || v_id || ':' || v_extra),
              public.boton_telegram('↩ Otra hora', left(v_accion, 1) || 'd:' || v_id || ':' || left(v_extra, 8)))));
        elsif v_accion = 'ac' then
          begin
            v_dia_plan := public.siguiente_dia_plan_tg(v_alumno.id);
            if v_dia_plan is not null then
              v_sesion := public.iniciar_sesion_desde_plan(v_dia_plan, v_inicio);
            end if;
            insert into public.citas (organizacion_id, entrenador_id, alumno_id, tipo, inicia_en, termina_en, sesion_id, google_pendiente, google_avisar)
            values (v_org, v_usuario, v_alumno.id, 'entrenamiento', v_inicio, v_inicio + interval '1 hour', v_sesion, v_google, true)
            returning id into v_nueva;
            v_aviso := '✅ Cita agendada';
            v_vista := jsonb_build_object(
              'texto', '✅ <b>Cita agendada</b>' || chr(10) || chr(10) || public.texto_cita_tg(v_nueva, 'antes'),
              'teclado', jsonb_build_array(jsonb_build_array(
                public.boton_telegram('🏋️ Ver rutina', 'vr:' || v_nueva),
                public.boton_telegram('📅 Ver el día', 'd:' || (v_inicio at time zone v_zona)::date))));
          exception when exclusion_violation then
            v_aviso := 'Ese horario se cruza con otra cita. Elige otro.';
          end;
        elsif v_accion = 'mc' then
          begin
            update public.citas
               set inicia_en = v_inicio, termina_en = v_inicio + (v_cita.termina_en - v_cita.inicia_en),
                   google_pendiente = v_google, google_avisar = true
             where id = v_cita.id;
            update public.sesiones set programada_para = v_inicio where id = v_cita.sesion_id;
            v_aviso := '🔁 Cita movida';
            v_vista := jsonb_build_object(
              'texto', '🔁 <b>Cita movida</b>' || chr(10) || chr(10) || public.texto_cita_tg(v_cita.id, 'antes'),
              'teclado', public.teclado_cita_tg(v_cita.id, 'antes'));
          exception when exclusion_violation then
            v_aviso := 'Ese horario se cruza con otra cita. Elige otro.';
          end;
        end if;
      end if;

    -- Esfuerzo de la sesión (1–10) o saltarlo; luego, ¿molestias?
    elsif v_accion in ('rp', 'rs') and v_id is not null then
      select c.* into v_cita from public.citas c where c.id = v_id and c.entrenador_id = v_usuario;
      if v_cita.id is null then v_aviso := 'Esa cita no es tuya.';
      else
        if v_accion = 'rp' and v_extra ~ '^(10|[1-9])$' then
          update public.sesiones set rpe_sesion = v_extra::numeric where id = v_cita.sesion_id;
          v_aviso := '💪 ' || v_extra || '/10';
        end if;
        v_vista := jsonb_build_object(
          'texto', public.texto_cita_tg(v_id, 'cerrada') || chr(10) || chr(10) || '🩹 <b>¿Hubo alguna molestia?</b>',
          'teclado', jsonb_build_array(jsonb_build_array(
            public.boton_telegram('👍 Ninguna', 'mn:' || v_id), public.boton_telegram('🩹 Sí, anotar', 'ml:' || v_id))));
      end if;

    elsif v_accion in ('mn', 'ml') and v_id is not null then
      select c.* into v_cita from public.citas c where c.id = v_id and c.entrenador_id = v_usuario;
      if v_cita.id is null then v_aviso := 'Esa cita no es tuya.';
      else
        v_vista := jsonb_build_object('texto', public.texto_cita_tg(v_id, 'cerrada')
                     || case v_accion when 'mn' then chr(10) || '👍 Sin molestias' else chr(10) || '🩹 Molestia: te la pido abajo' end,
                   'teclado', public.teclado_cita_tg(v_id, 'cerrada'));
        if v_accion = 'ml' then
          update public.conexiones_telegram
             set esperando = jsonb_build_object('tipo', 'molestia', 'alumno', v_cita.alumno_id, 'cita', v_cita.id),
                 esperando_hasta = now() + interval '15 minutes'
           where usuario_id = v_usuario;
          perform public.telegram_api('sendMessage', jsonb_build_object('chat_id', v_chat, 'parse_mode', 'HTML',
            'text', '🩹 <b>¿Qué molestia tuvo?</b>' || chr(10) || 'Escríbela o mándala como nota de voz.' || chr(10) || '<i>/cancelar para dejarlo</i>',
            'reply_markup', jsonb_build_object('force_reply', true, 'input_field_placeholder', 'Ej.: dolor en la rodilla izquierda al bajar')));
        end if;
      end if;

    -- Ficha en su sitio y sus vistas: rutina activa (y cambiarla), próxima cita y última sesión.
    elsif v_accion in ('ax', 'pl', 'pc', 'us') and v_id is not null then
      select * into v_alumno from public.alumnos a where a.id = v_id and a.organizacion_id = v_org;
      if v_alumno.id is null then
        v_aviso := 'No encontré ese alumno.';
      elsif v_accion = 'ax' then
        v_vista := public.vista_alumno_tg(v_alumno, v_zona);
      elsif v_accion = 'pl' then
        -- El alumno queda en espera: el botón de cada rutina solo lleva su id (Telegram admite 64 bytes).
        update public.conexiones_telegram
           set esperando = jsonb_build_object('tipo', 'rutina', 'alumno', v_alumno.id), esperando_hasta = now() + interval '15 minutes'
         where usuario_id = v_usuario;
        v_vista := public.vista_plan_tg(v_alumno, v_org, v_zona);
      elsif v_accion = 'pc' then
        select c.id into v_nueva from public.citas c
         where c.alumno_id = v_alumno.id and c.estado in ('programada', 'confirmada') and c.inicia_en > now()
         order by c.inicia_en limit 1;
        if v_nueva is null then
          v_aviso := v_alumno.nombres || ' no tiene citas próximas';
        else
          -- Los botones de la cita, sin su «Ficha de…» (abre otra): aquí se vuelve con «↩ Ficha».
          v_vista := jsonb_build_object('texto', public.texto_cita_tg(v_nueva, 'antes'),
            'teclado', coalesce((select jsonb_agg(f) from jsonb_array_elements(public.teclado_cita_tg(v_nueva, 'antes')) f
                                 where f::text not like '%"af:%'), '[]'::jsonb)
                       || jsonb_build_array(jsonb_build_array(public.boton_telegram('↩ Ficha', 'ax:' || v_alumno.id))));
        end if;
      else
        v_vista := public.vista_ultima_sesion_tg(v_alumno, v_zona);
      end if;

    -- Cambiar la rutina activa: una de las rutinas (plantillas) del espacio, con confirmación.
    elsif v_accion in ('pp', 'pk') and v_id is not null then
      if v_con.esperando ->> 'tipo' = 'rutina' and v_con.esperando_hasta > now() then
        select * into v_alumno from public.alumnos a where a.id = (v_con.esperando ->> 'alumno')::uuid and a.organizacion_id = v_org;
      end if;
      if v_alumno.id is null then
        v_aviso := 'Vuelve a abrir «Rutina» desde la ficha.';
      elsif not exists (select 1 from public.plantillas p where p.id = v_id and p.organizacion_id = v_org and p.estado <> 'archivado') then
        v_aviso := 'No encontré esa rutina.';
      elsif v_accion = 'pp' then
        v_vista := jsonb_build_object(
          'texto', '📋 <b>¿Asignar «' || public.html_telegram((select p.nombre from public.plantillas p where p.id = v_id)) || '» a '
                   || public.html_telegram(v_alumno.nombres) || '?</b>'
                   || coalesce(chr(10) || chr(10) || 'Reemplaza a «' || public.html_telegram((select p.nombre from public.planes p
                        where p.alumno_id = v_alumno.id and p.estado = 'activo' limit 1)) || '», que queda como completada.', '')
                   || chr(10) || chr(10) || '<i>Se crea su plan con los días de la rutina y queda activo desde hoy.</i>',
          'teclado', jsonb_build_array(jsonb_build_array(
            public.boton_telegram('✅ Asignar', 'pk:' || v_id), public.boton_telegram('↩ Volver', 'pl:' || v_alumno.id))));
      else
        v_nueva := public.asignar_plantilla(v_id, v_alumno.id, v_hoy);
        perform public.activar_plan(v_nueva);
        update public.conexiones_telegram set esperando = null, esperando_hasta = null where usuario_id = v_usuario;
        v_aviso := '✅ Rutina asignada';
        v_vista := public.vista_plan_tg(v_alumno, v_org, v_zona);
      end if;

    -- Solicitudes
    elsif v_accion in ('sa', 'sd', 'sD', 'sx') and v_id is not null then
      select * into v_s from public.solicitudes where id = v_id and organizacion_id = v_org;
      if not found then
        v_aviso := 'No encontré esa solicitud.';
      elsif v_accion = 'sd' and v_s.estado = 'nueva' then
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
        v_vista := jsonb_build_object('texto', public.texto_solicitud_telegram(v_s), 'teclado',
          public.teclado_solicitud_tg(v_s)
          || case when v_s.estado = 'aceptada' and v_s.alumno_id is not null
                  then jsonb_build_array(jsonb_build_array(public.boton_telegram('📅 Agendar su primera cita', 'ag:' || v_s.alumno_id)))
                  else '[]'::jsonb end);
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

  -- =============== Mensajes (texto o voz transcrita) ===============
  v_comando := case when v_voz then null else lower(substring(v_texto from '^/(\w+)')) end;
  v_resto := trim(regexp_replace(v_texto, '^/\w+(@\w+)?', ''));

  -- Respuesta a «Nota», «Peso», «Molestia» o a una nota de voz sin dueño (cualquier comando la cancela).
  if v_comando is null and v_con.esperando is not null and v_con.esperando_hasta > now() and v_texto <> ''
     and v_con.esperando ->> 'tipo' in ('nota', 'peso', 'molestia', 'voz') then
    if v_con.esperando ->> 'tipo' = 'voz' then
      -- Escribió a quién era la nota de voz.
      select * into v_eleccion from public.elegir_alumno_telegram(v_org, v_texto);
      if (v_eleccion.alumno).id is not null then
        perform public.guardar_nota_voz_tg(v_chat, v_usuario, v_eleccion.alumno, v_con.esperando ->> 'texto');
      else
        perform public.enviar_telegram(v_chat, coalesce(v_eleccion.problema, 'No encontré a ese alumno.') || chr(10) || '<i>/cancelar para dejarla</i>');
      end if;
      return 'voz';
    end if;

    select * into v_alumno from public.alumnos a where a.id = (v_con.esperando ->> 'alumno')::uuid and a.organizacion_id = v_org;
    if v_alumno.id is not null and v_con.esperando ->> 'tipo' in ('nota', 'molestia') then
      insert into public.notas_alumno (alumno_id, autor_id, contenido)
      values (v_alumno.id, v_usuario,
              case when v_voz then '🎙️ ' else '' end
              || case when v_con.esperando ->> 'tipo' = 'molestia'
                      then 'Molestia en la sesión del ' || coalesce((select public.fecha_corta_tg((c.inicia_en at time zone v_zona)::date)
                                                                    from public.citas c where c.id = (v_con.esperando ->> 'cita')::uuid), 'día') || ': '
                      else '' end
              || left(v_texto, 2000));
      update public.conexiones_telegram set esperando = null, esperando_hasta = null where usuario_id = v_usuario;
      perform public.enviar_telegram(v_chat,
        case when v_con.esperando ->> 'tipo' = 'molestia' then '🩹 <b>Molestia anotada</b>' else '📝 <b>Nota guardada</b>' end
        || ' en el perfil de ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '.'
        || case when v_voz then chr(10) || chr(10) || '<blockquote>' || public.html_telegram(left(v_texto, 1500)) || '</blockquote>' else '' end,
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id), public.boton_telegram('🏠 Inicio', 'm:menu'))));
      return 'nota';
    elsif v_alumno.id is not null and v_con.esperando ->> 'tipo' = 'peso' then
      v_numero := nullif(replace(substring(v_texto from '([0-9]+(?:[.,][0-9]+)?)\s*(?:kg|kilos)?\.?\s*$'), ',', '.'), '')::numeric;
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

  -- Nota de voz suelta: se guarda en el alumno que nombra; si no queda claro, se pregunta.
  if v_voz and v_texto <> '' then
    select array_agg(x) into v_lista from public.alumnos_mencionados_tg(v_org, v_texto) x;
    if array_length(v_lista, 1) = 1 then
      perform public.guardar_nota_voz_tg(v_chat, v_usuario, v_lista[1], v_texto);
    else
      update public.conexiones_telegram
         set esperando = jsonb_build_object('tipo', 'voz', 'texto', left(v_texto, 2000)), esperando_hasta = now() + interval '15 minutes'
       where usuario_id = v_usuario;
      perform public.enviar_telegram(v_chat,
        '🎙️ <b>Te escuché</b>' || chr(10) || chr(10) || '<blockquote>' || public.html_telegram(left(v_texto, 1500)) || '</blockquote>'
        || chr(10) || chr(10) || case when v_lista is null then '¿De quién es esta nota? Escribe su nombre.' else '¿De quién es esta nota?' end,
        case when v_lista is not null then
          (select jsonb_agg(jsonb_build_array(public.boton_telegram(x.nombres || ' ' || x.apellidos, 'nv:' || x.id))) from unnest(v_lista) x) end);
    end if;
    return 'voz';
  end if;

  if v_comando = 'cancelar' then
    perform public.enviar_telegram(v_chat, '👌 Listo, lo dejé.', jsonb_build_array(jsonb_build_array(public.boton_telegram('🏠 Inicio', 'm:menu'))));

  elsif v_comando in ('ayuda', 'help') or (v_comando is null and lower(v_texto) ~ '^(ayuda|como funciona|cómo funciona|que puedes hacer|qué puedes hacer)\M') then
    v_vista := public.vista_ayuda_tg();
    perform public.enviar_telegram(v_chat, v_vista ->> 'texto', v_vista -> 'teclado');

  elsif v_comando = 'alumnos' and v_resto = '' then
    v_vista := public.vista_alumnos_tg(v_org, 0);
    perform public.enviar_telegram(v_chat, v_vista ->> 'texto', v_vista -> 'teclado');

  elsif v_comando is null and lower(v_texto) ~ '^(hola|holi|buenas|buenos|buen dia|buen día|menu|menú|inicio|hey|hi|gracias)\M' then
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

  elsif (v_comando in ('alumno', 'nota', 'peso') and v_resto <> '') or (v_comando is null and v_texto <> '') then
    select array_agg(b) into v_lista
    from public.buscar_alumnos_telegram(v_org, split_part(coalesce(nullif(v_resto, ''), v_texto), ':', 1)) b;
    select * into v_eleccion from public.elegir_alumno_telegram(v_org, split_part(coalesce(nullif(v_resto, ''), v_texto), ':', 1));
    v_alumno := v_eleccion.alumno;
    if v_alumno.id is not null then
      v_vista := public.vista_alumno_tg(v_alumno, v_zona);
      perform public.enviar_telegram(v_chat, v_vista ->> 'texto', v_vista -> 'teclado');
      if v_comando in ('nota', 'peso') then
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
      perform public.enviar_telegram(v_chat, '🤔 <b>No encontré a «' || public.html_telegram(left(v_texto, 60)) || '»</b>'
        || chr(10) || chr(10) || 'Si buscabas un alumno, revisa cómo se escribe o elígelo de la lista.',
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👥 Mis alumnos', 'm:alu'), public.boton_telegram('🏠 Inicio', 'm:menu'))));
    else
      perform public.enviar_telegram(v_chat, '🤔 <b>No encontré a «' || public.html_telegram(left(v_resto, 60)) || '»</b>',
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👥 Mis alumnos', 'm:alu'), public.boton_telegram('🏠 Inicio', 'm:menu'))));
    end if;

  else
    perform public.enviar_telegram(v_chat, public.texto_menu_tg(v_usuario), public.teclado_menu_tg(v_org, v_zona));
  end if;
  return 'comando';
end;
$$;

revoke execute on function
  public.texto_menu_tg(uuid),
  public.teclado_menu_tg(uuid, text),
  public.vista_alumnos_tg(uuid, int),
  public.vista_ayuda_tg(),
  public.vista_dia_tg(uuid, uuid, date, text, text),
  public.vista_semana_tg(uuid, date, text),
  public.guardar_nota_voz_tg(bigint, uuid, public.alumnos, text),
  public.vista_alumno_tg(public.alumnos, text)
from authenticated, anon, public;

-- Comandos (el botón «Menú» azul de Telegram), en español y por defecto.
select public.telegram_api('setMyCommands', jsonb_build_object('language_code', 'es', 'commands', c.lista)),
       public.telegram_api('setMyCommands', jsonb_build_object('commands', c.lista))
from (select jsonb_build_array(
  jsonb_build_object('command', 'inicio', 'description', '🏠 Inicio: tu día de un vistazo'),
  jsonb_build_object('command', 'hoy', 'description', '📅 Mis citas de hoy'),
  jsonb_build_object('command', 'manana', 'description', '➡️ Mis citas de mañana'),
  jsonb_build_object('command', 'semana', 'description', '🗓️ Los próximos 7 días'),
  jsonb_build_object('command', 'alumnos', 'description', '👥 Mis alumnos (abrir su ficha)'),
  jsonb_build_object('command', 'solicitudes', 'description', '📥 Solicitudes por responder'),
  jsonb_build_object('command', 'ayuda', 'description', '❓ Cómo usar el bot'),
  jsonb_build_object('command', 'cancelar', 'description', '✖️ Dejar lo que estaba anotando')
) as lista) c;
