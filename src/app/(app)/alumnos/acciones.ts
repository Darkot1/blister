"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import {
  esquemaAlumno,
  esquemaMedicion,
  valoresDe,
  type EstadoFormulario,
} from "@/lib/validaciones/alumno";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

export async function crearAlumno(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = esquemaAlumno.safeParse(Object.fromEntries(formData));
  if (!datos.success) {
    return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };
  }

  const { supabase, organizacionId } = await obtenerContexto();
  const { data, error } = await supabase
    .from("alumnos")
    .insert({ ...datos.data, organizacion_id: organizacionId })
    .select("id")
    .single();
  if (error) return { error: ERROR_GENERICO, valores: valoresDe(formData) };

  redirect(`/alumnos/${data.id}`);
}

export async function actualizarAlumno(
  alumnoId: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const datos = esquemaAlumno.safeParse(Object.fromEntries(formData));
  if (!datos.success) {
    return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };
  }

  const { supabase } = await obtenerContexto();
  const { error } = await supabase.from("alumnos").update(datos.data).eq("id", alumnoId);
  if (error) return { error: ERROR_GENERICO, valores: valoresDe(formData) };

  redirect(`/alumnos/${alumnoId}`);
}

export async function cambiarEstadoAlumno(alumnoId: string, estado: "activo" | "inactivo" | "archivado") {
  const { supabase } = await obtenerContexto();
  await supabase.from("alumnos").update({ estado }).eq("id", alumnoId);
  refresh();
}

export async function agregarNota(alumnoId: string, _: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const contenido = String(formData.get("contenido") ?? "").trim();
  if (!contenido) return { errores: { contenido: ["Escribe la nota"] } };

  const { supabase, usuarioId } = await obtenerContexto();
  const { error } = await supabase
    .from("notas_alumno")
    .insert({ alumno_id: alumnoId, autor_id: usuarioId, contenido });
  if (error) return { error: ERROR_GENERICO, valores: { contenido } };

  refresh();
  return { ok: true };
}

export async function registrarMedicion(
  alumnoId: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const datos = esquemaMedicion.safeParse(Object.fromEntries(formData));
  if (!datos.success) {
    return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };
  }

  const { supabase, usuarioId } = await obtenerContexto();
  const { medido_en, ...medidas } = datos.data;
  const { error } = await supabase.from("mediciones").insert({
    ...medidas,
    alumno_id: alumnoId,
    registrado_por: usuarioId,
    // La fecha del formulario es de calendario: se guarda al mediodía de Bogotá.
    medido_en: `${medido_en}T12:00:00-05:00`,
  });
  if (error) return { error: ERROR_GENERICO, valores: valoresDe(formData) };

  refresh();
  return { ok: true };
}
