-- ============================================================
-- Página pública del espacio (/e/<slug>)
--   El entrenador comparte un enlace con su presentación y un formulario para que
--   una persona pida entrenar con él o le escriba. Lo que llega es una SOLICITUD:
--   el entrenador la revisa y, si quiere, la convierte en alumno (nunca se crea un
--   alumno sola: "el entrenador decide").
--
--   Sin sesión no se toca ninguna tabla: la página se lee con pagina_publica() y el
--   formulario escribe con enviar_solicitud(), ambas security definer, que solo
--   exponen lo justo y validan todo. solicitudes no tiene política de inserción.
-- ============================================================

alter table public.organizaciones
  add column pagina_publica boolean not null default false,
  add column presentacion   text check (char_length(presentacion) <= 800);

comment on column public.organizaciones.pagina_publica is 'Si /e/<slug> está visible y acepta solicitudes.';
comment on column public.organizaciones.presentacion is 'Texto de presentación de la página pública.';

-- Enlaces cortos y legibles: entre 3 y 40 caracteres (el formato ya lo exige el check del slug).
alter table public.organizaciones
  add constraint organizaciones_slug_largo check (char_length(slug) between 3 and 40);

create table public.solicitudes (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  tipo            text not null check (tipo in ('registro', 'contacto')),
  nombres         text not null check (char_length(nombres) between 1 and 80),
  apellidos       text not null default '' check (char_length(apellidos) <= 80),
  correo          text check (char_length(correo) <= 254),
  telefono        text check (char_length(telefono) <= 30),
  objetivo        text check (objetivo in ('hipertrofia', 'perdida_grasa', 'fuerza', 'movilidad',
                                           'resistencia', 'tecnica', 'rehabilitacion', 'salud_general')),
  mensaje         text check (char_length(mensaje) <= 1000),
  estado          text not null default 'nueva'
                    check (estado in ('nueva', 'aceptada', 'descartada')),
  -- Alumno creado al aceptarla.
  alumno_id       uuid,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  check (correo is not null or telefono is not null),
  foreign key (alumno_id, organizacion_id) references public.alumnos(id, organizacion_id) on delete set null (alumno_id)
);

create index solicitudes_org_estado_idx on public.solicitudes(organizacion_id, estado, creado_en desc);
-- Para el límite de ritmo (conteos por espacio y ventana de tiempo).
create index solicitudes_org_creado_idx on public.solicitudes(organizacion_id, creado_en desc);

create trigger trg_solicitudes_actualizado_en before update on public.solicitudes
  for each row execute function public.actualizar_marca_tiempo();
create trigger trg_solicitudes_auditoria after insert or update or delete on public.solicitudes
  for each row execute function public.auditar_cambio();

-- Los miembros las ven y las gestionan; nadie las inserta directo (solo enviar_solicitud).
alter table public.solicitudes enable row level security;

create policy solicitudes_ver on public.solicitudes for select to authenticated
  using (public.es_miembro_org(organizacion_id));
-- Desde la app solo se mueve entre "nueva" y "descartada"; aceptarla (y crear el alumno)
-- es cosa de aceptar_solicitud. Los datos del visitante no se editan.
create policy solicitudes_editar on public.solicitudes for update to authenticated
  using (public.es_miembro_org(organizacion_id) and estado <> 'aceptada')
  with check (public.es_miembro_org(organizacion_id) and estado <> 'aceptada');
revoke update on public.solicitudes from authenticated;
grant update (estado) on public.solicitudes to authenticated;
create policy solicitudes_borrar on public.solicitudes for delete to authenticated
  using (public.es_miembro_org(organizacion_id));

-- ------------------------------------------------------------
-- Lo que muestra /e/<slug>: nombre del espacio, presentación y sus entrenadores
-- (nombre y foto). Null si no existe, no está activo o la página está apagada.
-- ------------------------------------------------------------
create or replace function public.pagina_publica(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', o.nombre,
    'presentacion', o.presentacion,
    'entrenadores', coalesce((
      select jsonb_agg(jsonb_build_object('nombres', p.nombres, 'apellidos', p.apellidos, 'avatar_url', p.avatar_url)
                       order by (m.rol = 'propietario') desc, p.nombres)
      from public.miembros_organizacion m
      join public.perfiles p on p.id = m.usuario_id
      -- Solo quienes entrenan: un admin que no entrena no aparece en la página.
      where m.organizacion_id = o.id and m.estado = 'activo' and m.rol in ('propietario', 'entrenador')
    ), '[]'::jsonb)
  )
  from public.organizaciones o
  where o.slug = lower(p_slug) and o.estado = 'activo' and o.pagina_publica;
$$;

-- ------------------------------------------------------------
-- Formulario de /e/<slug>. Valida y limita el ritmo (contra spam):
--   - la misma persona (correo o teléfono): 3 por día en el mismo espacio;
--   - el espacio entero: 60 solicitudes NUEVAS en la última hora. Solo cuentan las
--     nuevas: si alguien satura el formulario, descartarlas lo vuelve a abrir.
--   Llamarla directo (sin la Server Action) salta la trampa para bots; por eso los
--   límites viven aquí y no en Next.
-- Devuelve el id de la solicitud; los errores llevan mensajes para mostrar.
-- ------------------------------------------------------------
create or replace function public.enviar_solicitud(
  p_slug      text,
  p_tipo      text,
  p_nombres   text,
  p_apellidos text,
  p_correo    text,
  p_telefono  text,
  p_objetivo  text,
  p_mensaje   text
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

  if (select count(*) from public.solicitudes s
      where s.organizacion_id = v_org and s.creado_en > now() - interval '1 day'
        and (s.correo = v_correo or s.telefono = v_telefono)) >= 3
     or (select count(*) from public.solicitudes s
         where s.organizacion_id = v_org and s.estado = 'nueva'
           and s.creado_en > now() - interval '1 hour') >= 60 then
    raise exception 'Ya recibimos tu mensaje. Inténtalo de nuevo más tarde.' using errcode = '54000';
  end if;

  insert into public.solicitudes (organizacion_id, tipo, nombres, apellidos, correo, telefono, objetivo, mensaje)
  values (
    v_org, p_tipo, trim(p_nombres), trim(coalesce(p_apellidos, '')), v_correo, v_telefono,
    case when p_tipo = 'registro' then nullif(p_objetivo, '') end,
    nullif(trim(coalesce(p_mensaje, '')), '')
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ------------------------------------------------------------
-- Aceptar: crea el alumno (con su objetivo principal si lo indicó) y enlaza la
-- solicitud. Security definer porque la app no puede escribir estado = 'aceptada'
-- ni alumno_id; por eso comprueba a mano que quien llama es miembro del espacio.
-- ------------------------------------------------------------
create or replace function public.aceptar_solicitud(p_solicitud_id uuid)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_s      public.solicitudes;
  v_alumno uuid;
begin
  select * into v_s from public.solicitudes where id = p_solicitud_id for update;
  if not found or not public.es_miembro_org(v_s.organizacion_id) then
    raise exception 'Solicitud no encontrada.' using errcode = 'P0002';
  end if;
  if v_s.estado = 'aceptada' and v_s.alumno_id is not null then
    return v_s.alumno_id;
  end if;

  insert into public.alumnos (organizacion_id, nombres, apellidos, correo, telefono)
  values (v_s.organizacion_id, v_s.nombres, v_s.apellidos, v_s.correo, v_s.telefono)
  returning id into v_alumno;

  if v_s.objetivo is not null then
    insert into public.objetivos_alumno (alumno_id, tipo, nombre, es_principal)
    values (v_alumno, v_s.objetivo, case v_s.objetivo
      when 'hipertrofia' then 'Hipertrofia'      when 'perdida_grasa' then 'Pérdida de grasa'
      when 'fuerza' then 'Fuerza'                when 'movilidad' then 'Movilidad'
      when 'resistencia' then 'Resistencia'      when 'tecnica' then 'Técnica'
      when 'rehabilitacion' then 'Rehabilitación' else 'Salud general' end, true);
  end if;

  update public.solicitudes set estado = 'aceptada', alumno_id = v_alumno where id = p_solicitud_id;
  return v_alumno;
end;
$$;

-- Solo estas tres son API. pagina_publica y enviar_solicitud son para visitantes sin sesión.
revoke execute on function public.pagina_publica(text) from public;
revoke execute on function public.enviar_solicitud(text, text, text, text, text, text, text, text) from public;
revoke execute on function public.aceptar_solicitud(uuid) from public, anon;
grant execute on function public.pagina_publica(text) to anon, authenticated;
grant execute on function public.enviar_solicitud(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.aceptar_solicitud(uuid) to authenticated;
