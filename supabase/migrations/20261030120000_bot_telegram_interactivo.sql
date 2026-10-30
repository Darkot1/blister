-- ============================================================
-- Bot de Telegram interactivo
--   1. Botones en los avisos: aceptar/descartar una solicitud; confirmar/cancelar
--      una cita (1 h antes) y, al terminar, marcarla completada o "no asistió".
--   2. Comandos: /hoy, /manana, /semana, /alumno, /solicitudes, /ayuda.
--   3. Anotar desde el chat: /nota <alumno>: <texto> y /peso <alumno> <kg>.
--   4. Más avisos en el resumen de la mañana (alumnos sin entrenar, faltas
--      seguidas, mediciones vencidas, planes por terminar, solicitudes sin
--      responder) y un resumen de la semana el domingo por la tarde.
--
--   Todo entra por telegram_procesar(), que llama la ruta /api/telegram con el
--   secreto del webhook. Identifica al usuario por su chat vinculado y, dentro de
--   la transacción, actúa como él (auth.uid()): así aceptar_solicitud, la
--   auditoría y las comprobaciones de pertenencia funcionan igual que en la app.
--
--   Google Calendar: la base no tiene los tokens de Google (los cifra Next). Una
--   cita cambiada desde el bot queda con google_pendiente y la app la sincroniza
--   la próxima vez que el entrenador entra (layout de la app, en segundo plano).
-- ============================================================

-- ------------------------------------------------------------
-- Estado nuevo
-- ------------------------------------------------------------
alter table public.citas
  add column google_pendiente boolean not null default false,
  add column google_avisar    boolean not null default false;

comment on column public.citas.google_pendiente is 'Cambiada fuera de la app (bot de Telegram): falta pasarla a Google Calendar.';
comment on column public.citas.google_avisar is 'Al sincronizar la pendiente, Google debe avisar al alumno (p. ej., la cancelaron).';

create index citas_google_pendiente_idx on public.citas(entrenador_id) where google_pendiente;

alter table public.conexiones_telegram add column ultimo_resumen_semanal date;

-- Un aviso antes de la cita y otro al terminar (con los botones de asistencia).
alter table public.avisos_telegram_citas
  add column tipo text not null default 'antes' check (tipo in ('antes', 'despues'));
alter table public.avisos_telegram_citas drop constraint avisos_telegram_citas_pkey;
alter table public.avisos_telegram_citas add primary key (cita_id, inicia_en, tipo);

-- ------------------------------------------------------------
-- Llamadas a la API de Telegram
-- ------------------------------------------------------------

/** Cualquier método de la API (asíncrono). Sin token, no hace nada; un error nunca se propaga. */
create or replace function public.telegram_api(p_metodo text, p_cuerpo jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_token text := public.secreto_vault('telegram_bot_token');
begin
  if v_token is null then return; end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/' || p_metodo,
    body := p_cuerpo,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  raise warning 'telegram_api %: %', p_metodo, sqlerrm;
end;
$$;

-- Ahora con teclado opcional (botones bajo el mensaje).
drop function public.enviar_telegram(bigint, text);
create or replace function public.enviar_telegram(p_chat_id bigint, p_texto text, p_teclado jsonb default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_chat_id is null then return; end if;
  perform public.telegram_api('sendMessage',
    jsonb_build_object('chat_id', p_chat_id, 'text', left(p_texto, 4000), 'parse_mode', 'HTML',
                       'link_preview_options', jsonb_build_object('is_disabled', true))
    || case when p_teclado is null then '{}'::jsonb else jsonb_build_object('reply_markup', jsonb_build_object('inline_keyboard', p_teclado)) end);
end;
$$;

/** Fila de un botón. */
create or replace function public.boton_telegram(p_texto text, p_dato text)
returns jsonb language sql immutable set search_path = ''
as $$ select jsonb_build_object('text', p_texto, 'callback_data', p_dato); $$;

-- ------------------------------------------------------------
-- Textos reutilizables
-- ------------------------------------------------------------

create or replace function public.texto_solicitud_telegram(p_s public.solicitudes)
returns text language sql stable security definer set search_path = ''
as $$
  select
    case p_s.tipo when 'registro' then '🙋 <b>Nueva solicitud para entrenar</b>' else '✉️ <b>Nuevo mensaje desde tu página</b>' end
    || chr(10) || chr(10) || '<b>' || public.html_telegram(trim(p_s.nombres || ' ' || p_s.apellidos)) || '</b>'
    || coalesce(chr(10) || 'Objetivo: ' || case p_s.objetivo
         when 'hipertrofia' then 'Ganar músculo'     when 'perdida_grasa' then 'Perder grasa'
         when 'fuerza' then 'Fuerza'                 when 'movilidad' then 'Movilidad'
         when 'resistencia' then 'Resistencia'       when 'tecnica' then 'Técnica'
         when 'rehabilitacion' then 'Rehabilitación' when 'salud_general' then 'Salud general' end, '')
    || coalesce(chr(10) || '📞 ' || public.html_telegram(p_s.telefono), '')
    || coalesce(chr(10) || '📧 ' || public.html_telegram(p_s.correo), '')
    || coalesce(chr(10) || chr(10) || '«' || public.html_telegram(left(p_s.mensaje, 600)) || '»', '')
    || coalesce(chr(10) || chr(10) || rtrim(public.secreto_vault('app_url'), '/') || '/alumnos/solicitudes', '');
$$;

create or replace function public.teclado_solicitud_telegram(p_id uuid)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_array(jsonb_build_array(
    public.boton_telegram('✅ Aceptar como alumno', 'sa:' || p_id),
    public.boton_telegram('Descartar', 'sd:' || p_id)));
$$;

/** Botones del aviso 1 h antes: confirmar (si aún no lo está) y cancelar. */
create or replace function public.teclado_cita_antes_telegram(p_id uuid, p_estado text)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_array(
    case when p_estado = 'programada'
      then jsonb_build_array(public.boton_telegram('👍 Confirmada', 'cf:' || p_id), public.boton_telegram('Cancelar', 'cc:' || p_id))
      else jsonb_build_array(public.boton_telegram('Cancelar', 'cc:' || p_id)) end);
$$;

create or replace function public.teclado_cita_despues_telegram(p_id uuid)
returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_build_array(jsonb_build_array(
    public.boton_telegram('✅ Completada', 'ck:' || p_id),
    public.boton_telegram('No asistió', 'cn:' || p_id)));
$$;

/** Un solo botón que ya no hace nada: deja escrito en el mensaje qué se decidió. */
create or replace function public.teclado_hecho_telegram(p_texto text)
returns jsonb language sql immutable set search_path = ''
as $$ select jsonb_build_array(jsonb_build_array(public.boton_telegram(p_texto, '-'))); $$;

create or replace function public.tipo_cita_telegram(p_tipo text)
returns text language sql immutable set search_path = ''
as $$
  select case p_tipo when 'entrenamiento' then 'Entrenamiento' when 'evaluacion' then 'Evaluación'
                     when 'consulta' then 'Consulta' else 'Otro' end;
$$;

/** "• 7:00 a. m. — Luis Gómez (Día A)" para cada cita vigente del entrenador ese día. Null si no hay. */
create or replace function public.lista_citas_dia_telegram(p_usuario uuid, p_dia date, p_zona text)
returns text language sql stable security definer set search_path = ''
as $$
  select string_agg(
           '• ' || public.hora_telegram(c.inicia_en, p_zona) || ' — ' || public.html_telegram(trim(a.nombres || ' ' || a.apellidos))
           || coalesce(' (' || public.html_telegram(d.nombre) || ')', '')
           || case when c.estado = 'confirmada' then ' 👍' else '' end,
           chr(10) order by c.inicia_en)
  from public.citas c
  join public.alumnos a on a.id = c.alumno_id
  left join public.sesiones s on s.id = c.sesion_id
  left join public.plan_dias d on d.id = s.plan_dia_id
  where c.entrenador_id = p_usuario
    and c.estado in ('programada', 'confirmada')
    and (c.inicia_en at time zone p_zona)::date = p_dia;
$$;

-- ------------------------------------------------------------
-- Solicitud nueva → aviso con botones
-- ------------------------------------------------------------
create or replace function public.avisar_solicitud_telegram()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_texto text := public.texto_solicitud_telegram(new);
  v_chat  bigint;
begin
  for v_chat in
    select t.chat_id
    from public.miembros_organizacion m
    join public.conexiones_telegram t on t.usuario_id = m.usuario_id and t.chat_id is not null
    where m.organizacion_id = new.organizacion_id and m.estado = 'activo'
      and m.rol in ('propietario', 'admin', 'entrenador')
  loop
    perform public.enviar_telegram(v_chat, v_texto, public.teclado_solicitud_telegram(new.id));
  end loop;
  return null;
exception when others then
  raise warning 'avisar_solicitud_telegram: %', sqlerrm;
  return null;
end;
$$;

-- ------------------------------------------------------------
-- Cita: cambio de estado hecho desde el bot (igual que cambiarEstadoCita en la app)
-- ------------------------------------------------------------
create or replace function public.cambiar_estado_cita_telegram(p_usuario uuid, p_cita uuid, p_estado text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_cita public.citas;
begin
  select * into v_cita from public.citas where id = p_cita and entrenador_id = p_usuario for update;
  if not found then return 'ajena'; end if;
  if v_cita.estado = p_estado then return 'igual'; end if;
  if v_cita.estado not in ('programada', 'confirmada')
     or (p_estado = 'confirmada' and v_cita.estado <> 'programada') then
    return 'cerrada:' || v_cita.estado;
  end if;

  update public.citas
     set estado = p_estado,
         google_pendiente = exists (select 1 from public.conexiones_google g where g.usuario_id = p_usuario),
         google_avisar = google_avisar or p_estado = 'cancelada'
   where id = p_cita;

  if v_cita.sesion_id is not null then
    update public.sesiones
       set estado = case p_estado when 'completada' then 'completada' when 'cancelada' then 'cancelada'
                                  when 'no_asistio' then 'omitida' else 'programada' end,
           completada_en = case when p_estado = 'completada' then now() end
     where id = v_cita.sesion_id;
  end if;
  return 'ok';
end;
$$;

-- ------------------------------------------------------------
-- Respuestas a los comandos
-- ------------------------------------------------------------

create or replace function public.ayuda_telegram()
returns text language sql immutable set search_path = ''
as $$
  select '<b>Lo que puedo hacer</b>' || chr(10) || chr(10)
    || '/hoy — tus citas de hoy' || chr(10)
    || '/manana — tus citas de mañana' || chr(10)
    || '/semana — los próximos 7 días' || chr(10)
    || '/alumno Ana — ficha rápida de un alumno' || chr(10)
    || '/solicitudes — las que esperan respuesta' || chr(10)
    || '/nota Ana: le molestó la rodilla — nota en su perfil' || chr(10)
    || '/peso Ana 64,5 — registra su peso' || chr(10) || chr(10)
    || 'Además te aviso de solicitudes nuevas, de tus citas (1 h antes y al terminar) y cada mañana te mando el día.';
$$;

/** Alumnos activos del espacio cuyo nombre contiene el texto (sin importar mayúsculas). */
create or replace function public.buscar_alumnos_telegram(p_org uuid, p_texto text)
returns setof public.alumnos language sql stable security definer set search_path = ''
as $$
  select a.* from public.alumnos a
  where a.organizacion_id = p_org and a.estado = 'activo'
    and lower(a.nombres || ' ' || a.apellidos) like '%' || lower(trim(p_texto)) || '%'
  order by a.nombres, a.apellidos
  limit 6;
$$;

/**
 * Un alumno a partir del texto, o el mensaje para pedir más precisión. Con varios resultados gana el que
 * coincide con el nombre completo, o con el de pila si nadie más se llama así.
 */
create or replace function public.elegir_alumno_telegram(p_org uuid, p_texto text, out alumno public.alumnos, out problema text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_lista public.alumnos[];
  v_q     text := lower(trim(coalesce(p_texto, '')));
begin
  if v_q = '' then problema := 'Escribe el nombre del alumno.'; return; end if;
  select array_agg(b) into v_lista from public.buscar_alumnos_telegram(p_org, v_q) b;
  if v_lista is null then
    problema := 'No encontré ningún alumno activo con «' || public.html_telegram(trim(p_texto)) || '».';
  elsif array_length(v_lista, 1) = 1 then
    alumno := v_lista[1];
  else
    select x into alumno from unnest(v_lista) x where lower(x.nombres || ' ' || x.apellidos) = v_q limit 1;
    if alumno.id is null and (select count(*) from unnest(v_lista) x where lower(x.nombres) = v_q) = 1 then
      select x into alumno from unnest(v_lista) x where lower(x.nombres) = v_q;
    end if;
    if alumno.id is null then
      problema := 'Hay varios. ¿Cuál?' || chr(10)
        || (select string_agg('• ' || public.html_telegram(x.nombres || ' ' || x.apellidos), chr(10)) from unnest(v_lista) x);
    end if;
  end if;
end;
$$;

create or replace function public.ficha_alumno_telegram(p_alumno public.alumnos, p_zona text)
returns text language sql stable security definer set search_path = ''
as $$
  select '<b>' || public.html_telegram(p_alumno.nombres || ' ' || p_alumno.apellidos) || '</b>'
    || coalesce(chr(10) || '🎯 ' || public.html_telegram((select o.nombre from public.objetivos_alumno o
         where o.alumno_id = p_alumno.id and o.estado = 'activo' order by o.es_principal desc, o.creado_en desc limit 1)), '')
    || coalesce(chr(10) || '📋 Plan: ' || public.html_telegram((select p.nombre from public.planes p
         where p.alumno_id = p_alumno.id and p.estado = 'activo' limit 1)), '')
    || chr(10) || '📅 Próxima cita: ' || coalesce((select to_char(c.inicia_en at time zone p_zona, 'DD/MM') || ' ' || public.hora_telegram(c.inicia_en, p_zona)
         from public.citas c where c.alumno_id = p_alumno.id and c.estado in ('programada', 'confirmada') and c.inicia_en > now()
         order by c.inicia_en limit 1), 'ninguna')
    || chr(10) || '🏋️ Última sesión: ' || coalesce((select to_char(c.inicia_en at time zone p_zona, 'DD/MM/YYYY')
         from public.citas c where c.alumno_id = p_alumno.id and c.estado = 'completada'
         order by c.inicia_en desc limit 1), 'ninguna')
    || coalesce((select chr(10) || '⚖️ Peso: ' || replace(to_char(m.peso_kg, 'FM999990.0'), '.', ',') || ' kg (' || to_char(m.medido_en at time zone p_zona, 'DD/MM/YYYY') || ')'
         from public.mediciones m where m.alumno_id = p_alumno.id and m.peso_kg is not null
         order by m.medido_en desc limit 1), '')
    || coalesce(chr(10) || '📞 ' || public.html_telegram(p_alumno.telefono), '')
    || coalesce(chr(10) || chr(10) || rtrim(public.secreto_vault('app_url'), '/') || '/alumnos/' || p_alumno.id, '');
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
  v_texto     text := trim(coalesce(p_update -> 'message' ->> 'text', ''));
  v_usuario   uuid;
  v_org       uuid;
  v_zona      text;
  v_comando   text;
  v_resto     text;
  v_dato      text;
  v_id        uuid;
  v_res       text;
  v_hecho     text;
  v_teclado   jsonb;
  v_s         public.solicitudes;
  v_alumno    public.alumnos;
  v_eleccion  record;
  v_problema  text;
  v_numero    numeric;
  v_anterior  numeric;
  v_dia       date;
  v_lineas    text;
  v_dias      text[] := array['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
begin
  if v_esperado is null or p_secreto is distinct from v_esperado then return 'no_autorizado'; end if;
  if v_chat is null or (v_mensaje -> 'chat' ->> 'type') is distinct from 'private' then return 'ignorado'; end if;

  -- Vincular: /start <codigo> (el enlace de Ajustes).
  if v_texto ~ '^/start(@\w+)?\s+[a-f0-9]{36}$' then
    return public.vincular_telegram(p_secreto, substring(v_texto from '([a-f0-9]{36})$'), v_chat);
  end if;

  select t.usuario_id into v_usuario from public.conexiones_telegram t where t.chat_id = v_chat;
  if v_usuario is null then
    if v_callback is not null then
      perform public.telegram_api('answerCallbackQuery', jsonb_build_object('callback_query_id', v_callback ->> 'id',
        'text', 'Este chat ya no está conectado a Blister.', 'show_alert', true));
    else
      perform public.enviar_telegram(v_chat, 'Para usar el bot, conéctalo desde <b>Ajustes → Avisos en Telegram</b> en Blister.');
    end if;
    return 'sin_vincular';
  end if;

  -- El espacio con el que trabaja (el mismo que abre la app: su membresía activa más antigua).
  select m.organizacion_id, o.zona_horaria into v_org, v_zona
  from public.miembros_organizacion m
  join public.organizaciones o on o.id = m.organizacion_id and o.estado = 'activo'
  where m.usuario_id = v_usuario and m.estado = 'activo' and m.rol in ('propietario', 'admin', 'entrenador')
  order by m.creado_en limit 1;
  if v_org is null then
    perform public.enviar_telegram(v_chat, 'Tu cuenta no tiene un espacio activo en Blister.');
    return 'sin_espacio';
  end if;

  -- Desde aquí, actúa como el usuario: auth.uid() es él (RPC, auditoría, pertenencia).
  perform set_config('request.jwt.claim.sub', v_usuario::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_usuario, 'role', 'authenticated')::text, true);

  -- ---------------- Botones ----------------
  if v_callback is not null then
    v_dato := v_callback ->> 'data';
    if v_dato is null or v_dato = '-' or v_dato !~ '^[a-zA-Z]{2}:[0-9a-f-]{36}$' then
      perform public.telegram_api('answerCallbackQuery', jsonb_build_object('callback_query_id', v_callback ->> 'id'));
      return 'nada';
    end if;
    v_id := substring(v_dato from 4)::uuid;
    v_comando := left(v_dato, 2);

    if v_comando in ('sa', 'sd', 'sD', 'sx') then
      select * into v_s from public.solicitudes where id = v_id and organizacion_id = v_org;
      if not found then
        v_hecho := 'No encontré esa solicitud.';
      elsif v_s.estado <> 'nueva' and v_comando <> 'sx' then
        v_hecho := case v_s.estado when 'aceptada' then '✅ Ya es alumno' else 'Descartada' end;
        v_teclado := public.teclado_hecho_telegram(v_hecho);
      elsif v_comando = 'sa' then
        perform public.aceptar_solicitud(v_id);
        v_hecho := '✅ Aceptada: ya es tu alumno';
        v_teclado := public.teclado_hecho_telegram(v_hecho);
      elsif v_comando = 'sd' then
        v_teclado := jsonb_build_array(jsonb_build_array(
          public.boton_telegram('Sí, descartar', 'sD:' || v_id), public.boton_telegram('No', 'sx:' || v_id)));
      elsif v_comando = 'sD' then
        update public.solicitudes set estado = 'descartada' where id = v_id;
        v_hecho := 'Descartada';
        v_teclado := public.teclado_hecho_telegram(v_hecho);
      else
        v_teclado := public.teclado_solicitud_telegram(v_id);
      end if;

    elsif v_comando in ('cf', 'cc', 'cC', 'cx', 'ck', 'cn') then
      if v_comando = 'cc' then
        v_teclado := jsonb_build_array(jsonb_build_array(
          public.boton_telegram('Sí, cancelar', 'cC:' || v_id), public.boton_telegram('No', 'cx:' || v_id)));
      elsif v_comando = 'cx' then
        select public.teclado_cita_antes_telegram(c.id, c.estado) into v_teclado
        from public.citas c where c.id = v_id and c.entrenador_id = v_usuario;
      else
        v_res := public.cambiar_estado_cita_telegram(v_usuario, v_id,
          case v_comando when 'cf' then 'confirmada' when 'cC' then 'cancelada' when 'ck' then 'completada' else 'no_asistio' end);
        v_hecho := case
          when v_res = 'ajena' then 'Esa cita no es tuya.'
          when v_res = 'ok' or v_res = 'igual' then case v_comando when 'cf' then '👍 Confirmada' when 'cC' then 'Cancelada'
                                                                 when 'ck' then '✅ Completada' else 'No asistió' end
          else 'Ya estaba ' || replace(replace(split_part(v_res, ':', 2), 'no_asistio', 'marcada como no asistió'), '_', ' ') end;
        if v_res <> 'ajena' then v_teclado := public.teclado_hecho_telegram(v_hecho); end if;
      end if;
    end if;

    perform public.telegram_api('answerCallbackQuery',
      jsonb_build_object('callback_query_id', v_callback ->> 'id')
      || case when v_hecho is null then '{}'::jsonb else jsonb_build_object('text', v_hecho) end);
    if v_teclado is not null then
      perform public.telegram_api('editMessageReplyMarkup', jsonb_build_object(
        'chat_id', v_chat, 'message_id', (v_mensaje ->> 'message_id')::bigint,
        'reply_markup', jsonb_build_object('inline_keyboard', v_teclado)));
    end if;
    return 'boton';
  end if;

  -- ---------------- Comandos ----------------
  v_comando := lower(substring(v_texto from '^/(\w+)'));
  v_resto := trim(regexp_replace(v_texto, '^/\w+(@\w+)?', ''));

  if v_comando in ('hoy', 'manana', 'mañana') then
    v_dia := (now() at time zone v_zona)::date + case when v_comando = 'hoy' then 0 else 1 end;
    v_lineas := public.lista_citas_dia_telegram(v_usuario, v_dia, v_zona);
    perform public.enviar_telegram(v_chat,
      '<b>' || case when v_comando = 'hoy' then 'Hoy' else 'Mañana' end || ', ' || v_dias[extract(isodow from v_dia)::int]
      || ' ' || extract(day from v_dia) || '</b>' || chr(10) || chr(10) || coalesce(v_lineas, 'Sin citas. 🙌'));

  elsif v_comando = 'semana' then
    select string_agg(
             '<b>' || initcap(v_dias[extract(isodow from d)::int]) || ' ' || extract(day from d) || '</b>' || chr(10)
             || coalesce(public.lista_citas_dia_telegram(v_usuario, d::date, v_zona), 'Libre'),
             chr(10) || chr(10) order by d)
      into v_lineas
    from generate_series((now() at time zone v_zona)::date, (now() at time zone v_zona)::date + 6, interval '1 day') d;
    perform public.enviar_telegram(v_chat, '📆 <b>Próximos 7 días</b> ('
      || (select count(*) from public.citas c where c.entrenador_id = v_usuario and c.estado in ('programada', 'confirmada')
            and (c.inicia_en at time zone v_zona)::date between (now() at time zone v_zona)::date and (now() at time zone v_zona)::date + 6)
      || ' citas)' || chr(10) || chr(10) || v_lineas);

  elsif v_comando = 'alumno' then
    select * into v_eleccion from public.elegir_alumno_telegram(v_org, v_resto);
    v_alumno := v_eleccion.alumno; v_problema := v_eleccion.problema;
    perform public.enviar_telegram(v_chat, coalesce(v_problema, public.ficha_alumno_telegram(v_alumno, v_zona)));

  elsif v_comando = 'solicitudes' then
    if not exists (select 1 from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva') then
      perform public.enviar_telegram(v_chat, 'No tienes solicitudes pendientes. ✨');
    else
      for v_s in select * from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva' order by s.creado_en desc limit 5 loop
        perform public.enviar_telegram(v_chat, public.texto_solicitud_telegram(v_s), public.teclado_solicitud_telegram(v_s.id));
      end loop;
      if (select count(*) from public.solicitudes s where s.organizacion_id = v_org and s.estado = 'nueva') > 5 then
        perform public.enviar_telegram(v_chat, 'Hay más en ' || coalesce(rtrim(public.secreto_vault('app_url'), '/'), '') || '/alumnos/solicitudes');
      end if;
    end if;

  elsif v_comando = 'nota' then
    if position(':' in v_resto) = 0 or trim(split_part(v_resto, ':', 2)) = '' then
      perform public.enviar_telegram(v_chat, 'Escríbela así: <code>/nota Ana: le molestó la rodilla</code>');
    else
      select * into v_eleccion from public.elegir_alumno_telegram(v_org, split_part(v_resto, ':', 1));
      v_alumno := v_eleccion.alumno; v_problema := v_eleccion.problema;
      if v_problema is not null then
        perform public.enviar_telegram(v_chat, v_problema);
      else
        insert into public.notas_alumno (alumno_id, autor_id, contenido)
        values (v_alumno.id, v_usuario, left(trim(substring(v_resto from position(':' in v_resto) + 1)), 2000));
        perform public.enviar_telegram(v_chat, '📝 Nota guardada en el perfil de <b>' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos) || '</b>.');
      end if;
    end if;

  elsif v_comando = 'peso' then
    v_numero := nullif(replace(substring(v_resto from '([0-9]+(?:[.,][0-9]+)?)\s*(?:kg)?$'), ',', '.'), '')::numeric;
    if v_numero is null or v_numero <= 20 or v_numero >= 400 then
      perform public.enviar_telegram(v_chat, 'Escríbelo así: <code>/peso Ana 64,5</code> (en kg).');
    else
      select * into v_eleccion from public.elegir_alumno_telegram(v_org, regexp_replace(v_resto, '\s*[0-9]+([.,][0-9]+)?\s*(kg)?$', ''));
      v_alumno := v_eleccion.alumno; v_problema := v_eleccion.problema;
      if v_problema is not null then
        perform public.enviar_telegram(v_chat, v_problema);
      else
        select m.peso_kg into v_anterior from public.mediciones m
         where m.alumno_id = v_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;
        insert into public.mediciones (alumno_id, registrado_por, peso_kg) values (v_alumno.id, v_usuario, round(v_numero, 2));
        perform public.enviar_telegram(v_chat, '⚖️ <b>' || public.html_telegram(v_alumno.nombres) || '</b>: ' || replace(to_char(v_numero, 'FM999990.0'), '.', ',') || ' kg'
          || coalesce(' (' || case when v_numero - v_anterior >= 0 then '+' else '' end || replace(to_char(v_numero - v_anterior, 'FM999990.0'), '.', ',') || ' kg desde la anterior)', ''));
      end if;
    end if;

  else
    perform public.enviar_telegram(v_chat, public.ayuda_telegram());
  end if;
  return 'comando';
end;
$$;

-- vincular_telegram sigue abierta (exige el mismo secreto) para que la versión anterior de la ruta
-- funcione mientras se publica esta; la nueva entra siempre por telegram_procesar.
revoke execute on function public.telegram_procesar(text, jsonb) from public;
grant execute on function public.telegram_procesar(text, jsonb) to anon, authenticated;

-- ------------------------------------------------------------
-- Cada 5 minutos: avisos de citas (antes y después), resumen diario y semanal
-- ------------------------------------------------------------
create or replace function public.procesar_avisos_telegram()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  r          record;
  v_lista    text;
  v_revisar  text;
  v_hoy      date;
  v_hora     int;
  v_lunes    date;
  v_hechas   int;
  v_faltas   int;
begin
  if public.secreto_vault('telegram_bot_token') is null then return; end if;

  -- 1. 1 h antes, con botones para confirmar o cancelar.
  for r in
    select c.id, c.inicia_en, c.termina_en, c.tipo, c.estado, t.chat_id, o.zona_horaria,
           trim(a.nombres || ' ' || a.apellidos) as alumno, d.nombre as dia
    from public.citas c
    join public.conexiones_telegram t on t.usuario_id = c.entrenador_id and t.chat_id is not null
    join public.organizaciones o on o.id = c.organizacion_id and o.estado = 'activo'
    join public.alumnos a on a.id = c.alumno_id
    left join public.sesiones s on s.id = c.sesion_id
    left join public.plan_dias d on d.id = s.plan_dia_id
    where c.estado in ('programada', 'confirmada')
      and c.inicia_en > now() and c.inicia_en <= now() + interval '1 hour'
      and not exists (select 1 from public.avisos_telegram_citas v where v.cita_id = c.id and v.inicia_en = c.inicia_en and v.tipo = 'antes')
  loop
    perform public.enviar_telegram(r.chat_id,
      '⏰ <b>Cita en ' || greatest(1, ceil(extract(epoch from r.inicia_en - now()) / 60))::int || ' min</b>' || chr(10)
      || public.html_telegram(r.alumno) || ' · ' || public.tipo_cita_telegram(r.tipo) || chr(10)
      || public.hora_telegram(r.inicia_en, r.zona_horaria) || ' – ' || public.hora_telegram(r.termina_en, r.zona_horaria)
      || coalesce(chr(10) || 'Toca: ' || public.html_telegram(r.dia), ''),
      public.teclado_cita_antes_telegram(r.id, r.estado));
    insert into public.avisos_telegram_citas (cita_id, inicia_en, tipo) values (r.id, r.inicia_en, 'antes') on conflict do nothing;
  end loop;

  -- 2. Al terminar (hasta 12 h después): ¿se hizo? Así la asistencia queda al día.
  for r in
    select c.id, c.inicia_en, t.chat_id, trim(a.nombres || ' ' || a.apellidos) as alumno
    from public.citas c
    join public.conexiones_telegram t on t.usuario_id = c.entrenador_id and t.chat_id is not null
    join public.organizaciones o on o.id = c.organizacion_id and o.estado = 'activo'
    join public.alumnos a on a.id = c.alumno_id
    where c.estado in ('programada', 'confirmada')
      and c.termina_en <= now() and c.termina_en > now() - interval '12 hours'
      and not exists (select 1 from public.avisos_telegram_citas v where v.cita_id = c.id and v.inicia_en = c.inicia_en and v.tipo = 'despues')
  loop
    perform public.enviar_telegram(r.chat_id, '¿Se hizo la sesión con <b>' || public.html_telegram(r.alumno) || '</b>?',
      public.teclado_cita_despues_telegram(r.id));
    insert into public.avisos_telegram_citas (cita_id, inicia_en, tipo) values (r.id, r.inicia_en, 'despues') on conflict do nothing;
  end loop;

  -- 3. Por usuario: resumen de la mañana (6 a 11) y de la semana (domingo, 6 a 9 p. m.).
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
    where t.chat_id is not null
  loop
    v_hoy := (now() at time zone r.zona)::date;
    v_hora := extract(hour from now() at time zone r.zona)::int;

    if v_hora between 6 and 10 and r.ultimo_resumen is distinct from v_hoy then
      v_lista := public.lista_citas_dia_telegram(r.usuario_id, v_hoy, r.zona);

      -- Lo que conviene revisar hoy en el espacio (cinco nombres como mucho por punto).
      select string_agg(linea, chr(10) order by orden) into v_revisar from (
        select '• Sin entrenar hace 14+ días: ' || string_agg(public.html_telegram(a.nombres || ' ' || a.apellidos), ', ' order by u.ultima)
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
        select '• Faltaron a sus 2 últimas citas: ' || string_agg(public.html_telegram(a.nombres || ' ' || a.apellidos), ', '), 2
        from public.alumnos a
        where a.organizacion_id = r.organizacion_id and a.estado = 'activo'
          and (select count(*) from (select c.estado from public.citas c where c.alumno_id = a.id and c.inicia_en < now()
                 and c.estado in ('completada', 'cancelada', 'no_asistio') order by c.inicia_en desc limit 2) x
               where x.estado in ('cancelada', 'no_asistio')) = 2
        having count(*) > 0
        union all
        select '• Toca medir (30+ días): ' || count(*) || ' alumno' || case when count(*) = 1 then '' else 's' end, 3
        from public.alumnos a
        where a.organizacion_id = r.organizacion_id and a.estado = 'activo'
          and coalesce((select max(m.medido_en) from public.mediciones m where m.alumno_id = a.id), a.creado_en) < now() - interval '30 days'
        having count(*) > 0
        union all
        select '• Plan que termina esta semana: ' || string_agg(public.html_telegram(a.nombres || ' ' || a.apellidos), ', '), 4
        from public.planes p join public.alumnos a on a.id = p.alumno_id
        where p.organizacion_id = r.organizacion_id and p.estado = 'activo' and p.fecha_fin between v_hoy and v_hoy + 7
        having count(*) > 0
        union all
        select '• Solicitudes sin responder: ' || count(*) || ' (escribe /solicitudes)', 5
        from public.solicitudes s join public.organizaciones o on o.id = s.organizacion_id
        where s.organizacion_id = r.organizacion_id and s.estado = 'nueva'
          and s.creado_en < now() - make_interval(hours => coalesce(o.respuesta_horas, 24))
        having count(*) > 0
      ) z;

      if v_lista is not null or v_revisar is not null then
        perform public.enviar_telegram(r.chat_id, '☀️ <b>Tus citas de hoy</b>' || chr(10) || chr(10) || coalesce(v_lista, 'Ninguna. 🙌')
          || coalesce(chr(10) || chr(10) || '<b>Para revisar</b>' || chr(10) || v_revisar, ''));
      end if;
      update public.conexiones_telegram set ultimo_resumen = v_hoy where usuario_id = r.usuario_id;
    end if;

    if extract(isodow from v_hoy) = 7 and v_hora between 18 and 20 and r.ultimo_resumen_semanal is distinct from v_hoy then
      v_lunes := v_hoy - 6;
      select count(*) filter (where c.estado = 'completada'), count(*) filter (where c.estado = 'no_asistio')
        into v_hechas, v_faltas
      from public.citas c
      where c.entrenador_id = r.usuario_id and (c.inicia_en at time zone r.zona)::date between v_lunes and v_hoy;

      perform public.enviar_telegram(r.chat_id, '📊 <b>Tu semana</b>' || chr(10) || chr(10)
        || '• Sesiones hechas: ' || v_hechas || chr(10)
        || '• Asistencia: ' || case when v_hechas + v_faltas = 0 then '—' else round(100.0 * v_hechas / (v_hechas + v_faltas)) || ' %' end || chr(10)
        || '• Alumnos nuevos: ' || (select count(*) from public.alumnos a where a.organizacion_id = r.organizacion_id
                                     and (a.creado_en at time zone r.zona)::date between v_lunes and v_hoy) || chr(10)
        || '• Solicitudes recibidas: ' || (select count(*) from public.solicitudes s where s.organizacion_id = r.organizacion_id
                                     and (s.creado_en at time zone r.zona)::date between v_lunes and v_hoy) || chr(10)
        || '• Citas la próxima semana: ' || (select count(*) from public.citas c where c.entrenador_id = r.usuario_id
                                     and c.estado in ('programada', 'confirmada')
                                     and (c.inicia_en at time zone r.zona)::date between v_hoy + 1 and v_hoy + 7));
      update public.conexiones_telegram set ultimo_resumen_semanal = v_hoy where usuario_id = r.usuario_id;
    end if;
  end loop;
end;
$$;

revoke execute on function
  public.telegram_api(text, jsonb),
  public.enviar_telegram(bigint, text, jsonb),
  public.boton_telegram(text, text),
  public.texto_solicitud_telegram(public.solicitudes),
  public.teclado_solicitud_telegram(uuid),
  public.teclado_cita_antes_telegram(uuid, text),
  public.teclado_cita_despues_telegram(uuid),
  public.teclado_hecho_telegram(text),
  public.tipo_cita_telegram(text),
  public.lista_citas_dia_telegram(uuid, date, text),
  public.cambiar_estado_cita_telegram(uuid, uuid, text),
  public.ayuda_telegram(),
  public.buscar_alumnos_telegram(uuid, text),
  public.elegir_alumno_telegram(uuid, text),
  public.ficha_alumno_telegram(public.alumnos, text),
  public.avisar_solicitud_telegram(),
  public.procesar_avisos_telegram()
from authenticated, anon, public;

-- El menú de comandos del bot (botón "/" en el chat). Sin token, no pasa nada.
select public.telegram_api('setMyCommands', jsonb_build_object('language_code', 'es', 'commands', jsonb_build_array(
  jsonb_build_object('command', 'hoy', 'description', 'Tus citas de hoy'),
  jsonb_build_object('command', 'manana', 'description', 'Tus citas de mañana'),
  jsonb_build_object('command', 'semana', 'description', 'Los próximos 7 días'),
  jsonb_build_object('command', 'alumno', 'description', 'Ficha rápida: /alumno Ana'),
  jsonb_build_object('command', 'solicitudes', 'description', 'Solicitudes sin responder'),
  jsonb_build_object('command', 'nota', 'description', 'Nota: /nota Ana: texto'),
  jsonb_build_object('command', 'peso', 'description', 'Peso: /peso Ana 64,5'),
  jsonb_build_object('command', 'ayuda', 'description', 'Qué puedo hacer')
)));
select public.telegram_api('setMyCommands', jsonb_build_object('commands', jsonb_build_array(
  jsonb_build_object('command', 'hoy', 'description', 'Tus citas de hoy'),
  jsonb_build_object('command', 'manana', 'description', 'Tus citas de mañana'),
  jsonb_build_object('command', 'semana', 'description', 'Los próximos 7 días'),
  jsonb_build_object('command', 'alumno', 'description', 'Ficha rápida: /alumno Ana'),
  jsonb_build_object('command', 'solicitudes', 'description', 'Solicitudes sin responder'),
  jsonb_build_object('command', 'nota', 'description', 'Nota: /nota Ana: texto'),
  jsonb_build_object('command', 'peso', 'description', 'Peso: /peso Ana 64,5'),
  jsonb_build_object('command', 'ayuda', 'description', 'Qué puedo hacer')
)));
