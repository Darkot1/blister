# Hoja de ruta y estado

Resumen operativo del *Blueprint técnico v1*. Los agentes y skills de `.claude/` parten de aquí.

## Principios que no se negocian

1. **El entrenador decide.** La app sugiere, ordena y recuerda; nunca actúa sola (tampoco la IA futura).
2. **Prescripción ≠ ejecución.** `plan_*` es lo que se prescribe; `sesion_*` es lo que ocurrió. Nunca se sobrescribe uno con otro.
3. **Historial, no sobrescritura.** Mediciones, sesiones y fotos se insertan; no se editan registros pasados.
4. **Plantilla → copia → plan.** Asignar una plantilla la copia (`asignar_plantilla`); cambiar la plantilla no toca planes existentes.
5. **Multi-organización desde el inicio, invisible en la UI.** Todo dato de negocio cuelga de `organizacion_id` y lo aísla RLS.
6. **Simple ahora, bien modelado, extensible después.** Nada de chat, pagos, IA, móvil ni wearables antes de validar el núcleo.

## Nombres: blueprint → esquema real

El blueprint está en inglés; la base de datos y el código están en **español** (`snake_case`, sin tildes).

| Blueprint | Real |
|---|---|
| organizations / organization_members / profiles | `organizaciones` / `miembros_organizacion` / `perfiles` |
| students | `alumnos` (`nombres`, `apellidos`, `correo`, `fecha_nacimiento`, `fecha_inicio`, `estado`) |
| student_goals / student_conditions / student_notes | `objetivos_alumno` / `condiciones_alumno` / `notas_alumno` |
| measurements / progress_photos | `mediciones` (`peso_kg`, `cintura_cm`…) / `fotos_progreso` |
| body_regions / muscle_groups / muscles / joints | `regiones_corporales` / `grupos_musculares` / `musculos` / `articulaciones` |
| exercises / equipment / exercise_muscles / exercise_equipment | `ejercicios` / `equipamiento` / `ejercicios_musculos` / `ejercicios_equipamiento` |
| workout_templates (+ days, blocks, exercises) | `plantillas`, `plantilla_dias`, `plantilla_bloques`, `plantilla_ejercicios` |
| workout_plans (+ days, blocks, exercises, sets) | `planes`, `plan_dias`, `plan_bloques`, `plan_ejercicios`, `plan_series` |
| training_sessions / session_exercises / session_sets | `sesiones` / `sesion_ejercicios` / `sesion_series` |
| appointments | `citas` (anti-cruce por entrenador con `exclude using gist`) |
| audit_logs | `registros_auditoria` (se llena solo por trigger) |
| created_at / updated_at | `creado_en` / `actualizado_en` |
| status: active/inactive/archived | `estado`: `activo`/`inactivo`/`archivado` |
| roles owner/admin/trainer/assistant | `propietario`/`admin`/`entrenador`/`asistente` |

Rutas: `/inicio`, `/alumnos`, `/entrenamiento`, `/ejercicios`, `/calendario`, `/progreso`, `/configuracion`.

## Estado por milestone

| # | Milestone | Estado |
|---|---|---|
| 1 | Auth, organizaciones, RLS, alumnos, perfil | ✅ Hecho (Google OAuth incluido). Falta en el perfil: objetivos y condiciones editables. |
| 2 | Anatomía, ejercicios, relación muscular, búsqueda | 🟡 Mapa corporal SVG + búsqueda por músculo con ranking hechos. Biblioteca global: 121 ejercicios y 39 músculos (migraciones 007–010). Faltan ejercicios propios de la organización y filtro por equipamiento. |
| 3 | Constructor de rutinas: mapa, sugerencias, DnD, bloques, prescripción | ⬜ Siguiente. Reutiliza `MapaCorporal` y `rankearEjercicios`. Requiere instalar `@dnd-kit`. |
| 4 | Plantillas, planes, asignación, calendario | 🟡 Calendario semanal de citas hecho. Faltan plantillas, planes y asignación (la RPC `asignar_plantilla` ya existe). |
| 5 | Sesiones, series, mediciones, progreso | 🟡 Mediciones hechas. Faltan registro de sesión (`iniciar_sesion_desde_plan` ya existe) y gráficas. |

Orden recomendado a partir de aquí: **constructor de rutinas → plantillas/planes/asignación → registro de sesión → progreso → tablero**.

## Definition of Done del MVP

El flujo completo funciona de punta a punta: iniciar sesión → crear alumno → completar perfil → definir objetivo → elegir músculos → ver ejercicios sugeridos → crear rutina → ordenar → configurar series/reps/peso → guardar plan → asignarlo → programar sesión → verla en el calendario → registrar resultados → consultar historial → registrar medición → ver progreso.

## Fuera del MVP

Nutrición avanzada, chat, pagos, suscripciones, IA, wearables, notificaciones push, app móvil, analítica avanzada, UI multi-entrenador.
