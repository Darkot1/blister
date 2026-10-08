-- ============================================================
-- Migración 006b — Registro con Google: el perfil toma nombre y
-- foto de los metadatos del proveedor. Ya estaba aplicada en el
-- proyecto; se recupera aquí para que el historial coincida.
-- ============================================================

-- Soporta registro con Google: toma nombre y foto de los metadatos del proveedor.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  m          jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_completo text  := trim(coalesce(m ->> 'full_name', m ->> 'name', ''));
  v_nombres  text;
  v_apellidos text;
  v_org_id   uuid;
begin
  v_nombres := coalesce(
    nullif(trim(m ->> 'nombres'), ''),
    nullif(trim(m ->> 'given_name'), ''),
    nullif(split_part(v_completo, ' ', 1), ''),
    ''
  );
  v_apellidos := coalesce(
    nullif(trim(m ->> 'apellidos'), ''),
    nullif(trim(m ->> 'family_name'), ''),
    nullif(trim(substr(v_completo, length(split_part(v_completo, ' ', 1)) + 2)), ''),
    ''
  );

  insert into public.perfiles (id, nombres, apellidos, avatar_url)
  values (new.id, v_nombres, v_apellidos, coalesce(m ->> 'avatar_url', m ->> 'picture'))
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
