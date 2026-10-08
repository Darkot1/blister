"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import { aInstante } from "@/lib/calendario";
import { valoresDe, type EstadoFormulario } from "@/lib/validaciones/alumno";
import { ESTADOS_CITA, esquemaCita, type EstadoCita } from "@/lib/validaciones/cita";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

export async function crearCita(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = esquemaCita.safeParse(Object.fromEntries(formData));
  if (!datos.success) {
    return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };
  }

  const { alumno_id, tipo, fecha, hora, duracion, notas } = datos.data;
  const inicio = new Date(aInstante(fecha, hora));
  const fin = new Date(inicio.getTime() + duracion * 60_000);

  const { supabase, usuarioId, organizacionId } = await obtenerContexto();
  const { error } = await supabase.from("citas").insert({
    organizacion_id: organizacionId,
    entrenador_id: usuarioId,
    alumno_id,
    tipo,
    inicia_en: inicio.toISOString(),
    termina_en: fin.toISOString(),
    notas,
  });

  if (error) {
    // 23P01: viola la restricción de exclusión citas_sin_cruce_entrenador.
    const mensaje = error.code === "23P01" ? "Ya tienes otra cita que se cruza con ese horario." : ERROR_GENERICO;
    return { error: mensaje, valores: valoresDe(formData) };
  }

  refresh();
  return { ok: true };
}

export async function cambiarEstadoCita(citaId: string, estado: EstadoCita) {
  if (!ESTADOS_CITA.includes(estado)) return;
  const { supabase } = await obtenerContexto();
  await supabase.from("citas").update({ estado }).eq("id", citaId);
  refresh();
}
