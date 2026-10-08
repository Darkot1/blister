import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos-bd";

/** Cliente de Supabase para componentes de cliente. */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
