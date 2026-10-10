"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import { aInstante } from "@/lib/calendario";
import { valoresDe, type EstadoFormulario } from "@/lib/validaciones/alumno";
import { ESTADOS_CITA, esquemaCita, type EstadoCita } from "@/lib/validaciones/cita";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
const esId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

type Supabase = Awaited<ReturnType<typeof obtenerContexto>>["supabase"];

/** Crea la sesión prescrita de un día del plan (ejercicios y series listos para registrar). */
async function crearSesion(supabase: Supabase, planDiaId: string, programadaPara: string) {
  const { data, error } = await supabase.rpc("iniciar_sesion_desde_plan", {
    p_plan_dia_id: planDiaId,
    p_programada_para: programadaPara,
  });
  return error ? null : data;
}

export async function crearCita(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = esquemaCita.safeParse(Object.fromEntries(formData));
  if (!datos.success) {
    return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };
  }

  const { alumno_id, tipo, fecha, hora, duracion, notas, plan_dia_id } = datos.data;
  const inicio = new Date(aInstante(fecha, hora));
  const fin = new Date(inicio.getTime() + duracion * 60_000);

  const { supabase, usuarioId, organizacionId } = await obtenerContexto();

  // La sesión se crea primero; si la cita no se puede guardar, se borra para no dejarla suelta.
  let sesionId: string | null = null;
  if (plan_dia_id && tipo === "entrenamiento") {
    sesionId = await crearSesion(supabase, plan_dia_id, inicio.toISOString());
    if (!sesionId) return { error: "No se pudo preparar la sesión de ese día del plan.", valores: valoresDe(formData) };
  }

  const { error } = await supabase.from("citas").insert({
    organizacion_id: organizacionId,
    entrenador_id: usuarioId,
    alumno_id,
    tipo,
    inicia_en: inicio.toISOString(),
    termina_en: fin.toISOString(),
    notas,
    sesion_id: sesionId,
  });

  if (error) {
    if (sesionId) await supabase.from("sesiones").delete().eq("id", sesionId);
    // 23P01: viola la restricción de exclusión citas_sin_cruce_entrenador.
    const mensaje = error.code === "23P01" ? "Ya tienes otra cita que se cruza con ese horario." : ERROR_GENERICO;
    return { error: mensaje, valores: valoresDe(formData) };
  }

  refresh();
  return { ok: true };
}

/** El estado de la sesión acompaña al de su cita (sin borrar nada: se puede deshacer). */
const ESTADO_SESION: Record<EstadoCita, string> = {
  programada: "programada",
  confirmada: "programada",
  completada: "completada",
  cancelada: "cancelada",
  no_asistio: "omitida",
};

export async function cambiarEstadoCita(citaId: string, estado: EstadoCita): Promise<{ error?: string }> {
  if (!ESTADOS_CITA.includes(estado) || !esId(citaId)) return { error: "Estado no válido." };
  const { supabase } = await obtenerContexto();
  const { data: cita, error } = await supabase.from("citas").update({ estado }).eq("id", citaId).select("sesion_id").maybeSingle();
  if (error) {
    // 23P01: al deshacer una cancelación, el horario ya lo ocupa otra cita.
    return {
      error: error.code === "23P01" ? "Ese horario ya lo ocupa otra cita." : "No se pudo guardar el cambio. Inténtalo de nuevo.",
    };
  }
  if (cita?.sesion_id) {
    await supabase
      .from("sesiones")
      .update({ estado: ESTADO_SESION[estado], completada_en: estado === "completada" ? new Date().toISOString() : null })
      .eq("id", cita.sesion_id);
  }
  refresh();
  return {};
}

/** Elige qué día del plan se entrena en una cita ya agendada. */
export async function elegirDiaCita(citaId: string, planDiaId: string): Promise<{ error?: string }> {
  if (!esId(citaId) || !esId(planDiaId)) return { error: "Día no válido." };
  const { supabase } = await obtenerContexto();
  const { data: cita } = await supabase.from("citas").select("inicia_en, sesion_id, tipo").eq("id", citaId).maybeSingle();
  if (!cita || cita.tipo !== "entrenamiento") return { error: "Esta cita no es de entrenamiento." };

  const sesionId = await crearSesion(supabase, planDiaId, cita.inicia_en);
  if (!sesionId) return { error: "No se pudo preparar la sesión de ese día del plan." };
  const { error } = await supabase.from("citas").update({ sesion_id: sesionId }).eq("id", citaId);
  if (error) {
    await supabase.from("sesiones").delete().eq("id", sesionId);
    return { error: ERROR_GENERICO };
  }
  // La sesión anterior (si la había) deja de contar como agendada.
  if (cita.sesion_id) await supabase.from("sesiones").update({ estado: "cancelada" }).eq("id", cita.sesion_id);
  refresh();
  return {};
}
