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
│   ├── (auth)/                 # Ingresar, registro, recuperar y nueva contraseña
│   ├── (app)/                  # App autenticada (barra lateral)
│   │   ├── inicio/
│   │   ├── alumnos/            # Lista, nuevo, perfil [id], editar
│   │   ├── ejercicios/         # Biblioteca
│   │   └── …                   # Secciones en construcción
│   └── auth/confirmar/         # Destino de los enlaces de correo
├── components/
│   ├── ui/                     # Botones, campos, avisos, esqueletos
│   └── app/                    # Navegación, encabezado, usuario actual
└── lib/
    ├── sesion.ts               # Capa de acceso: usuario + espacio de trabajo
    ├── supabase/               # Clientes servidor/navegador/proxy y tipos
    ├── validaciones/           # Esquemas Zod
    └── formato.ts              # Fechas y números en es-CO
supabase/migrations/            # Historial de la base de datos
```

## Notas técnicas

- **Cache Components** está activado: todo lo que lee la sesión o datos va dentro de `<Suspense>`.
  Si una página nueva falla al compilar con un error de "outside of `<Suspense>`", esa es la causa.
- Las mutaciones son Server Actions que llaman a `refresh()` o `redirect()`.
- Regenerar tipos tras cambiar la base de datos:
  `npx supabase gen types typescript --project-id xxhynsflkytaielhtnpn > src/lib/supabase/tipos-bd.ts`
- Si la compilación muestra cambios viejos: `rm -rf .next`.
