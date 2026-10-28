"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import { sincronizarCita } from "@/lib/google/calendario";

const esId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const ERROR = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

type Supabase = Awaited<ReturnType<typeof obtenerContexto>>["supabase"];

const esquemaSerie = z.object({
  peso: z.number().min(0).max(1500).nullable(),
  repeticiones: z.int().min(0).max(500).nullable(),
  rpe: z.number().min(0).max(10).nullable(),
  completada: z.boolean(),
});
export type DatosSerie = z.infer<typeof esquemaSerie>;

/** La primera serie anotada marca la sesión como "en curso" (y cuándo empezó). */
async function empezarSiHaceFalta(supabase: Supabase, sesionId: string) {
  await supabase
    .from("sesiones")
    .update({ estado: "en_curso", iniciada_en: new Date().toISOString() })
    .eq("id", sesionId)
    .eq("estado", "programada");
}

/** Guarda una serie (peso, repeticiones, RPE, hecha o no). Se llama al tocar cada serie: nada se pierde si se cierra la pantalla. */
export async function guardarSerie(sesionId: string, serieId: string, datos: DatosSerie): Promise<{ error?: string }> {
  if (!esId(sesionId) || !esId(serieId)) return { error: "Serie no encontrada." };
  const valido = esquemaSerie.safeParse(datos);
  if (!valido.success) return { error: "Revisa el peso y las repeticiones." };
  const { supabase } = await obtenerContexto();
  const { data, error } = await supabase.from("sesion_series").update(valido.data).eq("id", serieId).select("id");
  if (error || !data?.length) return { error: ERROR };
  if (valido.data.completada) await empezarSiHaceFalta(supabase, sesionId);
  return {};
}

/** Añade una serie al final, con el mismo peso que la anterior. */
export async function agregarSerie(sesionId: string, sesionEjercicioId: string): Promise<{ error?: string }> {
  if (!esId(sesionId) || !esId(sesionEjercicioId)) return { error: "Ejercicio no encontrado." };
  const { supabase } = await obtenerContexto();
  const { data: ultima } = await supabase
    .from("sesion_series")
    .select("numero_serie, peso, unidad_peso")
    .eq("sesion_ejercicio_id", sesionEjercicioId)
    .order("numero_serie", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("sesion_series").insert({
    sesion_ejercicio_id: sesionEjercicioId,
    numero_serie: (ultima?.numero_serie ?? 0) + 1,
    peso: ultima?.peso ?? null,
    unidad_peso: ultima?.unidad_peso ?? "kg",
  });
  if (error) return { error: ERROR };
  refresh();
  return {};
}

/** Quita una serie que no se hizo. */
export async function quitarSerie(serieId: string): Promise<{ error?: string }> {
  if (!esId(serieId)) return { error: "Serie no encontrada." };
  const { supabase } = await obtenerContexto();
  const { data, error } = await supabase.from("sesion_series").delete().eq("id", serieId).select("id");
  if (error || !data?.length) return { error: ERROR };
  refresh();
  return {};
}

const esquemaCierre = z.object({
  rpe_sesion: z
    .union([z.literal(""), z.coerce.number().min(1).max(10)])
    .transform((v) => (v === "" ? null : v)),
  notas: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null),
});

/** Cierra la sesión: queda completada (con su RPE y notas) y su cita también, si la tiene. */
export async function terminarSesion(sesionId: string, formData: FormData): Promise<{ error?: string }> {
  if (!esId(sesionId)) return { error: "Sesión no encontrada." };
  const datos = esquemaCierre.safeParse({ rpe_sesion: formData.get("rpe_sesion") ?? "", notas: formData.get("notas") ?? "" });
  if (!datos.success) return { error: "El esfuerzo de la sesión va de 1 a 10." };

  const { supabase, usuarioId } = await obtenerContexto();
  const ahora = new Date().toISOString();
  const { data: sesion } = await supabase.from("sesiones").select("iniciada_en").eq("id", sesionId).maybeSingle();
  if (!sesion) return { error: "Sesión no encontrada." };
  const { error } = await supabase
    .from("sesiones")
    .update({ ...datos.data, estado: "completada", completada_en: ahora, iniciada_en: sesion.iniciada_en ?? ahora })
    .eq("id", sesionId);
  if (error) return { error: ERROR };

  // La cita de esta sesión también queda completada (sin avisar al alumno en Google).
  const { data: citas } = await supabase
    .from("citas")
    .update({ estado: "completada" })
    .eq("sesion_id", sesionId)
    .in("estado", ["programada", "confirmada"])
    .select("id");
  for (const c of citas ?? []) await sincronizarCita(supabase, usuarioId, c.id, false);

  refresh();
  return {};
}

/** Volver a abrir una sesión cerrada por error. */
export async function reabrirSesion(sesionId: string): Promise<{ error?: string }> {
  if (!esId(sesionId)) return { error: "Sesión no encontrada." };
  const { supabase } = await obtenerContexto();
  const { error } = await supabase.from("sesiones").update({ estado: "en_curso", completada_en: null }).eq("id", sesionId);
  if (error) return { error: ERROR };
  refresh();
  return {};
}

/**
 * Empieza ahora una sesión de un día del plan activo, sin cita en el calendario
 * (entrenamiento improvisado o alumno que entrena por su cuenta). Abre la sesión para registrarla.
 */
export async function empezarSesion(planDiaId: string): Promise<{ error?: string }> {
  if (!esId(planDiaId)) return { error: "Día no válido." };
  const { supabase } = await obtenerContexto();
  const { data: dia } = await supabase.from("plan_dias").select("plan_id").eq("id", planDiaId).maybeSingle();
  const { data: plan } = dia ? await supabase.from("planes").select("estado").eq("id", dia.plan_id).maybeSingle() : { data: null };
  if (plan?.estado !== "activo") return { error: "Ese día no es de un plan activo." };

  const ahora = new Date().toISOString();
  const { data: sesionId, error } = await supabase.rpc("iniciar_sesion_desde_plan", { p_plan_dia_id: planDiaId, p_programada_para: ahora });
  if (error || !sesionId) return { error: "No se pudo preparar la sesión. Inténtalo de nuevo." };
  await supabase.from("sesiones").update({ estado: "en_curso", iniciada_en: ahora }).eq("id", sesionId);
  redirect(`/sesiones/${sesionId}`);
}
