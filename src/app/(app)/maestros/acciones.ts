"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import { valoresDe, type EstadoFormulario } from "@/lib/validaciones/alumno";
import { esquemaMusculo, leerEjercicio, slugDe } from "@/lib/validaciones/maestros";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";

type Contexto = Awaited<ReturnType<typeof obtenerContexto>>;
type DatosEjercicio = NonNullable<ReturnType<typeof leerEjercicio>["data"]>;

/** Reemplaza los músculos y el equipamiento de un ejercicio propio. */
async function guardarRelaciones(supabase: Contexto["supabase"], ejercicioId: string, datos: DatosEjercicio) {
  const borrados = await Promise.all([
    supabase.from("ejercicios_musculos").delete().eq("ejercicio_id", ejercicioId),
    supabase.from("ejercicios_equipamiento").delete().eq("ejercicio_id", ejercicioId),
  ]);
  if (borrados.some((r) => r.error)) return false;

  const [musculos, equipos] = await Promise.all([
    supabase
      .from("ejercicios_musculos")
      .insert(datos.musculos.map((m) => ({ ejercicio_id: ejercicioId, musculo_id: m.id, rol: m.rol }))),
    datos.equipos.length
      ? supabase
          .from("ejercicios_equipamiento")
          .insert(datos.equipos.map((id) => ({ ejercicio_id: ejercicioId, equipamiento_id: id })))
      : Promise.resolve({ error: null }),
  ]);
  return !musculos.error && !equipos.error;
}

const filaEjercicio = (d: DatosEjercicio) => ({
  nombre: d.nombre,
  tipo: d.tipo,
  dificultad: d.dificultad,
  es_unilateral: d.es_unilateral,
  descripcion: d.descripcion,
  instrucciones: d.instrucciones,
});

const nombreRepetido = (codigo?: string) => codigo === "23505";

export async function crearEjercicio(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = leerEjercicio(formData);
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };

  const { supabase, organizacionId, usuarioId } = await obtenerContexto();
  const { data, error } = await supabase
    .from("ejercicios")
    .insert({ ...filaEjercicio(datos.data), organizacion_id: organizacionId, creado_por: usuarioId, es_global: false })
    .select("id")
    .single();
  if (error) {
    return {
      error: nombreRepetido(error.code) ? undefined : ERROR_GENERICO,
      errores: nombreRepetido(error.code) ? { nombre: ["Ya tienes un ejercicio con ese nombre"] } : undefined,
      valores: valoresDe(formData),
    };
  }

  if (!(await guardarRelaciones(supabase, data.id, datos.data))) {
    // Sin músculos el ejercicio no sirve para las sugerencias: se archiva en lugar de dejarlo a medias.
    await supabase.from("ejercicios").update({ estado: "archivado" }).eq("id", data.id);
    return { error: ERROR_GENERICO, valores: valoresDe(formData) };
  }

  redirect("/maestros/ejercicios?origen=propios");
}

export async function actualizarEjercicio(
  ejercicioId: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const datos = leerEjercicio(formData);
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };

  const { supabase } = await obtenerContexto();
  // RLS solo deja editar ejercicios propios: si no actualiza ninguna fila, no es tuyo.
  const { data, error } = await supabase
    .from("ejercicios")
    .update(filaEjercicio(datos.data))
    .eq("id", ejercicioId)
    .eq("es_global", false)
    .select("id");
  if (error || !data?.length) {
    return {
      error: nombreRepetido(error?.code) ? undefined : ERROR_GENERICO,
      errores: nombreRepetido(error?.code) ? { nombre: ["Ya tienes un ejercicio con ese nombre"] } : undefined,
      valores: valoresDe(formData),
    };
  }
  if (!(await guardarRelaciones(supabase, ejercicioId, datos.data))) {
    return { error: ERROR_GENERICO, valores: valoresDe(formData) };
  }

  redirect("/maestros/ejercicios?origen=propios");
}

export async function cambiarEstadoEjercicio(ejercicioId: string, estado: "activo" | "archivado") {
  const { supabase } = await obtenerContexto();
  await supabase.from("ejercicios").update({ estado }).eq("id", ejercicioId).eq("es_global", false);
  redirect(estado === "archivado" ? "/maestros/ejercicios?origen=archivados" : "/maestros/ejercicios?origen=propios");
}

function leerMusculo(formData: FormData) {
  return esquemaMusculo.safeParse({
    nombre: formData.get("nombre") ?? "",
    grupo_muscular_id: formData.get("grupo_muscular_id") ?? "",
    descripcion: formData.get("descripcion") ?? "",
  });
}

export async function crearMusculo(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = leerMusculo(formData);
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };

  const { supabase, organizacionId, usuarioId } = await obtenerContexto();
  // El slug es global: se le añade un sufijo de la organización para no chocar con otros espacios.
  const slug = `${slugDe(datos.data.nombre)}_${organizacionId.replace(/-/g, "").slice(0, 6)}`;
  const { error } = await supabase.from("musculos").insert({
    ...datos.data,
    slug,
    organizacion_id: organizacionId,
    creado_por: usuarioId,
    orden: 1000,
  });
  if (error) {
    return nombreRepetido(error.code)
      ? { errores: { nombre: ["Ya existe un músculo con ese nombre"] }, valores: valoresDe(formData) }
      : { error: ERROR_GENERICO, valores: valoresDe(formData) };
  }

  refresh();
  return { ok: true };
}

export async function actualizarMusculo(
  musculoId: string,
  _: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const datos = leerMusculo(formData);
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };

  const { supabase } = await obtenerContexto();
  const { data, error } = await supabase
    .from("musculos")
    .update(datos.data)
    .eq("id", musculoId)
    .not("organizacion_id", "is", null)
    .select("id");
  if (error || !data?.length) {
    return nombreRepetido(error?.code)
      ? { errores: { nombre: ["Ya existe un músculo con ese nombre"] }, valores: valoresDe(formData) }
      : { error: ERROR_GENERICO, valores: valoresDe(formData) };
  }

  refresh();
  return { ok: true };
}

export async function eliminarMusculo(musculoId: string): Promise<{ error?: string }> {
  const { supabase } = await obtenerContexto();
  const { data, error } = await supabase
    .from("musculos")
    .delete()
    .eq("id", musculoId)
    .not("organizacion_id", "is", null)
    .select("id");
  if (error?.code === "23503") return { error: "Está en uso en algún ejercicio. Quítalo de esos ejercicios primero." };
  if (error || !data?.length) return { error: "No se pudo eliminar. Solo el propietario o un administrador puede hacerlo." };
  refresh();
  return {};
}
