"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { obtenerContexto } from "@/lib/sesion";

const esId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** Crea el alumno con los datos de la solicitud (y su objetivo, si lo dio) y abre su ficha para completarla. */
export async function aceptarSolicitud(id: string): Promise<{ error?: string }> {
  if (!esId(id)) return { error: "Solicitud no encontrada." };
  const { supabase } = await obtenerContexto();
  const { data: alumnoId, error } = await supabase.rpc("aceptar_solicitud", { p_solicitud_id: id });
  if (error || !alumnoId) return { error: "No se pudo crear el alumno. Inténtalo de nuevo." };
  redirect(`/alumnos/${alumnoId}`);
}

/** Descartar (o devolver a nuevas). No se borra: queda en "Descartadas" por si acaso. */
export async function cambiarEstadoSolicitud(id: string, estado: "nueva" | "descartada"): Promise<{ error?: string }> {
  if (!esId(id) || (estado !== "nueva" && estado !== "descartada")) return { error: "Cambio no válido." };
  const { supabase } = await obtenerContexto();
  const { data, error } = await supabase.from("solicitudes").update({ estado }).eq("id", id).neq("estado", "aceptada").select("id");
  if (error || !data?.length) return { error: "No se pudo guardar el cambio." };
  refresh();
  return {};
}
