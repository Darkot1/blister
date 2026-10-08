import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./tipos-bd";
import { connection } from "next/server";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. Crear uno por petición. */
export async function crearClienteServidor() {
  const almacen = await cookies();
  await connection();


  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(cookiesAGuardar) {
          try {
            for (const { name, value, options } of cookiesAGuardar) {
              almacen.set(name, value, options);
            }
          } catch {
            // Desde un Server Component no se pueden escribir cookies.
            // No pasa nada: el proxy ya refresca la sesión en cada petición.
          }
        },
      },
    },
  );
}
