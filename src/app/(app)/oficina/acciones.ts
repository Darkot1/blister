"use server";

import { AGENTES, agentePorId } from "@/lib/agentes/catalogo";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { consultarEncargo, deADos, decidir, disenarRutina, repartir, responder, type Respuesta } from "@/lib/agentes/consulta";
import { expedienteAlumno } from "@/lib/agentes/expediente";
import { textoDeJunta, type CasoJunta, type JuntaGuardada, type RutinaPropuesta } from "@/lib/agentes/juntas";
import { fechaCorta } from "@/lib/formato";
import { ErrorAgentes, agentesConfigurados, conPlazo } from "@/lib/agentes/openrouter";
import { obtenerContexto } from "@/lib/sesion";
import { guardarRutina } from "../entrenamiento/acciones";

/** Largo máximo de un caso escrito o una pregunta: suficiente para contarlo y acota el gasto. */
const MAX_TEXTO = 600;
/** Tope total de una junta o pregunta: por debajo del maxDuration de /oficina (300 s). */
const PLAZO_JUNTA_MS = 280_000;
/** Juntas por espacio en 24 h: la cuota de los modelos es una sola para todos los espacios. */
const MAX_JUNTAS_DIA = 15;
/** Sin texto, con un alumno elegido: revisión general de su situación. */
const REVISION_GENERAL = "Revisa su situación general y dime qué conviene ajustar.";

const esId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export type ResultadoJunta =
  | { ok: true; caso: CasoJunta; modelos: string[]; /** En el historial; null si no se pudo guardar. */ juntaId: string | null }
  | { ok: false; error: string };

const MENSAJES: Record<ErrorAgentes["motivo"], string> = {
  sin_clave: "Los agentes no están conectados: falta la clave de OpenRouter, Groq o Gemini en el servidor.",
  limite: "Se agotaron las consultas gratuitas de hoy (o del minuto). Vuelve a intentarlo más tarde.",
  saturado: "Los modelos gratuitos están saturados en este momento. Vuelve a convocar la junta en un minuto.",
  vacio: "Los modelos gratuitos no devolvieron respuesta esta vez. Vuelve a intentarlo.",
  clave: "OpenRouter rechazó la clave de los agentes. Revisa OPENROUTER_API_KEY.",
  proveedor: "El modelo gratuito no respondió bien esta vez. Vuelve a convocar la junta.",
  red: "No se pudo contactar con OpenRouter. Revisa la conexión.",
};

/** El mensaje para el entrenador; con la cuota agotada, cuándo vuelve a haber consultas. */
const mensajeDe = (error: ErrorAgentes) =>
  error.motivo === "limite" && error.reinicio
    ? `Se agotaron las 50 consultas gratuitas de hoy. Vuelven a las ${error.reinicio} (hora de Colombia).`
    : MENSAJES[error.motivo];

/**
 * Junta con agentes de verdad sobre un alumno de la base de datos, un caso escrito, o ambos. El líder
 * reparte entre los agentes presentes, cada uno responde (de dos en dos) y el líder propone una
 * decisión. Gasta 2 peticiones más una por agente que interviene. Solo con sesión iniciada: así nadie
 * de fuera gasta la cuota de OpenRouter.
 *
 * Con alumno, los agentes reciben su expediente sin nombre ni contacto (ver `expedienteAlumno`); el
 * nombre real solo vuelve a la app para mostrarlo.
 */
export async function consultarJunta(entrada: { alumnoId: string | null; situacion: string; presentes: string[] }): Promise<ResultadoJunta> {
  const { supabase, organizacionId } = await obtenerContexto();
  const texto = entrada.situacion.trim().slice(0, MAX_TEXTO);
  if (!entrada.alumnoId && texto.length < 10) return { ok: false, error: "Elige un alumno o cuenta el caso con un poco más de detalle." };
  if (entrada.alumnoId && !esId(entrada.alumnoId)) return { ok: false, error: "Alumno no encontrado." };
  if (!agentesConfigurados()) return { ok: false, error: MENSAJES.sin_clave };
  const equipo = AGENTES.filter((a) => entrada.presentes.includes(a.id));
  if (!equipo.length) return { ok: false, error: "Sienta al menos a un agente." };

  const { count: juntasHoy } = await supabase
    .from("juntas")
    .select("id", { count: "exact", head: true })
    .eq("organizacion_id", organizacionId)
    .gte("creado_en", new Date(Date.now() - 86_400_000).toISOString());
  if ((juntasHoy ?? 0) >= MAX_JUNTAS_DIA) {
    return { ok: false, error: `Tu espacio ya convocó ${MAX_JUNTAS_DIA} juntas en las últimas 24 horas. Vuelve a intentarlo más tarde.` };
  }

  // RLS: un alumno de otro espacio no se encuentra.
  const expediente = entrada.alumnoId ? await expedienteAlumno(supabase, entrada.alumnoId) : null;
  if (entrada.alumnoId && !expediente) return { ok: false, error: "Alumno no encontrado." };
  const situacion = texto || REVISION_GENERAL;
  // Lo que lee el modelo: anónimo y con los datos de la app.
  const contextoModelo = expediente ? `${situacion}\n\nExpediente del alumno (datos de la app):\n${expediente.texto}` : situacion;

  try {
    return await conPlazo(PLAZO_JUNTA_MS, async (): Promise<ResultadoJunta> => {
    const reparto = await repartir(situacion, contextoModelo, equipo);
    // Si se pidió una rutina, Rutinas elige entre los ejercicios de tu biblioteca (globales y propios).
    const armaRutina = reparto.entregable === "rutina" && reparto.encargos.some((e) => e.agente === "rutinas");
    const { data: catalogo } = armaRutina
      ? await supabase.from("ejercicios").select("id, nombre").eq("estado", "activo").order("nombre").limit(400)
      : { data: [] };
    const paraModelo: CasoJunta = {
      id: "junta",
      titulo: reparto.titulo,
      alumno: "el alumno",
      contexto: contextoModelo,
      entregable: reparto.entregable,
      encargos: reparto.encargos,
      decision: { titulo: "", resumen: "" },
    };
    const respuestas = await deADos(paraModelo.encargos, (encargo) =>
      armaRutina && encargo.agente === "rutinas" ? disenarRutina(paraModelo, encargo, catalogo ?? []) : consultarEncargo(paraModelo, encargo),
    );
    const rutina = respuestas.find((r): r is (typeof respuestas)[number] & { rutina: RutinaPropuesta } => "rutina" in r && Boolean(r.rutina))?.rutina;
    if (rutina) paraModelo.rutina = rutina;
    const encargos = paraModelo.encargos.map((e, i) => ({ ...e, hallazgo: respuestas[i].hallazgo, detalle: respuestas[i].detalle, accion: respuestas[i].accion }));
    const decision = await decidir(paraModelo, situacion, encargos.map((encargo, i) => ({ encargo, respuesta: respuestas[i] as Respuesta })));
    const modelos = [...new Set(respuestas.map((r) => r.modelo))];
    // Lo que ve el entrenador: el nombre real y solo la situación que escribió.
    const caso: CasoJunta = { ...paraModelo, alumno: expediente?.nombre ?? "Tu caso", contexto: situacion, encargos, decision };
    // Al historial. Si no se puede guardar, la junta igual se muestra.
    const { data: guardada } = await supabase
      .from("juntas")
      .insert({ organizacion_id: organizacionId, alumno_id: entrada.alumnoId, pedido: situacion, resultado: caso, modelos })
      .select("id")
      .maybeSingle();
    if (guardada) refresh();
    return { ok: true, modelos, caso, juntaId: guardada?.id ?? null };
    });
  } catch (error) {
    if (error instanceof ErrorAgentes) return { ok: false, error: mensajeDe(error) };
    return { ok: false, error: MENSAJES.proveedor };
  }
}

export type ResultadoPregunta = { ok: true; texto: string; modelo: string } | { ok: false; error: string };

/**
 * Pregunta directa a un agente desde su panel. Una petición. Con alumno, el agente recibe su
 * expediente sin nombre ni contacto (como en la junta) y responde con sus datos.
 */
export async function preguntarAgente(agenteId: string, pregunta: string, alumnoId: string | null = null): Promise<ResultadoPregunta> {
  const { supabase } = await obtenerContexto();
  const texto = pregunta.trim().slice(0, MAX_TEXTO);
  if (!texto) return { ok: false, error: "Escribe tu pregunta." };
  if (!agentePorId(agenteId)) return { ok: false, error: "Agente no encontrado." };
  if (alumnoId && !esId(alumnoId)) return { ok: false, error: "Alumno no encontrado." };
  if (!agentesConfigurados()) return { ok: false, error: MENSAJES.sin_clave };
  // RLS: un alumno de otro espacio no se encuentra.
  const expediente = alumnoId ? await expedienteAlumno(supabase, alumnoId) : null;
  if (alumnoId && !expediente) return { ok: false, error: "Alumno no encontrado." };
  try {
    return { ok: true, ...(await conPlazo(PLAZO_JUNTA_MS, () => responder(agenteId, texto, expediente?.texto ?? null))) };
  } catch (error) {
    if (error instanceof ErrorAgentes) return { ok: false, error: mensajeDe(error) };
    return { ok: false, error: MENSAJES.proveedor };
  }
}

/**
 * La rutina que propuso la junta, como borrador en el constructor (un bloque de fuerza por día). Pasa
 * por `guardarRutina`, con la misma validación que el constructor; no se asigna a nadie: el
 * entrenador la revisa, la ajusta y decide si la asigna.
 */
export async function crearBorradorRutina(propuesta: RutinaPropuesta, alumno: string): Promise<{ error: string }> {
  await obtenerContexto();
  const dias = (propuesta.dias ?? []).slice(0, 7).flatMap((d) => {
    const ejercicios = (d.ejercicios ?? []).filter((e) => esId(e.ejercicioId)).slice(0, 20);
    if (!ejercicios.length) return [];
    return [
      {
        nombre: String(d.nombre || "Día").slice(0, 60),
        bloques: [
          {
            nombre: "Principal",
            tipo: "fuerza" as const,
            rondas: null,
            descanso_segundos: null,
            notas: null,
            ejercicios: ejercicios.map((e) => ({
              ejercicio_id: e.ejercicioId,
              series: e.series,
              repeticiones: e.repeticiones ?? "",
              peso: null,
              unidad_peso: "kg" as const,
              descanso_segundos: e.descanso,
              tempo: "",
              rir: e.rir,
              rpe: null,
              notas: e.notas ?? "",
            })),
          },
        ],
      },
    ];
  });
  if (!dias.length) return { error: "La propuesta no tiene ejercicios de tu biblioteca." };
  const faltantes = (propuesta.faltantes ?? [])
    .slice(0, 12)
    .map((f) => [String(f.nombre).slice(0, 60), String(f.dia ?? "").slice(0, 40), String(f.prescripcion ?? "").slice(0, 30)].filter(Boolean).join(", "));

  const resultado = await guardarRutina(null, {
    nombre: `${String(propuesta.nombre || "Rutina propuesta").slice(0, 80)} · borrador`,
    descripcion: [
      `Propuesta de la oficina de agentes para ${String(alumno).slice(0, 80)}.`,
      String(propuesta.descripcion ?? "").slice(0, 600),
      // Lo que no estaba en la biblioteca: para añadirlo a mano cuando exista.
      faltantes.length ? `Falta añadir: ${faltantes.join("; ")}.` : "",
    ]
      .join(" ")
      .trim()
      .slice(0, 1000),
    tipo_objetivo: null,
    dias,
  });
  if (!resultado.ok) return { error: resultado.error };
  redirect(`/entrenamiento/rutinas/${resultado.id}`);
}

/** Guarda la junta (decisión, plan, preguntas y rutina) como nota del alumno, con su fecha. */
export async function guardarNotaJunta(juntaId: string): Promise<{ ok?: boolean; error?: string }> {
  if (!esId(juntaId)) return { error: "Junta no encontrada." };
  const { supabase, usuarioId } = await obtenerContexto();
  const { data: junta } = await supabase.from("juntas").select("alumno_id, resultado, creado_en").eq("id", juntaId).maybeSingle();
  if (!junta) return { error: "Junta no encontrada." };
  if (!junta.alumno_id) return { error: "Esta junta no es de un alumno: no hay dónde guardar la nota." };
  const contenido = textoDeJunta(junta.resultado as CasoJunta, fechaCorta(junta.creado_en)).slice(0, 5000);
  const { error } = await supabase.from("notas_alumno").insert({ alumno_id: junta.alumno_id, autor_id: usuarioId, contenido });
  if (error) return { error: "No se pudo guardar la nota. Inténtalo de nuevo." };
  refresh();
  return { ok: true };
}

/** Borra una junta del historial (no toca notas ni rutinas que se crearon a partir de ella). */
/** El caso completo de una junta del historial, al abrirla. */
export async function leerJunta(juntaId: string): Promise<{ junta: JuntaGuardada } | { error: string }> {
  if (!esId(juntaId)) return { error: "Junta no encontrada." };
  const { supabase } = await obtenerContexto();
  const { data } = await supabase.from("juntas").select("id, alumno_id, resultado, modelos, creado_en").eq("id", juntaId).maybeSingle();
  if (!data) return { error: "No se pudo abrir la junta. Inténtalo de nuevo." };
  return { junta: { id: data.id, alumnoId: data.alumno_id, creadoEn: data.creado_en, modelos: data.modelos, caso: data.resultado as CasoJunta } };
}

export async function borrarJunta(juntaId: string): Promise<{ error?: string }> {
  if (!esId(juntaId)) return { error: "Junta no encontrada." };
  const { supabase } = await obtenerContexto();
  const { data, error } = await supabase.from("juntas").delete().eq("id", juntaId).select("id");
  if (error || !data?.length) return { error: "No se pudo borrar la junta." };
  refresh();
  return {};
}
