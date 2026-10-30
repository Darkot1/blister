-- ============================================================
-- Solicitudes: que no se puedan mandar muchas
--   Antes el límite era por correo o teléfono (3 al día), así que cambiándolos
--   se podían enviar decenas. Ahora:
--     · Quien ya tiene una solicitud sin atender (mismo correo o teléfono, 7 días)
--       no puede mandar otra: se le dice que ya la recibimos.
--     · Por conexión: máximo 2 al día desde la misma IP. La IP no se guarda: el
--       servidor manda un HMAC (`origen`) que no se puede revertir.
--     · Por espacio: 10 nuevas por hora y 40 al día.
--   Para que el límite por IP no se salte llamando la RPC directo, la entrada
--   pública pasa a `enviar_solicitud_web`, que exige el secreto del servidor
--   (Vault `formulario_secreto`, env FORMULARIO_SECRETO). Las versiones viejas de
--   `enviar_solicitud` siguen mientras se publica la app y luego se borran.
-- ============================================================

alter table public.solicitudes add column origen text check (char_length(origen) <= 64);
comment on column public.solicitudes.origen is 'HMAC de la IP de quien envió (no reversible); solo para limitar envíos.';
create index solicitudes_origen_idx on public.solicitudes (organizacion_id, origen, creado_en) where origen is not null;

create or replace function public.registrar_solicitud(
  p_origen           text,
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
  v_origen   text := nullif(left(p_origen, 64), '');
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

  -- La misma persona con una solicitud aún sin atender.
  if exists (select 1 from public.solicitudes s
             where s.organizacion_id = v_org and s.estado = 'nueva' and s.creado_en > now() - interval '7 days'
               and (s.correo = v_correo or s.telefono = v_telefono)) then
    raise exception 'Ya recibimos tu solicitud. Te contactarán pronto; no hace falta enviarla de nuevo.' using errcode = '54000';
  end if;

  -- La misma conexión, y el espacio en total (para que cambiar de datos en cada envío no sirva).
  if (v_origen is not null and (select count(*) from public.solicitudes s
        where s.organizacion_id = v_org and s.origen = v_origen and s.creado_en > now() - interval '1 day') >= 2)
     or (select count(*) from public.solicitudes s
         where s.organizacion_id = v_org and s.creado_en > now() - interval '1 hour') >= 10
     or (select count(*) from public.solicitudes s
         where s.organizacion_id = v_org and s.creado_en > now() - interval '1 day') >= 40 then
    raise exception 'Ya recibimos tus mensajes. Inténtalo de nuevo mañana.' using errcode = '54000';
  end if;

  insert into public.solicitudes (organizacion_id, tipo, nombres, apellidos, correo, telefono, objetivo, mensaje,
                                  fecha_nacimiento, lesiones, origen, autoriza_datos_en)
  values (
    v_org, p_tipo, trim(p_nombres), trim(coalesce(p_apellidos, '')), v_correo, v_telefono,
    case when p_tipo = 'registro' then nullif(p_objetivo, '') end,
    nullif(trim(coalesce(p_mensaje, '')), ''),
    case when p_tipo = 'registro' then p_fecha_nacimiento end,
    case when p_tipo = 'registro' then nullif(trim(coalesce(p_lesiones, '')), '') end,
    v_origen,
    now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.registrar_solicitud(text, text, text, text, text, text, text, text, text, boolean, date, text)
  from authenticated, anon, public;

/** Entrada del formulario público: solo desde el servidor de la app (con el secreto). */
create or replace function public.enviar_solicitud_web(
  p_secreto text, p_origen text,
  p_slug text, p_tipo text, p_nombres text, p_apellidos text, p_correo text, p_telefono text,
  p_objetivo text, p_mensaje text, p_autoriza boolean, p_fecha_nacimiento date, p_lesiones text
)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_esperado text := public.secreto_vault('formulario_secreto');
begin
  if v_esperado is null or p_secreto is distinct from v_esperado then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  return public.registrar_solicitud(p_origen, p_slug, p_tipo, p_nombres, p_apellidos, p_correo, p_telefono,
                                    p_objetivo, p_mensaje, p_autoriza, p_fecha_nacimiento, p_lesiones);
end;
$$;

revoke execute on function public.enviar_solicitud_web(text, text, text, text, text, text, text, text, text, text, boolean, date, text) from public;
grant execute on function public.enviar_solicitud_web(text, text, text, text, text, text, text, text, text, text, boolean, date, text) to anon, authenticated;

-- Las de antes, con las reglas nuevas (sin origen) hasta que se borren.
create or replace function public.enviar_solicitud(
  p_slug text, p_tipo text, p_nombres text, p_apellidos text, p_correo text, p_telefono text,
  p_objetivo text, p_mensaje text, p_autoriza boolean, p_fecha_nacimiento date, p_lesiones text
)
returns uuid
language sql volatile security definer set search_path = ''
as $$
  select public.registrar_solicitud(null, p_slug, p_tipo, p_nombres, p_apellidos, p_correo, p_telefono,
                                    p_objetivo, p_mensaje, p_autoriza, p_fecha_nacimiento, p_lesiones);
$$;
