-- ============================================================
-- Avisos por Telegram
--   Cada entrenador puede vincular su chat con el bot de Blister (Ajustes →
--   Telegram) y recibe ahí:
--     · cada solicitud nueva de su página pública (al instante),
--     · un resumen con sus citas del día (por la mañana, hora del espacio),
--     · un aviso 1 h antes de cada cita.
--
--   Todo se envía desde la base con pg_net (asíncrono: un fallo de Telegram nunca
--   frena una solicitud) y pg_cron (cada 5 minutos). Next solo recibe el webhook del
--   bot para vincular el chat.
--
--   Secretos en Vault (los crea el dueño del proyecto desde el editor SQL):
--     select vault.create_secret('<token de @BotFather>', 'telegram_bot_token');
--     select vault.create_secret('<texto aleatorio>', 'telegram_webhook_secreto');
--     select vault.create_secret('https://<dominio de la app>', 'app_url');  -- opcional: enlaces en los mensajes
--   Sin el token no se envía nada (y nada falla).
-- ============================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ------------------------------------------------------------
-- Vínculo usuario ↔ chat de Telegram
-- ------------------------------------------------------------
create table public.conexiones_telegram (
  usuario_id       uuid primary key references public.perfiles(id) on delete cascade,
  chat_id          bigint unique,
  -- Código de un solo uso que viaja en t.me/<bot>?start=<codigo>; se borra al vincular.
  codigo           text unique,
  codigo_expira_en timestamptz,
  vinculado_en     timestamptz,
  -- Último día (local) con resumen enviado: uno por día.
  ultimo_resumen   date,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  check ((codigo is null) = (codigo_expira_en is null))
);

comment on table public.conexiones_telegram is 'Chat de Telegram de cada usuario para avisos (solicitudes y citas).';

create trigger trg_conexiones_telegram_actualizado_en before update on public.conexiones_telegram
  for each row execute function public.actualizar_marca_tiempo();

-- Cada usuario solo ve la suya; los cambios van por las RPC de abajo.
alter table public.conexiones_telegram enable row level security;

create policy conexiones_telegram_propia on public.conexiones_telegram for select to authenticated
  using (usuario_id = (select auth.uid()));

revoke insert, update, delete on public.conexiones_telegram from authenticated, anon;

-- Avisos de cita ya enviados. La clave incluye la hora: si la cita se mueve, toca avisar de nuevo.
create table public.avisos_telegram_citas (
  cita_id    uuid not null references public.citas(id) on delete cascade,
  inicia_en  timestamptz not null,
  enviado_en timestamptz not null default now(),
  primary key (cita_id, inicia_en)
);

-- Interna: RLS sin políticas (cerrada) y sin permisos para la API.
alter table public.avisos_telegram_citas enable row level security;
revoke all on public.avisos_telegram_citas from authenticated, anon;

-- ------------------------------------------------------------
-- Utilidades internas
-- ------------------------------------------------------------

/** Texto seguro para parse_mode HTML de Telegram (null sigue siendo null: así coalesce omite la línea). */
create or replace function public.html_telegram(p_texto text)
returns text language sql immutable set search_path = ''
as $$
  select replace(replace(replace(p_texto, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

/** "3:05 p. m." en la zona dada. */
create or replace function public.hora_telegram(p_momento timestamptz, p_zona text)
returns text language sql stable set search_path = ''
as $$
  select to_char(p_momento at time zone p_zona, 'FMHH12:MI')
      || case when extract(hour from p_momento at time zone p_zona) < 12 then ' a. m.' else ' p. m.' end;
$$;

create or replace function public.secreto_vault(p_nombre text)
returns text language sql stable security definer set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_nombre limit 1;
$$;

/** Envía un mensaje (asíncrono). Sin token configurado, no hace nada; un error nunca se propaga. */
create or replace function public.enviar_telegram(p_chat_id bigint, p_texto text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_token text := public.secreto_vault('telegram_bot_token');
begin
  if v_token is null or p_chat_id is null then return; end if;
  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body := jsonb_build_object('chat_id', p_chat_id, 'text', left(p_texto, 4000), 'parse_mode', 'HTML',
                               'link_preview_options', jsonb_build_object('is_disabled', true)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
exception when others then
  raise warning 'enviar_telegram: %', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- RPC del usuario: preparar y quitar el vínculo
-- ------------------------------------------------------------

/** Código nuevo (30 min) para abrir t.me/<bot>?start=<codigo>. */
create or replace function public.preparar_vinculo_telegram()
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_codigo  text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  if v_usuario is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  insert into public.conexiones_telegram (usuario_id, codigo, codigo_expira_en)
  values (v_usuario, v_codigo, now() + interval '30 minutes')
  on conflict (usuario_id) do update set codigo = excluded.codigo, codigo_expira_en = excluded.codigo_expira_en;
  return v_codigo;
end;
$$;

create or replace function public.desvincular_telegram()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_chat bigint;
begin
  delete from public.conexiones_telegram where usuario_id = (select auth.uid()) returning chat_id into v_chat;
  perform public.enviar_telegram(v_chat, 'Listo: ya no recibirás avisos de Blister en este chat.');
end;
$$;

/** Mensaje de prueba al chat vinculado del usuario. */
create or replace function public.probar_telegram()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_chat bigint;
begin
  select chat_id into v_chat from public.conexiones_telegram where usuario_id = (select auth.uid());
  if v_chat is null then return false; end if;
  perform public.enviar_telegram(v_chat, '✅ Prueba de Blister: los avisos llegan a este chat.');
  return true;
end;
$$;

revoke execute on function public.preparar_vinculo_telegram(), public.desvincular_telegram(), public.probar_telegram() from anon, public;
grant execute on function public.preparar_vinculo_telegram(), public.desvincular_telegram(), public.probar_telegram() to authenticated;

-- ------------------------------------------------------------
-- RPC del webhook del bot (/api/telegram, sin sesión): "/start <codigo>"
--   La llama la ruta de Next con el secreto del webhook; sin él no hace nada.
-- ------------------------------------------------------------
create or replace function public.vincular_telegram(p_secreto text, p_codigo text, p_chat_id bigint)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  v_esperado text := public.secreto_vault('telegram_webhook_secreto');
  v_usuario  uuid;
  v_nombre   text;
begin
  if v_esperado is null or p_secreto is distinct from v_esperado then return 'no_autorizado'; end if;
  if p_chat_id is null then return 'invalido'; end if;

  select c.usuario_id into v_usuario
  from public.conexiones_telegram c
  where c.codigo = p_codigo and c.codigo_expira_en > now();

  if v_usuario is null then
    perform public.enviar_telegram(p_chat_id,
      'Este enlace no es válido o ya venció. Ábrelo de nuevo desde <b>Ajustes → Telegram</b> en Blister.');
    return 'codigo_invalido';
  end if;

  -- Un chat sirve a un solo usuario: si estaba con otro, pasa a este.
  delete from public.conexiones_telegram where chat_id = p_chat_id and usuario_id <> v_usuario;
  update public.conexiones_telegram
     set chat_id = p_chat_id, vinculado_en = now(), codigo = null, codigo_expira_en = null
   where usuario_id = v_usuario;

  select nullif(p.nombres, '') into v_nombre from public.perfiles p where p.id = v_usuario;
  perform public.enviar_telegram(p_chat_id,
    '¡Hola' || coalesce(' ' || public.html_telegram(v_nombre), '') || '! 👋' || chr(10) || chr(10)
    || 'Desde ahora te aviso aquí de:' || chr(10)
    || '• Cada solicitud nueva de tu página' || chr(10)
    || '• Tus citas del día, cada mañana' || chr(10)
    || '• Cada cita, 1 hora antes');
  return 'vinculado';
end;
$$;

revoke execute on function public.vincular_telegram(text, text, bigint) from public;
grant execute on function public.vincular_telegram(text, text, bigint) to anon, authenticated;

-- ------------------------------------------------------------
-- Solicitud nueva → aviso a quienes atienden el espacio
-- ------------------------------------------------------------
create or replace function public.avisar_solicitud_telegram()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_app   text := public.secreto_vault('app_url');
  v_texto text;
  v_chat  bigint;
begin
  v_texto :=
    case new.tipo when 'registro' then '🙋 <b>Nueva solicitud para entrenar</b>' else '✉️ <b>Nuevo mensaje desde tu página</b>' end
    || chr(10) || chr(10) || '<b>' || public.html_telegram(trim(new.nombres || ' ' || new.apellidos)) || '</b>'
    || coalesce(chr(10) || 'Objetivo: ' || case new.objetivo
         when 'hipertrofia' then 'Ganar músculo'
         when 'perdida_grasa' then 'Perder grasa'
         when 'fuerza' then 'Fuerza'
         when 'movilidad' then 'Movilidad'
         when 'resistencia' then 'Resistencia'
         when 'tecnica' then 'Técnica'
         when 'rehabilitacion' then 'Rehabilitación'
         when 'salud_general' then 'Salud general'
       end, '')
    || coalesce(chr(10) || '📞 ' || public.html_telegram(new.telefono), '')
    || coalesce(chr(10) || '📧 ' || public.html_telegram(new.correo), '')
    || coalesce(chr(10) || chr(10) || '«' || public.html_telegram(left(new.mensaje, 600)) || '»', '')
    || coalesce(chr(10) || chr(10) || rtrim(v_app, '/') || '/alumnos/solicitudes', '');

  for v_chat in
    select t.chat_id
    from public.miembros_organizacion m
    join public.conexiones_telegram t on t.usuario_id = m.usuario_id and t.chat_id is not null
    where m.organizacion_id = new.organizacion_id and m.estado = 'activo'
      and m.rol in ('propietario', 'admin', 'entrenador')
  loop
    perform public.enviar_telegram(v_chat, v_texto);
  end loop;
  return null;
exception when others then
  raise warning 'avisar_solicitud_telegram: %', sqlerrm;
  return null;
end;
$$;

create trigger trg_solicitudes_telegram after insert on public.solicitudes
  for each row execute function public.avisar_solicitud_telegram();

-- ------------------------------------------------------------
-- Cada 5 minutos: avisos 1 h antes y resumen de la mañana
-- ------------------------------------------------------------
create or replace function public.procesar_avisos_telegram()
returns void language plpgsql security definer set search_path = ''
as $$
declare
  r       record;
  v_lista text;
  v_hoy   date;
begin
  if public.secreto_vault('telegram_bot_token') is null then return; end if;

  -- 1. Citas que empiezan dentro de la próxima hora y aún sin aviso para esa hora.
  for r in
    select c.id, c.inicia_en, c.termina_en, c.tipo, t.chat_id, o.zona_horaria,
           trim(a.nombres || ' ' || a.apellidos) as alumno, d.nombre as dia
    from public.citas c
    join public.conexiones_telegram t on t.usuario_id = c.entrenador_id and t.chat_id is not null
    join public.organizaciones o on o.id = c.organizacion_id and o.estado = 'activo'
    join public.alumnos a on a.id = c.alumno_id
    left join public.sesiones s on s.id = c.sesion_id
    left join public.plan_dias d on d.id = s.plan_dia_id
    where c.estado in ('programada', 'confirmada')
      and c.inicia_en > now() and c.inicia_en <= now() + interval '1 hour'
      and not exists (select 1 from public.avisos_telegram_citas v where v.cita_id = c.id and v.inicia_en = c.inicia_en)
  loop
    perform public.enviar_telegram(r.chat_id,
      '⏰ <b>Cita en ' || greatest(1, ceil(extract(epoch from r.inicia_en - now()) / 60))::int || ' min</b>' || chr(10)
      || public.html_telegram(r.alumno) || ' · ' || case r.tipo
           when 'entrenamiento' then 'Entrenamiento' when 'evaluacion' then 'Evaluación'
           when 'consulta' then 'Consulta' else 'Otro' end || chr(10)
      || public.hora_telegram(r.inicia_en, r.zona_horaria) || ' – ' || public.hora_telegram(r.termina_en, r.zona_horaria)
      || coalesce(chr(10) || 'Toca: ' || public.html_telegram(r.dia), ''));
    insert into public.avisos_telegram_citas (cita_id, inicia_en) values (r.id, r.inicia_en) on conflict do nothing;
  end loop;

  -- 2. Resumen del día, entre las 6 y las 11 de la mañana (hora del espacio), una vez por día.
  for r in
    select t.usuario_id, t.chat_id, t.ultimo_resumen,
           coalesce((select o.zona_horaria
                     from public.miembros_organizacion m
                     join public.organizaciones o on o.id = m.organizacion_id
                     where m.usuario_id = t.usuario_id and m.estado = 'activo'
                     order by m.creado_en limit 1), 'America/Bogota') as zona
    from public.conexiones_telegram t
    where t.chat_id is not null
  loop
    v_hoy := (now() at time zone r.zona)::date;
    continue when extract(hour from now() at time zone r.zona) not between 6 and 10
               or r.ultimo_resumen is not distinct from v_hoy;

    select string_agg(
             '• ' || public.hora_telegram(c.inicia_en, r.zona) || ' — ' || public.html_telegram(trim(a.nombres || ' ' || a.apellidos))
             || coalesce(' (' || public.html_telegram(d.nombre) || ')', ''),
             chr(10) order by c.inicia_en)
      into v_lista
    from public.citas c
    join public.alumnos a on a.id = c.alumno_id
    left join public.sesiones s on s.id = c.sesion_id
    left join public.plan_dias d on d.id = s.plan_dia_id
    where c.entrenador_id = r.usuario_id
      and c.estado in ('programada', 'confirmada')
      and (c.inicia_en at time zone r.zona)::date = v_hoy;

    -- Sin citas no se escribe: el silencio también dice "día libre".
    if v_lista is not null then
      perform public.enviar_telegram(r.chat_id, '☀️ <b>Tus citas de hoy</b>' || chr(10) || chr(10) || v_lista);
    end if;
    update public.conexiones_telegram set ultimo_resumen = v_hoy where usuario_id = r.usuario_id;
  end loop;
end;
$$;

revoke execute on function
  public.html_telegram(text),
  public.hora_telegram(timestamptz, text),
  public.secreto_vault(text),
  public.enviar_telegram(bigint, text),
  public.avisar_solicitud_telegram(),
  public.procesar_avisos_telegram()
from authenticated, anon, public;

-- Idempotente: con el mismo nombre, cron.schedule reemplaza el job.
select cron.schedule('avisos-telegram', '*/5 * * * *', 'select public.procesar_avisos_telegram()');
