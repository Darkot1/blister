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

Portada pública en `/` (con sesión, va a `/inicio`). Rutas: `/inicio`, `/alumnos`, `/entrenamiento`, `/ejercicios`, `/calendario`, `/progreso`, `/maestros`, `/oficina`, `/configuracion`. `/oficina` es la oficina isométrica de agentes (SVG en `oficina/plano.tsx`; sitios, rutas y animación en `oficina/movimiento.ts`): escritorios, oficina del líder, sala de juntas, gimnasio y servidores. Los agentes caminan por el pasillo y, sin junta, pasean sin prisa; en la junta consultan la base de datos desde la sala. Tiene zoom (botones, pellizco o Ctrl + rueda, y arrastre) y un reloj con la hora real. Seis agentes con habilidades (rutinas, cargas, coach, analista, movilidad, agenda) más el **líder**, que en una junta reparte el caso de un alumno, recibe los hallazgos y propone una decisión que el entrenador aprueba (catálogo en `lib/agentes/catalogo.ts`, casos y guion en `lib/agentes/juntas.ts`). En la junta, cada agente sentado responde con IA vía OpenRouter (`lib/agentes/openrouter.ts` y `consulta.ts`; acción `consultarJunta`, solo con sesión; `OPENROUTER_API_KEY`; modelos: los `:free` vigentes leídos de la API de OpenRouter, con los preferidos de `OPENROUTER_MODELOS` primero y como mucho 3 intentos por pregunta, ~50 peticiones/día gratis; nunca de pago (un modelo sin `:free` en `OPENROUTER_MODELOS` se ignora); primero se prueba Groq (`GROQ_API_KEY`, plan gratuito; modelos en `GROQ_MODELOS`); si OpenRouter tampoco responde o se acaba su cuota, Gemini de Google AI Studio (`GEMINI_API_KEY`, plan gratuito sin facturación); no `openrouter/free`, que cae en modelos que no conversan): interpreta los datos del caso desde su rol y propone una acción, y el líder cruza los hallazgos. Reintenta si el modelo gratuito está saturado y, si falla, sigue con el guion. La junta se convoca sobre un alumno (buscador) y/o un caso escrito. El líder identifica qué se pide (`rutina`, `cargas`, `agenda`, `mensaje`, `diagnostico`), pone al agente principal primero y, al decidir, responde a eso, resuelve contradicciones, ordena el plan en hoy / esta semana / después y separa sus preguntas. Si se pide una rutina, Rutinas la diseña con ejercicios de la biblioteca (enlazados por nombre) y «Crear borrador de rutina» la guarda con `guardarRutina` y abre el constructor (sin asignarla). con alumno, los agentes reciben su expediente de la base de datos sin nombre ni contacto (`lib/agentes/expediente.ts`: objetivo, condiciones, notas, mediciones, asistencia, rutina activa ejercicio por ejercicio, sesiones, 1RM, cargas recientes por ejercicio y horarios en que viene o falta). Cada junta terminada se guarda en `juntas` (migración `20261028001800`; historial inmutable, RLS por espacio) y se puede reabrir desde «Juntas anteriores»; sus acciones: crear borrador de rutina, guardar en notas del alumno, agendar cita (`/calendario?alumno=`) y copiar el plan (`textoDeJunta`). Cada agente también responde preguntas directas desde su panel, opcionalmente sobre un alumno (mismo expediente anónimo). Los puestos se guardan en el navegador.

## Estado por milestone

| # | Milestone | Estado |
|---|---|---|
| 1 | Auth, organizaciones, RLS, alumnos, perfil | ✅ Hecho (Google OAuth incluido). Falta en el perfil: objetivos y condiciones editables. |
| 2 | Anatomía, ejercicios, relación muscular, búsqueda | 🟡 Mapa corporal SVG + búsqueda por músculo con ranking hechos. Biblioteca global: 121 ejercicios y 39 músculos (migraciones 007–010). Maestros (`/maestros`): ejercicios y músculos propios de la organización (migración 011). Falta filtro por equipamiento. |
| 3 | Constructor de rutinas: mapa, sugerencias, DnD, bloques, prescripción | ✅ `/entrenamiento/rutinas/[id]`: días → bloques (A, B…) → ejercicios (A1, A2…), catálogo por nombre o por músculo, valores iniciales según objetivo (`lib/entrenamiento/prescripcion.ts`), reordenar con `@dnd-kit` o botones, resumen de series por músculo y duración estimada. Se guarda todo junto con la RPC `guardar_plantilla` (migración `20261009001300`). |
| 4 | Plantillas, planes, asignación, calendario | 🟡 Calendario de citas, rutinas (plantillas) y asignación hechos: «Asignar a alumno» crea el plan con `asignar_plantilla` y lo activa con `activar_plan`; `/entrenamiento/planes/[id]` lo muestra en solo lectura. Al agendar un entrenamiento se elige el día del plan (sugiere el que sigue) y se crea su sesión con `iniciar_sesion_desde_plan` (`citas.sesion_id`); calendario, panel y perfil del alumno muestran qué se entrena. Falta editar un plan ya asignado. Las citas se pueden reprogramar y se sincronizan con el Google Calendar del entrenador (conexión en Ajustes, `conexiones_google` con tokens cifrados; `lib/google/calendario.ts`): el alumno con correo va como invitado y Google le envía invitación, cambios y recordatorios. |
| 5 | Sesiones, series, mediciones, progreso | ✅ Registro de sesión en `/sesiones/[id]` (serie a serie, con lo prescrito y lo de la última vez; al terminar, la cita queda completada). `/progreso`: resumen de alumnos activos (peso, medición pendiente, sesiones y asistencia en 30 días) y detalle por alumno (peso, grasa, medidas, constancia semanal, 1RM estimado por ejercicio con Epley, historial). Datos en `lib/entrenamiento/{sesiones,progreso}.ts`. |

**Página pública** (migraciones `20261028001500`, `…1600` y `…1700`): cada espacio puede activar `/e/<slug>` y editarla en `/configuracion/pagina` con vista previa en vivo: enlace, foto de portada (bucket público `paginas-publicas/{organizacion_id}/`), titular, "Sobre mí", hasta 6 métodos de trabajo, modalidad y zona, experiencia, certificaciones, WhatsApp e Instagram; "Eliminar página" la apaga y borra su contenido. La pestaña Diseño guarda `organizaciones.diseno` (jsonb, se lee con `normalizarDiseno`): orden, visibilidad y ancho (completo o media columna) de secciones en una rejilla que se arrastra (@dnd-kit), color principal (reemplaza `--acento` en la página), posición del texto de la portada (la foto va siempre detrás, con un velo del fondo elegido) y texto del botón. Las solicitudes nuevas también salen en el Panel (`/inicio`). La vista es una sola (`components/pagina-publica/vista.tsx`) para la página y la vista previa. Un visitante sin sesión pide entrenar o escribe; llega como fila de `solicitudes` (RPC `enviar_solicitud`, security definer, con validación y límite de ritmo; la página se lee con `pagina_publica`). El entrenador la revisa en `/alumnos/solicitudes` y la acepta (`aceptar_solicitud` crea el alumno y su objetivo) o la descarta: nunca se crea un alumno solo.

**Plataforma:** superadministrador (`/admin`, migración `20261009001100`). Resumen de la plataforma (`admin_panel`), usuarios (`admin_usuarios`) y detalle de cada espacio (`admin_detalle_espacio`: miembros, alumnos, citas, planes, plantillas y actividad), en solo lectura mediante RPC `admin_*`. Cada consulta de un espacio queda en `accesos_superadmin`, que solo leen los superadministradores (migración `20261009001200`). Puede suspender o reactivar un espacio con motivo; un espacio suspendido deja de dar acceso (`es_miembro_org` y `tiene_rol_org` exigen `organizaciones.estado = 'activo'`) y la app lleva a `/suspendido`. Para nombrar a alguien superadministrador: `insert into public.superadministradores (usuario_id) values ('<uuid>');` desde el editor SQL (no hay UI a propósito).

Orden recomendado a partir de aquí: **constructor de rutinas → plantillas/planes/asignación → registro de sesión → progreso → tablero**.

## Definition of Done del MVP

El flujo completo funciona de punta a punta: iniciar sesión → crear alumno → completar perfil → definir objetivo → elegir músculos → ver ejercicios sugeridos → crear rutina → ordenar → configurar series/reps/peso → guardar plan → asignarlo → programar sesión → verla en el calendario → registrar resultados → consultar historial → registrar medición → ver progreso.

## Fuera del MVP

Nutrición avanzada, chat, pagos, suscripciones, IA, wearables, notificaciones push, app móvil, analítica avanzada, UI multi-entrenador.
