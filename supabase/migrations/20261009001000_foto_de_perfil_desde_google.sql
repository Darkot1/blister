-- ============================================================
-- Migración 012 — Foto de perfil desde el proveedor (Google).
--
-- El perfil solo copiaba la foto al crear la cuenta. Si alguien se
-- registró con correo y después ingresó con Google, su foto quedaba
-- vacía. Ahora:
--   1. se completa la foto de los perfiles que no la tienen;
--   2. cada vez que cambian los metadatos del usuario (p. ej. al
--      ingresar con Google) se completa si sigue vacía. Nunca se
--      sobrescribe una foto que ya exista.
-- ============================================================

update public.perfiles p
set avatar_url = coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') is not null;

create or replace function public.completar_foto_perfil()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_foto text := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
begin
  if v_foto is not null then
    update public.perfiles set avatar_url = v_foto where id = new.id and avatar_url is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.completar_foto_perfil() from authenticated, anon, public;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_completar_foto_perfil') then
    create trigger trg_completar_foto_perfil
      after update of raw_user_meta_data on auth.users
      for each row execute function public.completar_foto_perfil();
  end if;
end $$;
