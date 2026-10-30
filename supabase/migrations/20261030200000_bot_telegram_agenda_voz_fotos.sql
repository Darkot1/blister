-- ============================================================
-- Bot de Telegram: agenda, rutina, esfuerzo, notas de voz y fotos
--   1. Agendar desde la ficha («📅 Agendar») y mover una cita desde su aviso
--      («🔁 Mover»): día y hora con botones, solo las horas en que estás libre.
--      La cita nueva lleva el día del plan que le toca (con su sesión).
--   2. «🏋️ Rutina»: los ejercicios del día del plan (series, reps, RIR, descanso).
--   3. Al marcar una sesión como hecha: esfuerzo (RPE 1–10) y si hubo molestias.
--   4. Notas de voz: /api/telegram transcribe el audio (Groq) y lo manda aquí
--      como texto con "voz": true; si nombra a un alumno, queda como su nota.
--   5. Fotos de progreso: telegram_preparar_archivo da una ruta de un solo uso
--      (5 min) en fotos-progreso/{organizacion}/{alumno}/; la ruta sube la foto con
--      la clave pública (política de storage solo para esa ruta) y
--      telegram_confirmar_foto la registra en fotos_progreso.
-- ============================================================

-- ------------------------------------------------------------
-- Subidas de fotos permitidas al webhook (una por ruta, 5 minutos)
-- ------------------------------------------------------------
create table public.subidas_telegram (
  ruta       text primary key,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  alumno_id  uuid not null references public.alumnos(id) on delete cascade,
  chat_id    bigint not null,
  nota       text check (char_length(nota) <= 500),
  expira_en  timestamptz not null default now() + interval '5 minutes',
  usada_en   timestamptz,
  creado_en  timestamptz not null default now()
);

alter table public.subidas_telegram enable row level security;
revoke all on public.subidas_telegram from authenticated, anon;

create or replace function public.subida_telegram_valida(p_ruta text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.subidas_telegram s where s.ruta = p_ruta and s.usada_en is null and s.expira_en > now());
$$;
revoke execute on function public.subida_telegram_valida(text) from public;
grant execute on function public.subida_telegram_valida(text) to anon;

-- Solo la ruta exacta que dio la base, sin usar y antes de que venza.
create policy fotos_telegram_subir on storage.objects for insert to anon
  with check (bucket_id = 'fotos-progreso' and public.subida_telegram_valida(name));

/** Primera letra en mayúscula ("Viernes 30 de octubre"). */
create or replace function public.capital_tg(p_texto text)
returns text language sql immutable set search_path = ''
as $$ select upper(left(p_texto, 1)) || substring(p_texto from 2); $$;

-- ------------------------------------------------------------
-- Plan: el día que le toca y su rutina
-- ------------------------------------------------------------

/** Día del plan activo que sigue al de la última sesión agendada (o el primero). Como `planesActivos` en la app. */
create or replace function public.siguiente_dia_plan_tg(p_alumno uuid)
returns uuid language sql stable security definer set search_path = ''
as $$
  with plan as (select p.id from public.planes p where p.alumno_id = p_alumno and p.estado = 'activo' limit 1),
       dias as (select d.id, d.orden, row_number() over (order by d.orden) as n, count(*) over () as total
                from public.plan_dias d where d.plan_id = (select id from plan)),
       ultimo as (select s.plan_dia_id from public.sesiones s
                  where s.plan_id = (select id from plan) and s.plan_dia_id is not null
                    and s.estado in ('programada', 'en_curso', 'completada')
                  order by s.programada_para desc nulls last, s.id limit 1)
  select coalesce(
    (select d2.id from dias d1 join dias d2 on d2.n = d1.n % d1.total + 1 where d1.id = (select plan_dia_id from ultimo)),
    (select id from dias where n = 1));
$$;

create or replace function public.texto_rutina_tg(p_plan_dia uuid, p_alumno text)
returns text language sql stable security definer set search_path = ''
as $$
  select '🏋️ <b>' || public.html_telegram(d.nombre) || '</b>' || coalesce(' · ' || p_alumno, '')
    || chr(10) || '<i>' || public.html_telegram(p.nombre) || '</i>'
    || coalesce(chr(10) || chr(10) || (
         select string_agg(
                  '<b>' || public.html_telegram(b.nombre) || '</b>' || coalesce(' · ' || b.rondas || ' rondas', '')
                  || coalesce(chr(10) || (
                       select string_agg(
                                '• ' || public.html_telegram(e.nombre)
                                || coalesce(' — ' || nullif(concat_ws(' · ',
                                     case when pe.series is not null then pe.series || '×' || coalesce(nullif(pe.repeticiones, ''), '?')
                                          else nullif(pe.repeticiones, '') end,
                                     case when pe.peso is not null then replace(rtrim(rtrim(to_char(pe.peso, 'FM99990.99'), '0'), '.'), '.', ',') || ' ' || pe.unidad_peso end,
                                     case when pe.rir is not null then 'RIR ' || replace(rtrim(rtrim(to_char(pe.rir, 'FM90.9'), '0'), '.'), '.', ',') end,
                                     case when pe.descanso_segundos is not null then
                                       case when pe.descanso_segundos >= 60 and pe.descanso_segundos % 60 = 0 then (pe.descanso_segundos / 60) || ' min'
                                            else pe.descanso_segundos || ' s' end || ' desc.' end), ''), '')
                                || coalesce(chr(10) || '   <i>' || public.html_telegram(left(nullif(pe.notas, ''), 120)) || '</i>', ''),
                                chr(10) order by pe.orden)
                       from public.plan_ejercicios pe join public.ejercicios e on e.id = pe.ejercicio_id
                       where pe.plan_bloque_id = b.id), ''),
                  chr(10) || chr(10) order by b.orden)
         from public.plan_bloques b where b.plan_dia_id = d.id), chr(10) || chr(10) || 'Este día aún no tiene ejercicios.')
  from public.plan_dias d join public.planes p on p.id = d.plan_id
  where d.id = p_plan_dia;
$$;

-- ------------------------------------------------------------
-- Elegir día y hora con botones (agendar «a», mover «m»)
-- ------------------------------------------------------------

/** Los próximos 7 días: Hoy, Mañana y los demás por nombre. */
create or replace function public.teclado_dias_tg(p_pre text, p_id uuid, p_zona text, p_volver text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with dias as (
    select (now() at time zone p_zona)::date + n as dia, n from generate_series(0, 6) n
  )
  select jsonb_build_array(
      (select jsonb_agg(public.boton_telegram(case n when 0 then 'Hoy' when 1 then 'Mañana' else public.fecha_corta_tg(dia) end,
                                              p_pre || 'd:' || p_id || ':' || to_char(dia, 'YYYYMMDD')) order by n) from dias where n < 3),
      (select jsonb_agg(public.boton_telegram(public.fecha_corta_tg(dia), p_pre || 'd:' || p_id || ':' || to_char(dia, 'YYYYMMDD')) order by n)
       from dias where n >= 3),
      jsonb_build_array(public.boton_telegram('↩ Volver', p_volver)));
$$;

/**
 * Horas en punto de 6 a. m. a 9 p. m. en que el entrenador está libre `p_minutos` (sin cruzarse con otra
 * cita vigente, salvo la que se está moviendo) y que aún no pasaron. Cuatro por fila.
 */
create or replace function public.teclado_horas_tg(p_pre text, p_id uuid, p_dia date, p_usuario uuid, p_zona text,
                                                    p_minutos int, p_excluir uuid, p_volver text)
returns jsonb language sql stable security definer set search_path = ''
as $$
  with horas as (
    select h, (p_dia + make_time(h, 0, 0)) at time zone p_zona as inicio from generate_series(6, 21) h
  ), libres as (
    select h, row_number() over (order by h) - 1 as i from horas
    where inicio > now()
      and not exists (select 1 from public.citas c
                      where c.entrenador_id = p_usuario and c.estado not in ('cancelada', 'reprogramada', 'no_asistio')
                        and c.id is distinct from p_excluir
                        and tstzrange(c.inicia_en, c.termina_en) && tstzrange(inicio, inicio + make_interval(mins => p_minutos)))
  )
  select coalesce((select jsonb_agg(fila order by g)
                   from (select i / 4 as g, jsonb_agg(public.boton_telegram(
                                  case when h = 12 then '12 m.' when h < 12 then h || ' a. m.' else (h - 12) || ' p. m.' end,
                                  p_pre || 'h:' || p_id || ':' || to_char(p_dia, 'YYYYMMDD') || lpad(h::text, 2, '0')) order by h) as fila
                         from libres group by i / 4) f), '[]'::jsonb)
    || jsonb_build_array(jsonb_build_array(public.boton_telegram('◀ Otro día', p_volver)));
$$;

/** "AAAAMMDDHH" en la zona del espacio → instante. Null si no es una hora válida. */
create or replace function public.instante_tg(p_valor text, p_zona text)
returns timestamptz language plpgsql stable set search_path = ''
as $$
begin
  if p_valor !~ '^\d{10}$' then return null; end if;
  return (to_date(left(p_valor, 8), 'YYYYMMDD') + make_time(substring(p_valor from 9 for 2)::int, 0, 0)) at time zone p_zona;
exception when others then
  return null;
end;
$$;

-- ------------------------------------------------------------
-- Cita: texto y botones con las acciones nuevas
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
      when c.inicia_en > now() + interval '2 hours' then '📅 <b>Cita con ' || n.alumno || '</b>'
      when c.inicia_en > now() then '⏰ <b>En ' || greatest(1, ceil(extract(epoch from c.inicia_en - now()) / 60))::int || ' min · ' || n.alumno || '</b>'
      else '▶️ <b>Ahora · ' || n.alumno || '</b>'
    end
    || chr(10) || chr(10) || '🕖 ' || public.hora_telegram(c.inicia_en, o.zona_horaria) || ' – ' || public.hora_telegram(c.termina_en, o.zona_horaria)
    || case when (c.inicia_en at time zone o.zona_horaria)::date <> (now() at time zone o.zona_horaria)::date
            then ' · ' || public.fecha_corta_tg((c.inicia_en at time zone o.zona_horaria)::date) else '' end
    || chr(10) || '🏋️ ' || public.tipo_cita_telegram(c.tipo) || coalesce(' · ' || public.html_telegram(d.nombre), '')
    || case when c.estado = 'confirmada' and p_modo = 'antes' then chr(10) || '👍 Confirmada' else '' end
    || case when c.estado = 'completada' and s.rpe_sesion is not null
              then chr(10) || '💪 Esfuerzo: <b>' || replace(rtrim(rtrim(to_char(s.rpe_sesion, 'FM90.9'), '0'), '.'), '.', ',') || '/10</b>'
            when c.estado = 'completada' and s.id is not null and p_modo = 'despues'
              then chr(10) || chr(10) || '💪 <b>¿Qué tan dura fue?</b>' || chr(10) || '<i>1 = muy fácil · 10 = al límite</i>'
            when c.estado = 'completada' and p_modo = 'despues' then chr(10) || chr(10) || '¿Anotas algo de la sesión?'
            else '' end
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
      when c.estado in ('programada', 'confirmada') and p_modo = 'antes' then
        jsonb_build_array(
          case when c.estado = 'programada'
               then jsonb_build_array(public.boton_telegram('👍 Confirmar', 'cf:' || c.id), public.boton_telegram('✖️ Cancelar', 'cc:' || c.id))
               else jsonb_build_array(public.boton_telegram('✖️ Cancelar', 'cc:' || c.id)) end,
          jsonb_build_array(public.boton_telegram('🔁 Mover', 'mv:' || c.id), public.boton_telegram('🏋️ Rutina', 'vr:' || c.id)),
          jsonb_build_array(public.boton_telegram('👤 Ficha de ' || a.nombres, 'af:' || a.id)))
      when c.estado in ('programada', 'confirmada') then jsonb_build_array(
             jsonb_build_array(public.boton_telegram('✅ Sí, se hizo', 'ck:' || c.id), public.boton_telegram('🚫 No asistió', 'cn:' || c.id)))
      -- Recién hecha: primero el esfuerzo (si hay sesión), luego lo demás.
      when c.estado = 'completada' and s.id is not null and s.rpe_sesion is null and p_modo = 'despues' then jsonb_build_array(
             (select jsonb_agg(public.boton_telegram(n::text, 'rp:' || c.id || ':' || n) order by n) from generate_series(1, 5) n),
             (select jsonb_agg(public.boton_telegram(n::text, 'rp:' || c.id || ':' || n) order by n) from generate_series(6, 10) n),
             jsonb_build_array(public.boton_telegram('Saltar', 'rs:' || c.id)))
      when c.estado = 'completada' then jsonb_build_array(
             jsonb_build_array(public.boton_telegram('⚖️ Peso', 'ap:' || a.id), public.boton_telegram('📝 Nota', 'an:' || a.id)),
             jsonb_build_array(public.boton_telegram('📅 Agendar la próxima', 'ag:' || a.id)))
      else jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ficha de ' || a.nombres, 'af:' || a.id), public.boton_telegram('📅 Reagendar', 'ag:' || a.id)))
         || case when c.estado = 'no_asistio' and public.whatsapp_tg(a.telefono) is not null
                 then jsonb_build_array(jsonb_build_array(public.boton_url_tg('💬 Escribirle', public.whatsapp_tg(a.telefono))))
                 else '[]'::jsonb end
    end
  from public.citas c join public.alumnos a on a.id = c.alumno_id
  left join public.sesiones s on s.id = c.sesion_id
  where c.id = p_cita;
$$;

-- ------------------------------------------------------------
-- Ficha: agendar, rutina y foto
-- ------------------------------------------------------------
create or replace function public.vista_alumno_tg(p_alumno public.alumnos, p_zona text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_texto text;
  v_peso  record;
  v_hoy   date := (now() at time zone p_zona)::date;
  v_fotos int;
begin
  select m.peso_kg, m.medido_en,
         m.peso_kg - (select m2.peso_kg from public.mediciones m2 where m2.alumno_id = p_alumno.id and m2.peso_kg is not null
                      and m2.medido_en < m.medido_en order by m2.medido_en desc limit 1) as cambio
    into v_peso
  from public.mediciones m where m.alumno_id = p_alumno.id and m.peso_kg is not null order by m.medido_en desc limit 1;
  select count(*) into v_fotos from public.fotos_progreso f where f.alumno_id = p_alumno.id;

  v_texto := '👤 <b>' || public.html_telegram(p_alumno.nombres || ' ' || p_alumno.apellidos) || '</b>'
    || coalesce(' · ' || extract(year from age(current_date, p_alumno.fecha_nacimiento))::int || ' años', '')
    || coalesce(chr(10) || '🎯 ' || public.html_telegram((select o.nombre from public.objetivos_alumno o
         where o.alumno_id = p_alumno.id and o.estado = 'activo' order by o.es_principal desc, o.creado_en desc limit 1)), '')
    || coalesce(chr(10) || '📋 ' || public.html_telegram((select p.nombre from public.planes p
         where p.alumno_id = p_alumno.id and p.estado = 'activo' limit 1))
         || coalesce(' · le toca <b>' || public.html_telegram((select d.nombre from public.plan_dias d where d.id = public.siguiente_dia_plan_tg(p_alumno.id))) || '</b>', ''), '')
    || coalesce(chr(10) || chr(10) || '🩹 <b>A tener en cuenta</b>' || chr(10) || (select string_agg('• ' || public.html_telegram(left(k.descripcion, 160)), chr(10))
         from (select k.descripcion from public.condiciones_alumno k where k.alumno_id = p_alumno.id and k.estado = 'activo'
               order by k.creado_en desc limit 3) k), '')
    || chr(10) || chr(10) || '📅 Próxima cita: ' || coalesce((select '<b>' || public.fecha_corta_tg((c.inicia_en at time zone p_zona)::date) || ', '
              || public.hora_telegram(c.inicia_en, p_zona) || '</b>'
         from public.citas c where c.alumno_id = p_alumno.id and c.estado in ('programada', 'confirmada') and c.inicia_en > now()
         order by c.inicia_en limit 1), '<i>ninguna</i>')
    || chr(10) || '🏋️ Última sesión: ' || coalesce((select public.fecha_corta_tg(x.dia)
              || ' <i>(' || case v_hoy - x.dia when 0 then 'hoy' when 1 then 'ayer' else 'hace ' || (v_hoy - x.dia) || ' días' end || ')</i>'
              || coalesce(' · 💪 ' || replace(rtrim(rtrim(to_char(x.rpe, 'FM90.9'), '0'), '.'), '.', ',') || '/10', '')
         from (select (c.inicia_en at time zone p_zona)::date as dia, s.rpe_sesion as rpe from public.citas c
               left join public.sesiones s on s.id = c.sesion_id
               where c.alumno_id = p_alumno.id and c.estado = 'completada' order by c.inicia_en desc limit 1) x), '<i>ninguna</i>')
    || case when v_peso.peso_kg is null then ''
            else chr(10) || '⚖️ Peso: <b>' || replace(to_char(v_peso.peso_kg, 'FM999990.0'), '.', ',') || ' kg</b>'
                 || coalesce(' (' || case when v_peso.cambio >= 0 then '+' else '' end || replace(to_char(v_peso.cambio, 'FM999990.0'), '.', ',') || ')', '')
                 || ' <i>' || public.fecha_corta_tg((v_peso.medido_en at time zone p_zona)::date) || '</i>' end
    || case when v_fotos > 0 then chr(10) || '📸 ' || v_fotos || ' foto' || case when v_fotos = 1 then '' else 's' end || ' de progreso' else '' end
    || coalesce(chr(10) || '📞 ' || public.html_telegram(p_alumno.telefono), '');

  return jsonb_build_object('texto', v_texto, 'teclado',
    jsonb_build_array(
      jsonb_build_array(public.boton_telegram('📅 Agendar', 'ag:' || p_alumno.id), public.boton_telegram('🏋️ Rutina', 'va:' || p_alumno.id)),
      jsonb_build_array(public.boton_telegram('📝 Nota', 'an:' || p_alumno.id), public.boton_telegram('⚖️ Peso', 'ap:' || p_alumno.id),
                        public.boton_telegram('📸 Foto', 'fo:' || p_alumno.id)))
    || case when public.whatsapp_tg(p_alumno.telefono) is null and public.url_app_tg('/') is null then '[]'::jsonb
            else jsonb_build_array(
                   case when public.whatsapp_tg(p_alumno.telefono) is not null then jsonb_build_array(public.boton_url_tg('💬 WhatsApp', public.whatsapp_tg(p_alumno.telefono))) else '[]'::jsonb end
                   || case when public.url_app_tg('/') is not null then jsonb_build_array(public.boton_url_tg('🔗 Abrir en Blister', public.url_app_tg('/alumnos/' || p_alumno.id))) else '[]'::jsonb end)
       end
    || jsonb_build_array(jsonb_build_array(public.boton_telegram('☰ Menú', 'm:menu'))));
end;
$$;

create or replace function public.texto_menu_tg(p_usuario uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select '👋 <b>Hola' || coalesce(', ' || public.html_telegram(nullif((select p.nombres from public.perfiles p where p.id = p_usuario), '')), '') || '</b>'
    || chr(10) || chr(10) || 'Toca un botón o escribe el <b>nombre de un alumno</b> para ver su ficha (desde ahí agendas, ves su rutina o anotas).'
    || chr(10) || chr(10) || '🎙️ Mándame una <b>nota de voz</b> nombrando al alumno y la guardo en su perfil.'
    || chr(10) || '📸 Mándame una <b>foto</b> con su nombre en el texto y la guardo como foto de progreso.'
    || chr(10) || chr(10) || '<i>Atajos</i>'
    || chr(10) || '<code>/nota Ana: le molestó la rodilla</code>'
    || chr(10) || '<code>/peso Ana 64,5</code>';
$$;

-- ------------------------------------------------------------
-- Notas de voz: ¿a quién nombra?
-- ------------------------------------------------------------

/** Alumnos activos cuyo nombre (o nombre y apellido) aparece en el texto como palabra. */
create or replace function public.alumnos_mencionados_tg(p_org uuid, p_texto text)
returns setof public.alumnos language sql stable security definer set search_path = ''
as $$
  select a.* from public.alumnos a
  where a.organizacion_id = p_org and a.estado = 'activo'
    and lower(p_texto) ~ ('\m' || regexp_replace(lower(a.nombres), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g') || '\M')
  order by (lower(p_texto) like '%' || lower(a.nombres || ' ' || a.apellidos) || '%') desc, a.nombres
  limit 6;
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
    jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || p_alumno.id), public.boton_telegram('☰ Menú', 'm:menu'))));
end;
$$;

-- ------------------------------------------------------------
-- Archivos (voz y fotos): lo que necesita la ruta de Next
-- ------------------------------------------------------------

/**
 * La ruta /api/telegram la llama al recibir un audio o una foto. Devuelve qué hacer:
 *   {"accion": "voz", "token", "archivo"}            → transcribir y volver a telegram_procesar
 *   {"accion": "foto", "token", "archivo", "ruta"}   → subir a esa ruta y llamar a telegram_confirmar_foto
 *   {}                                               → nada (ya se le respondió al usuario)
 * El token del bot solo sale hacia quien tiene el secreto del webhook (el servidor de Next).
 */
create or replace function public.telegram_preparar_archivo(p_secreto text, p_update jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_mensaje jsonb := p_update -> 'message';
  v_chat    bigint := (v_mensaje -> 'chat' ->> 'id')::bigint;
  v_con     public.conexiones_telegram;
  v_org     uuid;
  v_alumno  public.alumnos;
  v_eleccion record;
  v_texto   text := trim(coalesce(v_mensaje ->> 'caption', ''));
  v_ruta    text;
begin
  if public.secreto_vault('telegram_webhook_secreto') is null or p_secreto is distinct from public.secreto_vault('telegram_webhook_secreto') then
    return '{}'::jsonb;
  end if;
  if v_chat is null or (v_mensaje -> 'chat' ->> 'type') is distinct from 'private' then return '{}'::jsonb; end if;

  select * into v_con from public.conexiones_telegram t where t.chat_id = v_chat;
  if v_con.usuario_id is null then
    perform public.enviar_telegram(v_chat, '🔌 <b>Este chat no está conectado</b>' || chr(10) || chr(10) || 'Conéctalo desde <b>Ajustes → Avisos en Telegram</b> en Blister.');
    return '{}'::jsonb;
  end if;
  select m.organizacion_id into v_org
  from public.miembros_organizacion m join public.organizaciones o on o.id = m.organizacion_id and o.estado = 'activo'
  where m.usuario_id = v_con.usuario_id and m.estado = 'activo' and m.rol in ('propietario', 'admin', 'entrenador')
  order by m.creado_en limit 1;
  if v_org is null then return '{}'::jsonb; end if;

  if v_mensaje ? 'voice' or v_mensaje ? 'audio' then
    return jsonb_build_object('accion', 'voz', 'token', public.secreto_vault('telegram_bot_token'),
      'archivo', coalesce(v_mensaje #>> '{voice,file_id}', v_mensaje #>> '{audio,file_id}'));
  end if;

  if v_mensaje ? 'photo' then
    -- ¿De quién? Del nombre en el texto de la foto o de «📸 Foto» en una ficha.
    if v_texto <> '' then
      select * into v_eleccion from public.elegir_alumno_telegram(v_org, split_part(split_part(v_texto, ':', 1), chr(10), 1));
      v_alumno := v_eleccion.alumno;
      if v_alumno.id is null then
        select * into v_alumno from public.alumnos_mencionados_tg(v_org, v_texto) limit 1;
      end if;
    end if;
    if v_alumno.id is null and v_con.esperando ->> 'tipo' = 'foto' and v_con.esperando_hasta > now() then
      select * into v_alumno from public.alumnos a where a.id = (v_con.esperando ->> 'alumno')::uuid and a.organizacion_id = v_org;
    end if;
    if v_alumno.id is null then
      perform public.enviar_telegram(v_chat, '📸 <b>¿De quién es la foto?</b>' || chr(10) || chr(10)
        || 'Mándala otra vez con el <b>nombre del alumno</b> en el texto de la foto, o toca <b>📸 Foto</b> en su ficha.');
      return '{}'::jsonb;
    end if;

    v_ruta := v_org || '/' || v_alumno.id || '/telegram-' || gen_random_uuid() || '.jpg';
    insert into public.subidas_telegram (ruta, usuario_id, alumno_id, chat_id, nota)
    values (v_ruta, v_con.usuario_id, v_alumno.id, v_chat, nullif(left(v_texto, 500), ''));
    return jsonb_build_object('accion', 'foto', 'token', public.secreto_vault('telegram_bot_token'),
      'archivo', (v_mensaje -> 'photo' -> -1) ->> 'file_id', 'ruta', v_ruta);
  end if;
  return '{}'::jsonb;
end;
$$;

/** Tras subir la foto (o no poder): la registra y avisa. */
create or replace function public.telegram_confirmar_foto(p_secreto text, p_ruta text, p_ok boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_sub    public.subidas_telegram;
  v_alumno public.alumnos;
begin
  if public.secreto_vault('telegram_webhook_secreto') is null or p_secreto is distinct from public.secreto_vault('telegram_webhook_secreto') then
    return;
  end if;
  update public.subidas_telegram set usada_en = now() where ruta = p_ruta and usada_en is null returning * into v_sub;
  if v_sub.ruta is null then return; end if;
  select * into v_alumno from public.alumnos where id = v_sub.alumno_id;

  if not p_ok or not exists (select 1 from storage.objects o where o.bucket_id = 'fotos-progreso' and o.name = p_ruta) then
    perform public.enviar_telegram(v_sub.chat_id, '⚠️ No pude guardar la foto. Inténtalo de nuevo en un momento.');
    return;
  end if;

  insert into public.fotos_progreso (alumno_id, subida_por, ruta_storage, categoria, notas)
  values (v_sub.alumno_id, v_sub.usuario_id, p_ruta, 'otra', v_sub.nota);
  update public.conexiones_telegram set esperando = null, esperando_hasta = null
   where usuario_id = v_sub.usuario_id and esperando ->> 'tipo' = 'foto';

  perform public.enviar_telegram(v_sub.chat_id,
    '📸 <b>Foto guardada</b> en el perfil de ' || public.html_telegram(v_alumno.nombres || ' ' || v_alumno.apellidos)
    || chr(10) || '<i>' || (select case when count(*) = 1 then 'Es su primera foto de progreso' else count(*) || ' fotos de progreso en total' end
                          from public.fotos_progreso f where f.alumno_id = v_alumno.id) || '</i>',
    jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id)))
    || case when public.url_app_tg('/') is not null
            then jsonb_build_array(jsonb_build_array(public.boton_url_tg('🔗 Verlas en Blister', public.url_app_tg('/alumnos/' || v_alumno.id || '#fotos'))))
            else '[]'::jsonb end);
end;
$$;

revoke execute on function public.telegram_preparar_archivo(text, jsonb), public.telegram_confirmar_foto(text, text, boolean) from public;
grant execute on function public.telegram_preparar_archivo(text, jsonb), public.telegram_confirmar_foto(text, text, boolean) to anon, authenticated;

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
      elsif v_dia_plan is null then v_aviso := v_alumno.nombres || ' no tiene un plan activo';
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
        jsonb_build_array(jsonb_build_array(public.boton_telegram('👤 Ver ficha', 'af:' || v_alumno.id), public.boton_telegram('☰ Menú', 'm:menu'))));
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
    perform public.enviar_telegram(v_chat, 'Listo, lo dejé. 👌', public.teclado_menu_tg(v_org, v_zona));

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

revoke execute on function
  public.capital_tg(text),
  public.siguiente_dia_plan_tg(uuid),
  public.texto_rutina_tg(uuid, text),
  public.teclado_dias_tg(text, uuid, text, text),
  public.teclado_horas_tg(text, uuid, date, uuid, text, int, uuid, text),
  public.instante_tg(text, text),
  public.texto_cita_tg(uuid, text),
  public.teclado_cita_tg(uuid, text),
  public.vista_alumno_tg(public.alumnos, text),
  public.texto_menu_tg(uuid),
  public.alumnos_mencionados_tg(uuid, text),
  public.guardar_nota_voz_tg(bigint, uuid, public.alumnos, text)
from authenticated, anon, public;
