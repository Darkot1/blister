---
name: verificar
description: Verifica que un cambio en Blister está listo - tipos, lint, build de producción con Cache Components y revisión visual de la UI. Úsalo al terminar cualquier cambio de código antes de darlo por hecho o de hacer commit.
---

# Verificar

Ejecuta en este orden y no declares terminado nada con errores pendientes.

```bash
npm install                       # si no existe node_modules
npx next typegen                  # genera PageProps/LayoutProps para rutas nuevas
npx tsc --noEmit
npm run lint
NEXT_PUBLIC_SUPABASE_URL=https://ejemplo.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=x npx next build
```

Las variables ficticias solo hacen falta si no existe `.env.local`. **El build es obligatorio**: las reglas de Cache Components solo se validan ahí.

## Errores típicos del build

| Mensaje | Causa y arreglo |
|---|---|
| `Uncached data was accessed outside of <Suspense>` | Lectura de sesión, datos o `searchParams` fuera de `Suspense`. Muévela a un componente hijo envuelto. |
| `unstable value new Date() while prerendering` | `new Date()`/`hoyLocal()` antes de un acceso dinámico. Llámalo después de `await obtenerContexto()`. |
| Cambios viejos que no desaparecen | `rm -rf .next` |

## Hidratación

Las fechas formateadas con `Intl` difieren en espacios Unicode entre Node y el navegador. En componentes cliente usa siempre `src/lib/formato.ts` / `src/lib/calendario.ts` (normalizan con `espaciosSimples`). La hora actual en cliente: `useSyncExternalStore` con `getServerSnapshot` que devuelva `null` (ver `useAhora` en `calendario/semana.tsx`).

## Revisión visual

Para cambios de UI, mira la pantalla, no solo el código:

1. Con `.env.local` y sesión: `npm run dev` y abre la ruta.
2. Sin sesión (o para revisar un componente con datos de prueba): crea temporalmente `src/app/auth/vista-previa/page.tsx` (bajo `/auth`, ruta pública en `src/lib/supabase/proxy.ts`) que renderice el componente con datos ficticios dentro de `Suspense` tras `await connection()`. Arranca `next dev -p 3123` y captura:
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars \
     --virtual-time-budget=8000 --window-size=1300,1900 --screenshot=<scratchpad>/escritorio.png http://localhost:3123/auth/vista-previa
   ```
   Repite con `--window-size=500,1600` para móvil. Lee el log del servidor por errores de hidratación.
3. **Borra la ruta de vista previa** y detén el servidor antes de terminar. Comprueba con `git status` que no queda.

Revisa en las capturas: alineación, textos truncados, estados vacíos, contraste de seleccionados y que nada desborde a 400-500 px.
