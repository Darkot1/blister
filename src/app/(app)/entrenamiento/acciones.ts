"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import { cargarPlantilla } from "@/lib/entrenamiento/cargar";
import { esPorRondas, letraBloque } from "@/lib/entrenamiento/prescripcion";
import { esquemaAsignacion, esquemaRutina, type Rutina, type RutinaEntrada } from "@/lib/validaciones/rutina";
import { valoresDe, type EstadoFormulario } from "@/lib/validaciones/alumno";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
const esId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export type ResultadoRutina = { ok: true; id: string } | { ok: false; error: string };

/** "Día 2 · B3: Series: máximo 20", para ubicar el error en una rutina larga. */
function ubicarError(error: z.ZodError) {
  const problema = error.issues[0];
  const [, dia, , bloque, , ejercicio] = problema.path as (string | number)[];
  const partes: string[] = [];
  if (typeof dia === "number") partes.push(`Día ${dia + 1}`);
  if (typeof bloque === "number") partes.push(typeof ejercicio === "number" ? `${letraBloque(bloque)}${ejercicio + 1}` : `Bloque ${letraBloque(bloque)}`);
  return partes.length ? `${partes.join(" · ")}: ${problema.message}` : problema.message;
}

/** En superseries y circuitos la serie es la ronda: cada ejercicio hereda las rondas del bloque. */
function normalizar(rutina: Rutina) {
  return rutina.dias.map((dia) => ({
    ...dia,
    bloques: dia.bloques.map((bloque) =>
      esPorRondas(bloque.tipo)
        ? { ...bloque, ejercicios: bloque.ejercicios.map((e) => ({ ...e, series: bloque.rondas, descanso_segundos: null })) }
        : { ...bloque, rondas: null },
    ),
  }));
}

/** Crea (id = null) o reemplaza el contenido de una rutina, todo en una transacción. */
export async function guardarRutina(id: string | null, entrada: RutinaEntrada): Promise<ResultadoRutina> {
  if (id !== null && !esId(id)) return { ok: false, error: "Rutina no encontrada." };
  const datos = esquemaRutina.safeParse(entrada);
  if (!datos.success) return { ok: false, error: ubicarError(datos.error) };

  const { supabase, organizacionId } = await obtenerContexto();
  const { data, error } = await supabase.rpc("guardar_plantilla", {
    p_plantilla_id: id,
    p_organizacion_id: organizacionId,
    p_nombre: datos.data.nombre,
    p_descripcion: datos.data.descripcion,
    p_tipo_objetivo: datos.data.tipo_objetivo,
    p_dias: normalizar(datos.data),
  });
  if (error) {
    console.error("guardar_plantilla", error.code, error.message);
    if (error.code === "P0002") return { ok: false, error: "Esta rutina ya no existe." };
    if (error.code === "42501") return { ok: false, error: "Alguno de los ejercicios ya no está disponible. Quítalo y vuelve a guardar." };
    return { ok: false, error: ERROR_GENERICO };
  }
  refresh();
  return { ok: true, id: data };
}

export async function cambiarEstadoRutina(id: string, estado: "activo" | "archivado") {
  if (!esId(id)) return;
  const { supabase } = await obtenerContexto();
  await supabase.from("plantillas").update({ estado }).eq("id", id);
  if (estado === "archivado") redirect("/entrenamiento");
  refresh();
}

/** Copia la rutina con " (copia)" y abre la copia en el constructor. */
export async function duplicarRutina(id: string) {
  if (!esId(id)) return;
  const { supabase, organizacionId } = await obtenerContexto();
  const original = await cargarPlantilla(supabase, id);
  if (!original) return;
  const { data, error } = await supabase.rpc("guardar_plantilla", {
    p_plantilla_id: null,
    p_organizacion_id: organizacionId,
    p_nombre: `${original.nombre} (copia)`.slice(0, 120),
    p_descripcion: original.descripcion,
    p_tipo_objetivo: original.tipo_objetivo,
    p_dias: original.dias.map((d) => ({
      nombre: d.nombre,
      descripcion: d.descripcion,
      bloques: d.bloques.map((b) => ({
        nombre: b.nombre,
        tipo: b.tipo,
        rondas: b.rondas,
        descanso_segundos: b.descanso_segundos,
        notas: b.notas,
        ejercicios: b.ejercicios.map((e) => ({
          ejercicio_id: e.ejercicio_id,
          series: e.series,
          repeticiones: e.repeticiones,
          peso: e.peso,
          unidad_peso: e.unidad_peso,
          descanso_segundos: e.descanso_segundos,
          tempo: e.tempo,
          rir: e.rir,
          rpe: e.rpe,
          notas: e.notas,
        })),
      })),
    })),
  });
  if (error) throw new Error("No se pudo duplicar la rutina.");
  redirect(`/entrenamiento/rutinas/${data}`);
}

/** Asigna la rutina a un alumno: crea su plan (copia independiente) y, si se pide, lo deja activo. */
export async function asignarRutina(plantillaId: string, _: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  return asignar(plantillaId, formData, "plan");
}

/** Desde el perfil del alumno: la rutina se elige en el formulario y se vuelve al perfil. */
export async function asignarRutinaAlumno(alumnoId: string, _: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  formData.set("alumno_id", alumnoId);
  return asignar(String(formData.get("plantilla_id") ?? ""), formData, "alumno");
}

async function asignar(plantillaId: string, formData: FormData, volverA: "plan" | "alumno"): Promise<EstadoFormulario> {
  const valores = valoresDe(formData);
  if (!esId(plantillaId)) return { errores: { plantilla_id: ["Elige una rutina"] }, valores };
  const datos = esquemaAsignacion.safeParse(valores);
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores };

  const { supabase } = await obtenerContexto();
  const { data: planId, error } = await supabase.rpc("asignar_plantilla", {
    p_plantilla_id: plantillaId,
    p_alumno_id: datos.data.alumno_id,
    p_fecha_inicio: datos.data.fecha_inicio,
  });
  if (error || !planId) return { error: "No se pudo asignar la rutina. Inténtalo de nuevo.", valores };

  const errorActivar = datos.data.activar ? (await supabase.rpc("activar_plan", { p_plan_id: planId })).error : null;
  if (volverA === "alumno") {
    refresh();
    return errorActivar ? { error: "El plan se creó, pero no se pudo activar. Actívalo desde el plan." } : { ok: true };
  }
  redirect(`/entrenamiento/planes/${planId}${errorActivar ? "?aviso=sin-activar" : ""}`);
}

export async function cambiarEstadoPlan(id: string, estado: "activo" | "completado" | "archivado") {
  if (!esId(id)) return;
  const { supabase } = await obtenerContexto();
  if (estado === "activo") await supabase.rpc("activar_plan", { p_plan_id: id });
  else await supabase.from("planes").update({ estado }).eq("id", id);
  refresh();
}
