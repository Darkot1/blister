# Blister Fitness

Plataforma de entrenamiento personalizado para entrenadores.
Next.js 16 + Supabase. Modo actual: **un solo entrenador** (la organización existe en la base de datos pero es invisible; se usará en la fase SaaS).

## Requisitos

- Node.js 20.9 o superior
- El proyecto de Supabase **BlisterFitness** (las migraciones ya están aplicadas)

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Las variables de conexión ya están en `.env.local`
(la clave publicable de Supabase es pública por diseño; los datos los protege RLS).

## Configuración necesaria en Supabase

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (cámbiala por tu dominio al publicar).
- **Redirect URLs:** agrega `http://localhost:3000/**` y, al publicar, `https://tu-dominio/**`.

Después de crear tu cuenta, desactiva el registro público en
**Authentication → Sign In / Providers → Allow new users to sign up**.

## Estructura

```
src/
├── proxy.ts                    # Refresca la sesión y protege rutas (antes "middleware")
├── app/
│   ├── page.tsx                # Portada pública (con sesión, lleva a /inicio)
│   ├── (auth)/                 # Ingresar, registro, recuperar y nueva contraseña
│   ├── (app)/                  # App autenticada (barra lateral)
│   │   ├── inicio/             # Panel del día: citas, solicitudes, pendientes
│   │   ├── alumnos/            # Lista, nuevo, perfil [id], editar, solicitudes
│   │   ├── entrenamiento/      # Rutinas (constructor), planes asignados
│   │   ├── ejercicios/         # Biblioteca + búsqueda por músculo en el mapa corporal
│   │   ├── calendario/         # Semana de citas (rejilla en escritorio, agenda en móvil)
│   │   ├── sesiones/           # Registro de sesión serie a serie
│   │   ├── progreso/           # Resumen de alumnos y detalle (peso, medidas, 1RM)
│   │   ├── maestros/           # Ejercicios y músculos propios del espacio
│   │   ├── oficina/            # Oficina de agentes y juntas con IA
│   │   ├── configuracion/      # Ajustes, página pública, Google, Telegram
│   │   └── admin/              # Superadministrador (solo lectura + suspender)
│   ├── (legal)/                # Privacidad, términos, cookies
│   ├── e/[slug]/               # Página pública del entrenador y formulario de solicitud
│   ├── api/google/             # OAuth de Google Calendar (conectar, callback)
│   ├── api/telegram/           # Webhook del bot de Telegram
│   ├── suspendido/             # Aviso de espacio suspendido
│   └── auth/confirmar/         # Destino de los enlaces de correo
├── components/
│   ├── ui/                     # Botones, campos, avisos, diálogo, esqueletos
│   ├── anatomia/               # Mapa corporal SVG (frente y espalda)
│   ├── pagina-publica/         # Vista de /e/<slug> (y su vista previa)
│   ├── datos/                  # Gráficas (barras por semana, líneas, tendencia)
│   └── app/                    # Navegación, encabezado, usuario actual
└── lib/
    ├── sesion.ts               # Capa de acceso: usuario + espacio de trabajo
    ├── supabase/               # Clientes servidor/navegador/proxy y tipos
    ├── validaciones/           # Esquemas Zod
    ├── ejercicios/ranking.ts   # Sugerencia de ejercicios por músculo (determinista)
    ├── entrenamiento/          # Prescripción, planes, sesiones y progreso
    ├── agentes/                # Catálogo, juntas, expediente y cliente LLM (Groq → OpenRouter → Gemini)
    ├── google/                 # OAuth y sincronización con Google Calendar
    ├── telegram/               # Configuración del bot
    ├── pagina-publica/         # Contenido y validación de la página pública
    ├── calendario.ts           # Semanas, días y horas en la zona de Bogotá
    └── formato.ts              # Fechas y números en es-CO
supabase/migrations/            # Historial de la base de datos
docs/hoja-de-ruta.md            # Estado por milestone y nombres blueprint → esquema
.claude/                        # Agentes y skills de Claude Code para este proyecto
```

## Notas técnicas

- **Cache Components** está activado: todo lo que lee la sesión o datos va dentro de `<Suspense>`.
  Si una página nueva falla al compilar con un error de "outside of `<Suspense>`", esa es la causa.
- Las mutaciones son Server Actions que llaman a `refresh()` o `redirect()`. La excepción es el
  formulario público de `/e/[slug]`, que devuelve su estado al formulario.
- Regenerar tipos tras cambiar la base de datos:
  `npx supabase gen types typescript --project-id xxhynsflkytaielhtnpn > src/lib/supabase/tipos-bd.ts`
- Si la compilación muestra cambios viejos: `rm -rf .next`.
