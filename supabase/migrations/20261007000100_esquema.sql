-- ============================================================
-- Plataforma de Entrenamiento Personalizado
-- Migración 001 — Esquema (tablas, restricciones, índices)
-- PostgreSQL 15+ / Supabase
-- ============================================================
-- Convenciones:
--   * Identificadores en español, snake_case, sin tildes ni ñ.
--   * Tablas en plural; claves foráneas como <entidad>_id.
--   * Valores de "estado" en masculino (concuerdan con "estado"):
--     activo, inactivo, archivado...
--   * Unidades en el nombre de la columna cuando aplica (_kg, _cm, _segundos).
--   * Fechas de eventos: timestamptz. Fechas de calendario: date.
--   * Se archiva en lugar de borrar (estado = 'archivado').
-- Las tablas de Supabase (auth.users, storage.objects) conservan
-- sus nombres originales en inglés: no se pueden renombrar.
-- ============================================================

create extension if not exists btree_gist with schema extensions;

-- ============================================================
-- 1. IDENTIDAD Y MULTI-ORGANIZACIÓN
-- ============================================================

create table public.organizaciones (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  slug           text not null unique
                   check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  zona_horaria   text not null default 'America/Bogota',
  estado         text not null default 'activo'
                   check (estado in ('activo', 'suspendido', 'archivado')),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.perfiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nombres        text not null default '',
  apellidos      text not null default '',
  avatar_url     text,
  telefono       text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.miembros_organizacion (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  usuario_id      uuid not null references public.perfiles(id) on delete cascade,
  rol             text not null default 'entrenador'
                    check (rol in ('propietario', 'admin', 'entrenador', 'asistente')),
  estado          text not null default 'activo'
                    check (estado in ('activo', 'inactivo', 'invitado')),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  unique (organizacion_id, usuario_id)
);

-- ============================================================
-- 2. CRM DE ALUMNOS
-- ============================================================

create table public.alumnos (
  id               uuid primary key default gen_random_uuid(),
  organizacion_id  uuid not null references public.organizaciones(id) on delete restrict,
  usuario_id       uuid references public.perfiles(id) on delete set null,
  nombres          text not null,
  apellidos        text not null,
  fecha_nacimiento date,
  correo           text,
  telefono         text,
  foto_url         text,
  estado           text not null default 'activo'
                     check (estado in ('activo', 'inactivo', 'archivado')),
  fecha_inicio     date default current_date,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  -- Permite FKs compuestas que garantizan que planes, sesiones y citas
  -- apunten a un alumno de la MISMA organización.
  unique (id, organizacion_id)
);

create table public.objetivos_alumno (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references public.alumnos(id) on delete cascade,
  tipo           text not null
                   check (tipo in ('hipertrofia', 'perdida_grasa', 'fuerza', 'movilidad',
                                   'resistencia', 'tecnica', 'rehabilitacion', 'salud_general')),
  nombre         text not null,
  descripcion    text,
  valor_meta     numeric(12,2),
  unidad         text,
  es_principal   boolean not null default false,
  fecha_inicio   date not null default current_date,
  fecha_meta     date,
  estado         text not null default 'activo'
                   check (estado in ('activo', 'completado', 'cancelado')),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fecha_meta is null or fecha_meta >= fecha_inicio)
);

-- Solo un objetivo principal activo por alumno.
create unique index objetivos_alumno_un_principal_idx
  on public.objetivos_alumno(alumno_id)
  where es_principal and estado = 'activo';

create table public.regiones_corporales (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug   text not null unique,
  vista  text not null check (vista in ('frontal', 'posterior', 'ambas')),
  orden  integer not null default 0
);

create table public.articulaciones (
  id                  uuid primary key default gen_random_uuid(),
  region_corporal_id  uuid references public.regiones_corporales(id) on delete set null,
  nombre              text not null,
  slug                text not null unique,
  orden               integer not null default 0
);

create table public.condiciones_alumno (
  id                 uuid primary key default gen_random_uuid(),
  alumno_id          uuid not null references public.alumnos(id) on delete cascade,
  tipo               text not null
                       check (tipo in ('lesion', 'limitacion', 'dolor', 'restriccion', 'otro')),
  region_corporal_id uuid references public.regiones_corporales(id) on delete set null,
  articulacion_id    uuid references public.articulaciones(id) on delete set null,
  descripcion        text not null,
  severidad          text check (severidad is null or severidad in ('leve', 'moderada', 'alta')),
  estado             text not null default 'activo'
                       check (estado in ('activo', 'resuelto', 'inactivo')),
  fecha_inicio       date,
  fecha_resolucion   date,
  notas_entrenador   text,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  check (fecha_resolucion is null or fecha_inicio is null or fecha_resolucion >= fecha_inicio)
);
comment on table public.condiciones_alumno is
  'Información reportada o registrada por el entrenador. No es un diagnóstico médico.';

create table public.notas_alumno (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references public.alumnos(id) on delete cascade,
  autor_id       uuid not null references public.perfiles(id) on delete restrict,
  contenido      text not null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  archivado_en   timestamptz
);

-- Histórico: cada medición es un registro nuevo (no se actualiza).
create table public.mediciones (
  id                 uuid primary key default gen_random_uuid(),
  alumno_id          uuid not null references public.alumnos(id) on delete cascade,
  registrado_por     uuid references public.perfiles(id) on delete set null,
  medido_en          timestamptz not null default now(),
  peso_kg            numeric(6,2) check (peso_kg is null or peso_kg > 0),
  estatura_cm        numeric(6,2) check (estatura_cm is null or estatura_cm > 0),
  grasa_corporal_pct numeric(5,2) check (grasa_corporal_pct is null or grasa_corporal_pct between 0 and 100),
  cintura_cm         numeric(6,2) check (cintura_cm is null or cintura_cm > 0),
  cadera_cm          numeric(6,2) check (cadera_cm is null or cadera_cm > 0),
  pecho_cm           numeric(6,2) check (pecho_cm is null or pecho_cm > 0),
  brazo_izq_cm       numeric(6,2) check (brazo_izq_cm is null or brazo_izq_cm > 0),
  brazo_der_cm       numeric(6,2) check (brazo_der_cm is null or brazo_der_cm > 0),
  muslo_izq_cm       numeric(6,2) check (muslo_izq_cm is null or muslo_izq_cm > 0),
  muslo_der_cm       numeric(6,2) check (muslo_der_cm is null or muslo_der_cm > 0),
  notas              text,
  creado_en          timestamptz not null default now()
);

-- El archivo vive en Supabase Storage; aquí solo la referencia.
-- Convención de ruta: {organizacion_id}/{alumno_id}/{archivo}
create table public.fotos_progreso (
  id            uuid primary key default gen_random_uuid(),
  alumno_id     uuid not null references public.alumnos(id) on delete cascade,
  subida_por    uuid references public.perfiles(id) on delete set null,
  ruta_storage  text not null,
  capturada_en  timestamptz not null default now(),
  categoria     text not null check (categoria in ('frente', 'espalda', 'izquierda', 'derecha', 'otra')),
  visibilidad   text not null default 'solo_entrenador'
                  check (visibilidad in ('solo_entrenador', 'alumno')),
  notas         text,
  creado_en     timestamptz not null default now()
);

-- ============================================================
-- 3. ANATOMÍA
-- ============================================================

create table public.grupos_musculares (
  id                 uuid primary key default gen_random_uuid(),
  region_corporal_id uuid not null references public.regiones_corporales(id) on delete restrict,
  nombre             text not null,
  slug               text not null unique,
  orden              integer not null default 0
);

-- "slug" es el identificador estable usado en el SVG: data-musculo="pectoral_mayor"
create table public.musculos (
  id                uuid primary key default gen_random_uuid(),
  grupo_muscular_id uuid not null references public.grupos_musculares(id) on delete restrict,
  nombre            text not null,
  slug              text not null unique,
  descripcion       text,
  orden             integer not null default 0
);

-- ============================================================
-- 4. EJERCICIOS Y EQUIPAMIENTO
-- ============================================================

create table public.ejercicios (
  id                  uuid primary key default gen_random_uuid(),
  organizacion_id     uuid references public.organizaciones(id) on delete restrict,
  creado_por          uuid references public.perfiles(id) on delete set null,
  nombre              text not null,
  descripcion         text,
  instrucciones       text,
  errores_comunes     text,
  consejos_entrenador text,
  dificultad          text check (dificultad is null or dificultad in ('principiante', 'intermedio', 'avanzado')),
  tipo                text not null default 'fuerza'
                        check (tipo in ('fuerza', 'movilidad', 'estiramiento', 'activacion',
                                        'cardio', 'calentamiento', 'enfriamiento', 'otro')),
  es_unilateral       boolean not null default false,
  video_url           text,
  imagen_url          text,
  es_global           boolean not null default false,
  estado              text not null default 'activo'
                        check (estado in ('activo', 'inactivo', 'archivado')),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  -- Global = sin organización. Privado = de una organización.
  check ((es_global and organizacion_id is null) or (not es_global and organizacion_id is not null))
);

create table public.equipamiento (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  descripcion text
);

create table public.ejercicios_musculos (
  ejercicio_id uuid not null references public.ejercicios(id) on delete cascade,
  musculo_id   uuid not null references public.musculos(id) on delete restrict,
  rol          text not null check (rol in ('principal', 'secundario', 'estabilizador')),
  primary key (ejercicio_id, musculo_id)
);

create table public.ejercicios_equipamiento (
  ejercicio_id    uuid not null references public.ejercicios(id) on delete cascade,
  equipamiento_id uuid not null references public.equipamiento(id) on delete restrict,
  primary key (ejercicio_id, equipamiento_id)
);

-- ============================================================
-- 5. PLANTILLAS (reutilizables)
-- ============================================================
-- Nota sobre "orden": NO lleva restricción UNIQUE a propósito.
-- Con drag & drop se reordenan varias filas a la vez y un UNIQUE
-- provoca choques intermedios. El orden se resuelve con ORDER BY orden.

create table public.plantillas (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  creado_por      uuid not null references public.perfiles(id) on delete restrict,
  nombre          text not null,
  descripcion     text,
  tipo_objetivo   text,
  estado          text not null default 'activo'
                    check (estado in ('borrador', 'activo', 'archivado')),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

create table public.plantilla_dias (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references public.plantillas(id) on delete cascade,
  nombre       text not null,
  orden        integer not null check (orden > 0),
  descripcion  text
);

create table public.plantilla_bloques (
  id                uuid primary key default gen_random_uuid(),
  plantilla_dia_id  uuid not null references public.plantilla_dias(id) on delete cascade,
  nombre            text not null,
  tipo              text not null
                      check (tipo in ('calentamiento', 'fuerza', 'superserie', 'circuito',
                                      'movilidad', 'cardio', 'enfriamiento', 'libre')),
  orden             integer not null default 0,
  descanso_segundos integer check (descanso_segundos is null or descanso_segundos >= 0),
  rondas            integer check (rondas is null or rondas > 0),
  notas             text
);

create table public.plantilla_ejercicios (
  id                  uuid primary key default gen_random_uuid(),
  plantilla_bloque_id uuid not null references public.plantilla_bloques(id) on delete cascade,
  ejercicio_id        uuid not null references public.ejercicios(id) on delete restrict,
  orden               integer not null default 0,
  series              integer check (series is null or series > 0),
  repeticiones        text,   -- texto libre: "10", "8-10", "AMRAP", "30 s", "12/10/8"
  peso                numeric(8,2) check (peso is null or peso >= 0),
  unidad_peso         text not null default 'kg' check (unidad_peso in ('kg', 'lb')),
  descanso_segundos   integer check (descanso_segundos is null or descanso_segundos >= 0),
  tempo               text,
  rir                 numeric(4,1) check (rir is null or rir between 0 and 10),
  rpe                 numeric(4,1) check (rpe is null or rpe between 0 and 10),
  notas               text
);

-- ============================================================
-- 6. PLANES (copia independiente asignada a un alumno)
-- ============================================================

create table public.planes (
  id                  uuid primary key default gen_random_uuid(),
  organizacion_id     uuid not null references public.organizaciones(id) on delete restrict,
  alumno_id           uuid not null,
  creado_por          uuid not null references public.perfiles(id) on delete restrict,
  plantilla_origen_id uuid references public.plantillas(id) on delete set null,
  nombre              text not null,
  descripcion         text,
  tipo_objetivo       text,
  fecha_inicio        date not null default current_date,
  fecha_fin           date,
  estado              text not null default 'borrador'
                        check (estado in ('borrador', 'activo', 'completado', 'archivado')),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  check (fecha_fin is null or fecha_fin >= fecha_inicio),
  foreign key (alumno_id, organizacion_id)
    references public.alumnos(id, organizacion_id) on delete restrict,
  unique (id, organizacion_id, alumno_id)
);

-- Un solo plan activo por alumno a la vez.
create unique index planes_un_activo_por_alumno_idx
  on public.planes(alumno_id) where estado = 'activo';

create table public.plan_dias (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.planes(id) on delete cascade,
  nombre      text not null,
  orden       integer not null check (orden > 0),
  dia_semana  smallint check (dia_semana is null or dia_semana between 1 and 7), -- 1 = lunes … 7 = domingo
  descripcion text
);

create table public.plan_bloques (
  id                uuid primary key default gen_random_uuid(),
  plan_dia_id       uuid not null references public.plan_dias(id) on delete cascade,
  nombre            text not null,
  tipo              text not null
                      check (tipo in ('calentamiento', 'fuerza', 'superserie', 'circuito',
                                      'movilidad', 'cardio', 'enfriamiento', 'libre')),
  orden             integer not null default 0,
  descanso_segundos integer check (descanso_segundos is null or descanso_segundos >= 0),
  rondas            integer check (rondas is null or rondas > 0),
  notas             text
);

create table public.plan_ejercicios (
  id                uuid primary key default gen_random_uuid(),
  plan_bloque_id    uuid not null references public.plan_bloques(id) on delete cascade,
  ejercicio_id      uuid not null references public.ejercicios(id) on delete restrict,
  orden             integer not null default 0,
  series            integer check (series is null or series > 0),
  repeticiones      text,
  peso              numeric(8,2) check (peso is null or peso >= 0),
  unidad_peso       text not null default 'kg' check (unidad_peso in ('kg', 'lb')),
  descanso_segundos integer check (descanso_segundos is null or descanso_segundos >= 0),
  tempo             text,
  rir               numeric(4,1) check (rir is null or rir between 0 and 10),
  rpe               numeric(4,1) check (rpe is null or rpe between 0 and 10),
  notas             text
);

-- Prescripción serie por serie (opcional; el MVP puede usar solo plan_ejercicios).
create table public.plan_series (
  id                uuid primary key default gen_random_uuid(),
  plan_ejercicio_id uuid not null references public.plan_ejercicios(id) on delete cascade,
  numero_serie      integer not null check (numero_serie > 0),
  repeticiones      text,
  peso              numeric(8,2) check (peso is null or peso >= 0),
  descanso_segundos integer check (descanso_segundos is null or descanso_segundos >= 0),
  rir               numeric(4,1) check (rir is null or rir between 0 and 10),
  rpe               numeric(4,1) check (rpe is null or rpe between 0 and 10),
  notas             text,
  unique (plan_ejercicio_id, numero_serie)
);

-- ============================================================
-- 7. EJECUCIÓN (lo que realmente ocurrió)
-- ============================================================

create table public.sesiones (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  alumno_id       uuid not null,
  plan_id         uuid,
  plan_dia_id     uuid references public.plan_dias(id) on delete set null,
  programada_para timestamptz,
  iniciada_en     timestamptz,
  completada_en   timestamptz,
  estado          text not null default 'programada'
                    check (estado in ('programada', 'en_curso', 'completada', 'cancelada', 'omitida')),
  rpe_sesion      numeric(4,1) check (rpe_sesion is null or rpe_sesion between 0 and 10),
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  check (completada_en is null or iniciada_en is null or completada_en >= iniciada_en),
  foreign key (alumno_id, organizacion_id)
    references public.alumnos(id, organizacion_id) on delete restrict,
  -- El plan debe ser del mismo alumno y organización.
  foreign key (plan_id, organizacion_id, alumno_id)
    references public.planes(id, organizacion_id, alumno_id) on delete set null (plan_id),
  unique (id, organizacion_id, alumno_id)
);

create table public.sesion_ejercicios (
  id                uuid primary key default gen_random_uuid(),
  sesion_id         uuid not null references public.sesiones(id) on delete cascade,
  plan_ejercicio_id uuid references public.plan_ejercicios(id) on delete set null,  -- null = ejercicio no prescrito
  ejercicio_id      uuid not null references public.ejercicios(id) on delete restrict,
  orden             integer not null default 0,
  notas             text
);

create table public.sesion_series (
  id                  uuid primary key default gen_random_uuid(),
  sesion_ejercicio_id uuid not null references public.sesion_ejercicios(id) on delete cascade,
  numero_serie        integer not null check (numero_serie > 0),
  peso                numeric(8,2) check (peso is null or peso >= 0),
  unidad_peso         text not null default 'kg' check (unidad_peso in ('kg', 'lb')),
  repeticiones        integer check (repeticiones is null or repeticiones >= 0),
  duracion_segundos   integer check (duracion_segundos is null or duracion_segundos >= 0),
  rpe                 numeric(4,1) check (rpe is null or rpe between 0 and 10),
  rir                 numeric(4,1) check (rir is null or rir between 0 and 10),
  completada          boolean not null default false,
  notas               text,
  creado_en           timestamptz not null default now(),
  unique (sesion_ejercicio_id, numero_serie)
);

-- ============================================================
-- 8. CALENDARIO
-- ============================================================

create table public.citas (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  entrenador_id   uuid not null,
  alumno_id       uuid not null,
  sesion_id       uuid,
  tipo            text not null default 'entrenamiento'
                    check (tipo in ('entrenamiento', 'evaluacion', 'consulta', 'otro')),
  inicia_en       timestamptz not null,
  termina_en      timestamptz not null,
  estado          text not null default 'programada'
                    check (estado in ('programada', 'confirmada', 'completada',
                                      'cancelada', 'reprogramada', 'no_asistio')),
  notas           text,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  check (termina_en > inicia_en),
  -- El entrenador debe ser miembro de la organización.
  foreign key (organizacion_id, entrenador_id)
    references public.miembros_organizacion(organizacion_id, usuario_id) on delete restrict,
  foreign key (alumno_id, organizacion_id)
    references public.alumnos(id, organizacion_id) on delete restrict,
  foreign key (sesion_id, organizacion_id, alumno_id)
    references public.sesiones(id, organizacion_id, alumno_id) on delete set null (sesion_id),
  -- Un entrenador no puede tener dos citas vigentes que se crucen.
  constraint citas_sin_cruce_entrenador exclude using gist (
    entrenador_id with =,
    tstzrange(inicia_en, termina_en) with &&
  ) where (estado not in ('cancelada', 'reprogramada', 'no_asistio'))
);

-- ============================================================
-- 9. AUDITORÍA
-- ============================================================

create table public.registros_auditoria (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid references public.organizaciones(id) on delete set null,
  usuario_id      uuid references public.perfiles(id) on delete set null,
  accion          text not null,         -- INSERT | UPDATE | DELETE
  tipo_entidad    text not null,         -- nombre de la tabla
  entidad_id      uuid,
  metadatos       jsonb,                 -- en UPDATE: { campo: { antes, despues } }
  creado_en       timestamptz not null default now()
);

-- ============================================================
-- 10. ÍNDICES
-- ============================================================

create index miembros_organizacion_usuario_idx  on public.miembros_organizacion(usuario_id);
create index alumnos_org_estado_idx              on public.alumnos(organizacion_id, estado);
create index alumnos_org_apellidos_idx           on public.alumnos(organizacion_id, apellidos);
create index alumnos_usuario_idx                 on public.alumnos(usuario_id) where usuario_id is not null;
create index objetivos_alumno_alumno_estado_idx  on public.objetivos_alumno(alumno_id, estado);
create index condiciones_alumno_alumno_estado_idx on public.condiciones_alumno(alumno_id, estado);
create index notas_alumno_alumno_creado_idx      on public.notas_alumno(alumno_id, creado_en desc);
create index mediciones_alumno_fecha_idx         on public.mediciones(alumno_id, medido_en desc);
create index fotos_progreso_alumno_fecha_idx     on public.fotos_progreso(alumno_id, capturada_en desc);
create index grupos_musculares_region_idx        on public.grupos_musculares(region_corporal_id, orden);
create index musculos_grupo_idx                  on public.musculos(grupo_muscular_id, orden);
create index ejercicios_org_estado_idx           on public.ejercicios(organizacion_id, estado);
create index ejercicios_globales_idx             on public.ejercicios(estado) where es_global;
create index ejercicios_musculos_musculo_idx     on public.ejercicios_musculos(musculo_id, ejercicio_id);
create index ejercicios_equipamiento_equipo_idx  on public.ejercicios_equipamiento(equipamiento_id, ejercicio_id);
create index plantillas_org_estado_idx           on public.plantillas(organizacion_id, estado);
create index plantilla_dias_plantilla_idx        on public.plantilla_dias(plantilla_id, orden);
create index plantilla_bloques_dia_idx           on public.plantilla_bloques(plantilla_dia_id, orden);
create index plantilla_ejercicios_bloque_idx     on public.plantilla_ejercicios(plantilla_bloque_id, orden);
create index plantilla_ejercicios_ejercicio_idx  on public.plantilla_ejercicios(ejercicio_id);
create index planes_org_alumno_estado_idx        on public.planes(organizacion_id, alumno_id, estado);
create index plan_dias_plan_idx                  on public.plan_dias(plan_id, orden);
create index plan_bloques_dia_idx                on public.plan_bloques(plan_dia_id, orden);
create index plan_ejercicios_bloque_idx          on public.plan_ejercicios(plan_bloque_id, orden);
create index plan_ejercicios_ejercicio_idx       on public.plan_ejercicios(ejercicio_id);
create index sesiones_alumno_iniciada_idx        on public.sesiones(alumno_id, iniciada_en desc);
create index sesiones_org_programada_idx         on public.sesiones(organizacion_id, programada_para);
create index sesion_ejercicios_sesion_idx        on public.sesion_ejercicios(sesion_id, orden);
-- Progreso de fuerza: "historial de press banca de este alumno"
create index sesion_ejercicios_ejercicio_idx     on public.sesion_ejercicios(ejercicio_id, sesion_id);
create index citas_org_inicio_idx                on public.citas(organizacion_id, inicia_en);
create index citas_entrenador_inicio_idx         on public.citas(entrenador_id, inicia_en);
create index citas_alumno_inicio_idx             on public.citas(alumno_id, inicia_en);
create index registros_auditoria_org_creado_idx  on public.registros_auditoria(organizacion_id, creado_en desc);
create index registros_auditoria_entidad_idx     on public.registros_auditoria(tipo_entidad, entidad_id);
