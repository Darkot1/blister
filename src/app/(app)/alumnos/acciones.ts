"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import {
  esquemaAlumno,
  esquemaMedicion,
  esquemaObjetivo,
  valoresDe,
  type DatosObjetivo,
  type EstadoFormulario,
} from "@/lib/validaciones/alumno";
import { ETIQUETA_TIPO_OBJETIVO } from "@/lib/formato";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

const hoyBogota = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

type Supabase = Awaited<ReturnType<typeof obtenerContexto>>["supabase"];

/** Valida a la vez los datos del alumno y su objetivo principal. */
function leerFormulario(formData: FormData) {
  const entrada = Object.fromEntries(formData);
  const alumno = esquemaAlumno.safeParse(entrada);
  const objetivo = esquemaObjetivo.safeParse(entrada);
  if (!alumno.success || !objetivo.success) {
    const errores = {
      ...(alumno.success ? {} : z.flattenError(alumno.error).fieldErrors),
      ...(objetivo.success ? {} : z.flattenError(objetivo.error).fieldErrors),
    };
    return { ok: false as const, estado: { errores, valores: valoresDe(formData) } satisfies EstadoFormulario };
  }
  return { ok: true as const, alumno: alumno.data, objetivo: objetivo.data };
}

/**
 * Crea, actualiza o cierra el objetivo principal activo (solo puede haber uno).
 * Devuelve un mensaje de error para el formulario, o null si se guardó.
 */
async function guardarObjetivoPrincipal(supabase: Supabase, alumnoId: string, o: DatosObjetivo) {
  const { data: actual } = await supabase
    .from("objetivos_alumno")
    .select("id, fecha_inicio")
    .eq("alumno_id", alumnoId)
    .eq("es_principal", true)
    .eq("estado", "activo")
    .maybeSingle();

  if (!o.objetivo_tipo) {
    // Se quitó el objetivo: se cancela en lugar de borrarlo, para conservar el historial.
    if (!actual) return null;
    const { error } = await supabase.from("objetivos_alumno").update({ estado: "cancelado" }).eq("id", actual.id);
    return error ? ERROR_GENERICO : null;
  }

  const inicio = actual?.fecha_inicio ?? hoyBogota();
  if (o.objetivo_fecha_meta && o.objetivo_fecha_meta < inicio) {
    return actual ? "La fecha meta no puede ser anterior al inicio del objetivo" : "La fecha meta no puede estar en el pasado";
  }

  const fila = {
    tipo: o.objetivo_tipo,
    nombre: o.objetivo_nombre ?? ETIQUETA_TIPO_OBJETIVO[o.objetivo_tipo],
    fecha_meta: o.objetivo_fecha_meta,
  };
  const { error } = actual
    ? await supabase.from("objetivos_alumno").update(fila).eq("id", actual.id)
    : await supabase.from("objetivos_alumno").insert({ ...fila, alumno_id: alumnoId, es_principal: true });
  return error ? ERROR_GENERICO : null;
}

export async function crearAlumno(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = leerFormulario(formData);
  if (!datos.ok) return datos.estado;
  // Se comprueba antes de crear al alumno, para no dejarlo a medias.
  if (datos.objetivo.objetivo_fecha_meta && datos.objetivo.objetivo_fecha_meta < hoyBogota()) {
    return { errores: { objetivo_fecha_meta: ["La fecha meta no puede estar en el pasado"] }, valores: valoresDe(formData) };
  }

  const { supabase, organizacionId } = await obtenerContexto();
  const { data, error } = await supabase
    .from("alumnos")
    .insert({ ...datos.alumno, organizacion_id: organizacionId })
    .select("id")
    .single();
  if (error) return { error: ERROR_GENERICO, valores: valoresDe(formData) };

  // El alumno ya existe: si falla el objetivo, se puede completar desde "Editar".
  await guardarObjetivoPrincipal(supabase, data.id, datos.objetivo);
  redirect(`/alumnos/${data.id}`);
}

export async function actualizarAlumno(
  alumnoId: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const datos = leerFormulario(formData);
  if (!datos.ok) return datos.estado;

  const { supabase } = await obtenerContexto();
  const { error } = await supabase.from("alumnos").update(datos.alumno).eq("id", alumnoId);
  if (error) return { error: ERROR_GENERICO, valores: valoresDe(formData) };

  const errorObjetivo = await guardarObjetivoPrincipal(supabase, alumnoId, datos.objetivo);
  if (errorObjetivo) {
    return errorObjetivo === ERROR_GENERICO
      ? { error: ERROR_GENERICO, valores: valoresDe(formData) }
      : { errores: { objetivo_fecha_meta: [errorObjetivo] }, valores: valoresDe(formData) };
  }

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
