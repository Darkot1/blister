---
name: migracion-supabase
description: Escribe una migración SQL de Supabase para Blister (tablas, columnas, índices, funciones RPC, políticas RLS, datos semilla) con las convenciones del esquema en español y el modelo multi-organización. Úsalo para cualquier cambio de base de datos.
---

# Migración de Supabase

## Antes de escribir

1. Lee el esquema vigente: `supabase/migrations/` en orden. Las tablas están en `20261007000100_esquema.sql`; funciones de autorización, triggers, RPC y RLS en `20261007000200_funciones_y_seguridad.sql`.
2. Consulta `docs/hoja-de-ruta.md` para el mapeo blueprint → nombres reales.
3. **Nunca edites una migración ya aplicada.** Crea un archivo nuevo: `supabase/migrations/AAAAMMDDHHMMSS_descripcion_corta.sql` con fecha posterior a la última.

## Convenciones (obligatorias)

- Identificadores en español, `snake_case`, sin tildes ni ñ. Tablas en plural. FKs `<entidad>_id`.
- `id uuid primary key default gen_random_uuid()`.
- `creado_en timestamptz not null default now()`, `actualizado_en` + trigger `actualizar_marca_tiempo` si la fila es editable.
- Eventos: `timestamptz`. Conceptos de calendario: `date`. Unidades en el nombre: `_kg`, `_cm`, `_segundos`, `_pct`.
- Estados semánticos en texto con `check (estado in (...))`, en masculino (`activo`, `archivado`). Nada de números mágicos ni enums de Postgres.
- Se archiva, no se borra (`estado = 'archivado'` o `archivado_en`).
- Historial: datos que cambian en el tiempo se insertan como filas nuevas (como `mediciones`).

## Multi-organización y RLS

Toda tabla de negocio raíz lleva `organizacion_id uuid not null references public.organizaciones(id) on delete restrict`. Las tablas hijas heredan el acceso del padre.

Usa siempre las funciones existentes (son `security definer` y estables):

| Función | Para |
|---|---|
| `es_miembro_org(org_id)` | tablas con `organizacion_id` |
| `tiene_rol_org(org_id, array['propietario','admin'])` | acciones restringidas por rol |
| `acceso_alumno(alumno_id)` | hijas de `alumnos` |
| `acceso_plantilla(id)` / `acceso_plan(id)` / `acceso_sesion(id)` | hijas de plantillas, planes y sesiones |
| `ejercicio_utilizable(ejercicio_id)` | referencias a ejercicios globales o de la organización |

```sql
alter table public.x enable row level security;

create policy x_acceso on public.x for all to authenticated
  using (public.es_miembro_org(organizacion_id))
  with check (public.es_miembro_org(organizacion_id));
```

- Habilita RLS en **toda** tabla nueva del esquema `public`. Una tabla sin políticas queda cerrada; una sin RLS queda abierta a cualquier usuario autenticado.
- Para impedir mezclar organizaciones en FKs, usa FKs compuestas como en `citas` (`foreign key (alumno_id, organizacion_id) references alumnos(id, organizacion_id)`).
- Funciones: `set search_path = ''` y nombres calificados (`public.x`, `auth.uid()`). Las de trigger o internas no deben ser invocables por `/rest/v1/rpc`: `revoke execute on function public.f() from authenticated, anon, public;` (ver migración 005).
- Si la tabla debe auditarse, engánchale el trigger `auditar_cambio` (ver migración 002).

## Datos semilla

Idempotentes: `insert ... on conflict (slug) do nothing`. Para ejercicios globales sigue el formato de `20261007000400_catalogos_iniciales.sql` (o usa el skill `sembrar-ejercicios`).

## Después de la migración

1. Aplica la migración en el proyecto de Supabase (el usuario la aplica o lo hace el MCP de Supabase si está conectado; no la apliques a producción sin confirmarlo).
2. Actualiza `src/lib/supabase/tipos-bd.ts`: tipo `XFila` y entrada en `Database.public.Tables` (o regenera con `npx supabase gen types typescript --project-id xxhynsflkytaielhtnpn`).
3. Si tocaste RLS, pide al agente `revisor-seguridad` que audite el cambio.
4. Ejecuta el skill `verificar`.
