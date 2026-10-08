-- ============================================================
-- Migración 011 — Maestros: músculos propios de cada organización
-- y reglas para los ejercicios propios.
--
-- Los músculos eran un catálogo global de solo lectura. Ahora, como
-- los ejercicios: organizacion_id vacío = global (lo mantiene Blister);
-- con valor = propio de esa organización (lo crea el entrenador).
-- Sin `drop`: las políticas existentes se ajustan con `alter policy`.
-- ============================================================

alter table public.musculos
  add column if not exists organizacion_id uuid references public.organizaciones(id) on delete restrict,
  add column if not exists creado_por uuid references public.perfiles(id) on delete set null,
  add column if not exists creado_en timestamptz not null default now();

create index if not exists musculos_organizacion_idx on public.musculos (organizacion_id);

-- Un nombre no se repite dentro de una organización (ni entre los globales).
create unique index if not exists musculos_global_nombre_uidx
  on public.musculos (lower(nombre)) where organizacion_id is null;
create unique index if not exists musculos_org_nombre_uidx
  on public.musculos (organizacion_id, lower(nombre)) where organizacion_id is not null;
create unique index if not exists ejercicios_org_nombre_uidx
  on public.ejercicios (organizacion_id, lower(nombre)) where not es_global;

-- ---------- Músculos: ver globales + propios; gestionar solo los propios ----------
alter policy musculos_ver on public.musculos
  using (organizacion_id is null or public.es_miembro_org(organizacion_id));

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'musculos' and policyname = 'musculos_crear') then
    create policy musculos_crear on public.musculos for insert to authenticated
      with check (organizacion_id is not null and public.es_miembro_org(organizacion_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'musculos' and policyname = 'musculos_editar') then
    create policy musculos_editar on public.musculos for update to authenticated
      using (organizacion_id is not null and public.es_miembro_org(organizacion_id))
      with check (organizacion_id is not null and public.es_miembro_org(organizacion_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'musculos' and policyname = 'musculos_eliminar') then
    -- Un músculo en uso no se puede borrar: lo impide la FK de ejercicios_musculos (on delete restrict).
    create policy musculos_eliminar on public.musculos for delete to authenticated
      using (organizacion_id is not null and public.tiene_rol_org(organizacion_id, array['propietario', 'admin']));
  end if;
end $$;

-- ---------- Un ejercicio propio solo usa músculos globales o de su misma organización ----------
alter policy ej_musculos_gestionar on public.ejercicios_musculos
  with check (exists (
    select 1
    from public.ejercicios e
    join public.musculos m on m.id = ejercicios_musculos.musculo_id
    where e.id = ejercicios_musculos.ejercicio_id
      and not e.es_global
      and public.es_miembro_org(e.organizacion_id)
      and (m.organizacion_id is null or m.organizacion_id = e.organizacion_id)
  ));
