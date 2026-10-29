"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { obtenerContexto } from "@/lib/sesion";
import { aInstante } from "@/lib/calendario";
import { sincronizarCita } from "@/lib/google/calendario";
import { valoresDe, type EstadoFormulario } from "@/lib/validaciones/alumno";
import { ESTADOS_CITA, esquemaCita, esquemaReprogramacion, type EstadoCita } from "@/lib/validaciones/cita";

const ERROR_GENERICO = "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
const esId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

type Supabase = Awaited<ReturnType<typeof obtenerContexto>>["supabase"];

/**
 * ¿El día pertenece a un plan de este alumno? La base de datos ya rechaza mezclarlos
 * (FK compuesta de citas.sesion_id), pero así el entrenador recibe un mensaje claro.
 */
async function esDiaDelAlumno(supabase: Supabase, planDiaId: string, alumnoId: string) {
  const { data: dia } = await supabase.from("plan_dias").select("plan_id").eq("id", planDiaId).maybeSingle();
  if (!dia) return false;
  const { data: plan } = await supabase.from("planes").select("alumno_id").eq("id", dia.plan_id).maybeSingle();
  return plan?.alumno_id === alumnoId;
}

/** Las citas de otro entrenador se ven, pero no se cambian: su Google Calendar quedaría desfasado. */
const AJENA = "Esta cita es de otro entrenador: solo él puede cambiarla.";

const DIA_AJENO = "Ese día no es del plan de este alumno. Elige uno de su plan activo.";

/** La cita se guardó pero su sesión no: se avisa en vez de dejar el calendario y la sesión desfasados. */
const SESION_DESFASADA = "La cita se actualizó, pero su sesión no. Vuelve a intentarlo.";

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
    if (!(await esDiaDelAlumno(supabase, plan_dia_id, alumno_id))) return { error: DIA_AJENO, valores: valoresDe(formData) };
    sesionId = await crearSesion(supabase, plan_dia_id, inicio.toISOString());
    if (!sesionId) return { error: "No se pudo preparar la sesión de ese día del plan.", valores: valoresDe(formData) };
  }

  const { data: creada, error } = await supabase
    .from("citas")
    .insert({
      organizacion_id: organizacionId,
      entrenador_id: usuarioId,
      alumno_id,
      tipo,
      inicia_en: inicio.toISOString(),
      termina_en: fin.toISOString(),
      notas,
      sesion_id: sesionId,
    })
    .select("id")
    .single();

  if (error || !creada) {
    if (sesionId) await supabase.from("sesiones").delete().eq("id", sesionId);
    // 23P01: viola la restricción de exclusión citas_sin_cruce_entrenador.
    const mensaje = error?.code === "23P01" ? "Ya tienes otra cita que se cruza con ese horario." : ERROR_GENERICO;
    return { error: mensaje, valores: valoresDe(formData) };
  }

  // A Google Calendar, con invitación al alumno. Si falla, la cita ya quedó guardada y lo muestra el detalle.
  await sincronizarCita(supabase, usuarioId, creada.id, true);
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
  const { supabase, usuarioId } = await obtenerContexto();
  const { data: cita, error } = await supabase
    .from("citas")
    .update({ estado })
    .eq("id", citaId)
    .eq("entrenador_id", usuarioId)
    .select("sesion_id")
    .maybeSingle();
  if (!error && !cita) return { error: AJENA };
  if (error) {
    // 23P01: al deshacer una cancelación, el horario ya lo ocupa otra cita.
    return {
      error: error.code === "23P01" ? "Ese horario ya lo ocupa otra cita." : "No se pudo guardar el cambio. Inténtalo de nuevo.",
    };
  }
  if (cita?.sesion_id) {
    const { error: errorSesion } = await supabase
      .from("sesiones")
      .update({ estado: ESTADO_SESION[estado], completada_en: estado === "completada" ? new Date().toISOString() : null })
      .eq("id", cita.sesion_id);
    if (errorSesion) {
      refresh();
      return { error: SESION_DESFASADA };
    }
  }
  // Cancelar borra el evento y Google avisa al alumno; marcar asistencia no le manda nada.
  await sincronizarCita(supabase, usuarioId, citaId, estado === "cancelada");
  refresh();
  return {};
}

/** Elige qué día del plan se entrena en una cita ya agendada. */
export async function elegirDiaCita(citaId: string, planDiaId: string): Promise<{ error?: string }> {
  if (!esId(citaId) || !esId(planDiaId)) return { error: "Día no válido." };
  const { supabase, usuarioId } = await obtenerContexto();
  const { data: cita } = await supabase.from("citas").select("inicia_en, sesion_id, tipo, alumno_id, entrenador_id").eq("id", citaId).maybeSingle();
  if (!cita || cita.tipo !== "entrenamiento") return { error: "Esta cita no es de entrenamiento." };
  if (cita.entrenador_id !== usuarioId) return { error: AJENA };
  if (!(await esDiaDelAlumno(supabase, planDiaId, cita.alumno_id))) return { error: DIA_AJENO };
  // Si ya se empezó a registrar, cambiar el día borraría ese registro del plan: no se permite.
  if (cita.sesion_id) {
    const { data: anterior } = await supabase.from("sesiones").select("estado").eq("id", cita.sesion_id).maybeSingle();
    if (anterior && (anterior.estado === "en_curso" || anterior.estado === "completada")) {
      return { error: "Esta cita ya tiene una sesión registrada: no se le puede cambiar el día." };
    }
  }

  const sesionId = await crearSesion(supabase, planDiaId, cita.inicia_en);
  if (!sesionId) return { error: "No se pudo preparar la sesión de ese día del plan." };
  const { error } = await supabase.from("citas").update({ sesion_id: sesionId }).eq("id", citaId).eq("entrenador_id", usuarioId);
  if (error) {
    await supabase.from("sesiones").delete().eq("id", sesionId);
    return { error: ERROR_GENERICO };
  }
  // La sesión anterior (si la había) deja de contar como agendada.
  if (cita.sesion_id) {
    const { error: errorAnterior } = await supabase.from("sesiones").update({ estado: "cancelada" }).eq("id", cita.sesion_id);
    if (errorAnterior) {
      refresh();
      return { error: SESION_DESFASADA };
    }
  }
  await sincronizarCita(supabase, usuarioId, citaId, false); // El título del evento dice qué se entrena.
  refresh();
  return {};
}

/** Mueve una cita pendiente a otro horario; su sesión (si la tiene) la acompaña. */
export async function reprogramarCita(citaId: string, _: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  if (!esId(citaId)) return { error: "Cita no encontrada." };
  const datos = esquemaReprogramacion.safeParse(Object.fromEntries(formData));
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores: valoresDe(formData) };

  const inicio = new Date(aInstante(datos.data.fecha, datos.data.hora));
  const fin = new Date(inicio.getTime() + datos.data.duracion * 60_000);
  const { supabase, usuarioId } = await obtenerContexto();
  const { data: cita, error } = await supabase
    .from("citas")
    .update({ inicia_en: inicio.toISOString(), termina_en: fin.toISOString() })
    .eq("id", citaId)
    .eq("entrenador_id", usuarioId)
    .in("estado", ["programada", "confirmada"])
    .select("sesion_id")
    .maybeSingle();
  if (error) {
    const mensaje = error.code === "23P01" ? "Ya tienes otra cita que se cruza con ese horario." : ERROR_GENERICO;
    return { error: mensaje, valores: valoresDe(formData) };
  }
  if (!cita) return { error: "Solo puedes mover tus citas pendientes.", valores: valoresDe(formData) };
  if (cita.sesion_id) {
    const { error: errorSesion } = await supabase.from("sesiones").update({ programada_para: inicio.toISOString() }).eq("id", cita.sesion_id);
    if (errorSesion) {
      refresh();
      return { error: SESION_DESFASADA, valores: valoresDe(formData) };
    }
  }
  await sincronizarCita(supabase, usuarioId, citaId, true); // Google le avisa al alumno del nuevo horario.
  refresh();
  return { ok: true };
}

/** Reintenta pasar la cita a Google Calendar (tras un error). Si nunca llegó, el alumno recibe su invitación. */
export async function resincronizarCita(citaId: string): Promise<{ error?: string }> {
  if (!esId(citaId)) return { error: "Cita no encontrada." };
  const { supabase, usuarioId } = await obtenerContexto();
  const { data: cita } = await supabase.from("citas").select("google_evento_id, entrenador_id").eq("id", citaId).maybeSingle();
  if (!cita) return { error: "Cita no encontrada." };
  if (cita.entrenador_id !== usuarioId) return { error: AJENA };
  await sincronizarCita(supabase, usuarioId, citaId, !cita.google_evento_id);
  const { data: despues } = await supabase.from("citas").select("google_error").eq("id", citaId).maybeSingle();
  refresh();
  return despues?.google_error ? { error: despues.google_error } : {};
}
