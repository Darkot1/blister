import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/servidor";

export type Contexto = {
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>;
  usuarioId: string;
  /** Espacio de trabajo del entrenador. Invisible en la UI hasta la fase SaaS. */
  organizacionId: string;
};

/**
 * Capa de acceso a datos: verifica la sesión y resuelve el espacio de trabajo.
 * Usar en cada Server Component con datos y en cada Server Action.
 */
export async function obtenerContexto(): Promise<Contexto> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const usuarioId = data?.claims?.sub;
  if (!usuarioId) redirect("/ingresar");

  const { data: membresia } = await supabase
    .from("miembros_organizacion")
    .select("organizacion_id")
    .eq("usuario_id", usuarioId)
    .eq("estado", "activo")
    .order("creado_en", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membresia) {
    throw new Error("Tu cuenta no tiene un espacio de trabajo activo.");
  }

  return { supabase, usuarioId, organizacionId: membresia.organizacion_id };
}

/** Memorizada por petición: la barra lateral y el cajón móvil la piden a la vez. */
export const obtenerPerfil = cache(async () => {
  const { supabase, usuarioId } = await obtenerContexto();
  const { data } = await supabase
    .from("perfiles")
    .select("nombres, apellidos")
    .eq("id", usuarioId)
    .maybeSingle();
  return data;
});
