-- ============================================================
-- Citas en Google Calendar
--   Cada entrenador puede conectar su Google Calendar (OAuth propio de la app,
--   permiso calendar.events). Al agendar, mover o cancelar una cita, la app crea,
--   mueve o borra el evento e invita al alumno si tiene correo: Google le envía
--   la invitación, los cambios y los recordatorios.
--
--   conexiones_google: una fila por usuario. El refresh token se guarda CIFRADO
--   (AES-256-GCM con GOOGLE_TOKEN_KEY, que solo tiene el servidor de Next): aunque
--   alguien leyera la fila con la sesión del usuario, no podría usarlo.
--   citas.google_evento_id / google_error: estado de la sincronización de cada cita.
-- ============================================================

create table public.conexiones_google (
  usuario_id           uuid primary key references public.perfiles(id) on delete cascade,
  correo_google        text not null,
  refresh_token_cifrado text not null,
  -- Token de acceso vigente (también cifrado) para no pedir uno nuevo en cada cita.
  acceso_cifrado       text,
  acceso_expira_en     timestamptz,
  calendario_id        text not null default 'primary',
  conectado_en         timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

create trigger trg_conexiones_google_actualizado_en before update on public.conexiones_google
  for each row execute function public.actualizar_marca_tiempo();

-- Cada usuario ve y gestiona solo su propia conexión.
alter table public.conexiones_google enable row level security;

create policy conexiones_google_propia on public.conexiones_google for all to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

alter table public.citas
  add column google_evento_id text,
  add column google_error     text;

comment on column public.citas.google_evento_id is 'Evento en el Google Calendar del entrenador (null = sin sincronizar).';
comment on column public.citas.google_error is 'Último error al sincronizar con Google Calendar (null = sin error).';

-- ------------------------------------------------------------
-- El estado de Google de una cita solo lo escribe su entrenador (con su propia
-- conexión). Así otro miembro no puede plantar un "motivo de error" engañoso
-- ni marcar como sincronizada una cita ajena.
-- ------------------------------------------------------------
create or replace function public.proteger_google_cita()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is distinct from new.entrenador_id and (
       (tg_op = 'INSERT' and (new.google_evento_id is not null or new.google_error is not null))
    or (tg_op = 'UPDATE' and (new.google_evento_id is distinct from old.google_evento_id
                              or new.google_error is distinct from old.google_error))
  ) then
    raise exception 'Solo el entrenador de la cita puede cambiar su estado en Google Calendar'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger trg_citas_proteger_google
  before insert or update of google_evento_id, google_error on public.citas
  for each row execute function public.proteger_google_cita();

revoke execute on function public.proteger_google_cita() from authenticated, anon, public;
