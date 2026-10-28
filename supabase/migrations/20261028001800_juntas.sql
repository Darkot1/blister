-- ============================================================
-- Historial de juntas de la oficina de agentes
--   Cada junta que termina bien se guarda con lo que se pidió y el resultado completo
--   (encargos, respuestas, decisión, plan, preguntas y rutina propuesta), para volver a
--   leerla y aplicar sus propuestas después. Es historial: no se edita, solo se borra.
--   Con alumno, cuelga de él (se borra si se borra el alumno); sin alumno, del espacio.
-- ============================================================

create table public.juntas (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  alumno_id       uuid,
  autor_id        uuid default auth.uid() references public.perfiles(id) on delete set null,
  pedido          text not null check (char_length(pedido) between 1 and 600),
  -- El caso tal como lo ve el entrenador (lib/agentes/juntas.ts → CasoJunta).
  resultado       jsonb not null check (jsonb_typeof(resultado) = 'object' and octet_length(resultado::text) <= 60000),
  modelos         text[] not null default '{}',
  creado_en       timestamptz not null default now(),
  foreign key (alumno_id, organizacion_id) references public.alumnos(id, organizacion_id) on delete cascade
);

create index juntas_org_creado_idx on public.juntas(organizacion_id, creado_en desc);
create index juntas_alumno_idx on public.juntas(alumno_id, creado_en desc) where alumno_id is not null;

alter table public.juntas enable row level security;

create policy juntas_ver on public.juntas for select to authenticated
  using (public.es_miembro_org(organizacion_id));
-- Cada uno guarda las suyas, en su espacio.
create policy juntas_crear on public.juntas for insert to authenticated
  with check (public.es_miembro_org(organizacion_id) and autor_id = (select auth.uid()));
create policy juntas_borrar on public.juntas for delete to authenticated
  using (public.es_miembro_org(organizacion_id));
-- Sin política de update: una junta pasada no se reescribe.
