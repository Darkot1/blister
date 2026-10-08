---
name: nueva-pantalla
description: Crea una página o sección nueva de la app (Server Component con datos, formulario con Server Action y validación Zod) siguiendo los patrones de Blister con Next.js 16 y Cache Components. Úsalo al añadir rutas bajo src/app/(app)/, reemplazar un "Próximamente" o agregar un formulario que guarde en Supabase.
---

# Nueva pantalla

Next.js 16 con `cacheComponents: true`. Antes de usar una API que no aparezca aquí, léela en `node_modules/next/dist/docs/` (si falta, `npm install`).

## 1. Página (Server Component)

Plantilla mínima, como en `src/app/(app)/alumnos/page.tsx` y `src/app/(app)/calendario/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";

export const metadata: Metadata = { title: "Planes" };

export default function PaginaPlanes({ searchParams }: PageProps<"/entrenamiento">) {
  return (
    <>
      <Encabezado titulo="Planes" />                     {/* estático: entra al shell */}
      <Suspense fallback={<EsqueletoLista />}>
        <Lista searchParams={searchParams} />           {/* lee sesión/datos: dentro de Suspense */}
      </Suspense>
    </>
  );
}

async function Lista({ searchParams }: { searchParams: PageProps<"/entrenamiento">["searchParams"] }) {
  const parametros = await searchParams;
  const { supabase, organizacionId } = await obtenerContexto();
  // ...consultas en paralelo con Promise.all
}
```

Reglas de Cache Components (el build falla si se rompen):
- Todo lo que lea cookies, sesión, `searchParams`, `params` o datos va **dentro de `<Suspense>`**.
- `new Date()`, `Date.now()` y `hoyLocal()` van **después** de un acceso dinámico (`await obtenerContexto()` llama a `connection()`). Si no: error "unstable value `new Date()` while prerendering".
- `PageProps<"/ruta">` es global (lo genera `next typegen`); no lo importes.
- `obtenerContexto()` es la única puerta a datos: verifica sesión y resuelve `organizacionId`. Nunca crees clientes de Supabase sueltos en páginas.
- RLS filtra por organización. Si una consulta por id devuelve vacío, trátalo como inexistente (`notFound()`), no como error.
- Un id de la URL se valida antes de consultar: `if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();`.

## 2. Formulario + Server Action

- Esquema Zod en `src/lib/validaciones/<entidad>.ts`. Textos vacíos → `null` (ver `textoOpcional` en `alumno.ts`). Mensajes en español, de tú: "Escribe el nombre".
- Acción en `acciones.ts` junto a la página, con `"use server"`. Firma `(estadoPrevio: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>`.
- Error de validación → `{ errores: z.flattenError(e).fieldErrors, valores: valoresDe(formData) }` (conserva lo escrito).
- Error de BD → mensaje genérico; traduce los códigos conocidos (`23P01` exclusión, `23505` único) a lenguaje del entrenador.
- Éxito → `refresh()` (de `next/cache`) y `{ ok: true }`, o `redirect()` a la entidad creada.
- Las acciones que reciben un id lo reciben con `.bind(null, id)` desde el servidor, nunca desde un campo oculto editable.
- `organizacion_id` sale de `obtenerContexto()`, nunca del formulario.

Cliente: `useActionState(accion, {})`, campos de `@/components/ui/campo` (`Campo`, `AreaTexto`, `Selector`) con `errores={estado.errores?.x}` y `defaultValue={estado.valores?.x ?? inicial}`, botón `BotonEnvio` con `textoPendiente`, `Aviso` para `estado.error`. Para formularios en modal usa `Dialogo` (`@/components/ui/dialogo`).

## 3. Datos nuevos de la BD

Si la tabla aún no está en `src/lib/supabase/tipos-bd.ts`, añade su tipo `XFila` y su entrada en `Database.public.Tables` (los tipos son un subconjunto escrito a mano). Sin `Relationships`, los embeds (`select("*, alumno:alumnos(...)")`) no tipan: haz dos consultas y únelas con un `Map`.

## 4. Navegación y cierre

- Si es sección principal, añade la entrada en `SECCIONES` de `src/components/app/navegacion.tsx` (mantén la barra corta).
- Aplica el skill `sistema-diseno` para la UI y termina con el skill `verificar`.
