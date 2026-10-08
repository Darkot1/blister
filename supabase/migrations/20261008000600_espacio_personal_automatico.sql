-- ============================================================
-- Migración 006 — Modo entrenador único
-- Al registrarse, cada usuario recibe automáticamente su propio
-- espacio (organización) como propietario. La UI no expone el
-- concepto de organización hasta la fase SaaS.
-- ============================================================
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_nombres text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombres'), ''), '');
  v_org_id  uuid;
begin
  insert into public.perfiles (id, nombres, apellidos)
  values (new.id, v_nombres, coalesce(new.raw_user_meta_data ->> 'apellidos', ''))
  on conflict (id) do nothing;

  insert into public.organizaciones (nombre, slug)
  values (
    case when v_nombres = '' then 'Mi espacio' else 'Espacio de ' || v_nombres end,
    'u-' || substr(replace(new.id::text, '-', ''), 1, 16)
  )
  returning id into v_org_id;

  insert into public.miembros_organizacion (organizacion_id, usuario_id, rol)
  values (v_org_id, new.id, 'propietario');

  return new;
end;
$$;

revoke execute on function public.crear_perfil_nuevo_usuario() from authenticated, anon, public;
