/**
 * La junta de agentes: el líder reparte el caso (un alumno de la base de datos o uno escrito), cada
 * agente devuelve un hallazgo y una acción, y el líder propone una decisión que el entrenador aprueba.
 * Todo lo responde la IA (`consultarJunta`); aquí están los tipos y el guion que anima la oficina.
 */
export type Encargo = {
  agente: string;
  /** Dos o tres palabras: lo que se ve en los globos y en la pantalla de la sala. */
  titulo: string;
  /** Lo que el líder le pide. */
  tarea: string;
  /** Lo que el agente devuelve, en una o dos frases (lo que se lee en la junta). */
  hallazgo: string;
  /** Su respuesta completa, para quien quiera leerla entera. */
  detalle?: string;
  /** La acción concreta que propone. */
  accion: string;
};

/** Qué pidió el entrenador: decide quién es el agente principal y qué se entrega. */
export const ENTREGABLES = ["rutina", "cargas", "agenda", "mensaje", "diagnostico"] as const;
export type Entregable = (typeof ENTREGABLES)[number];

/** Un ejercicio de la rutina propuesta, ya enlazado a la biblioteca de ejercicios. */
export type EjercicioPropuesto = {
  ejercicioId: string;
  nombre: string;
  series: number | null;
  repeticiones: string | null;
  rir: number | null;
  descanso: number | null;
  notas: string | null;
};

/** La rutina que propone el agente de Rutinas: se convierte en un borrador del constructor. */
export type RutinaPropuesta = {
  nombre: string;
  descripcion: string;
  dias: { nombre: string; ejercicios: EjercicioPropuesto[] }[];
  /** Ejercicios que propuso pero no están en tu biblioteca (no entran en el borrador). */
  descartados: string[];
};

/** Un paso del plan del líder, ordenado en el tiempo. */
export type PasoPlan = { cuando: "hoy" | "semana" | "despues"; texto: string };

export type CasoJunta = {
  id: string;
  titulo: string;
  alumno: string;
  contexto: string;
  /** Lo que se pidió (rutina, cargas…): el líder lo respeta al repartir y al decidir. */
  entregable?: Entregable;
  encargos: Encargo[];
  decision: {
    titulo: string;
    resumen: string;
    /** El plan en orden: qué hacer hoy, esta semana y después. */
    pasos?: PasoPlan[];
    /** Lo que el líder necesita saber de ti (aparte de las acciones). */
    preguntas?: string[];
  };
  /** Si se pidió una rutina: la propuesta, lista para crear como borrador. */
  rutina?: RutinaPropuesta;
};

const CUANDO_TEXTO: Record<PasoPlan["cuando"], string> = { hoy: "Hoy", semana: "Esta semana", despues: "En 2–3 semanas" };

/**
 * La junta en texto plano: decisión, plan ordenado, preguntas y rutina. Es lo que se copia (para
 * enviarlo por WhatsApp, por ejemplo) y lo que se guarda como nota del alumno.
 */
export function textoDeJunta(caso: CasoJunta, fecha?: string): string {
  const d = caso.decision;
  const partes = [`Junta de agentes${fecha ? ` (${fecha})` : ""}: ${caso.contexto}`, "", `Decisión: ${d.titulo}. ${d.resumen}`];
  for (const cuando of ["hoy", "semana", "despues"] as const) {
    const pasos = (d.pasos ?? []).filter((p) => p.cuando === cuando);
    if (pasos.length) partes.push("", `${CUANDO_TEXTO[cuando]}:`, ...pasos.map((p) => `- ${p.texto}`));
  }
  if (d.preguntas?.length) partes.push("", "Por definir:", ...d.preguntas.map((q) => `- ${q}`));
  if (caso.rutina) {
    partes.push("", `Rutina propuesta: ${caso.rutina.nombre}`);
    for (const dia of caso.rutina.dias) {
      partes.push(
        `${dia.nombre}: ${dia.ejercicios
          .map((e) => `${e.nombre}${e.series && e.repeticiones ? ` ${e.series}×${e.repeticiones}` : ""}${e.rir !== null ? ` RIR ${e.rir}` : ""}`)
          .join("; ")}`,
      );
    }
  }
  return partes.join("\n");
}

/** Una junta en curso: el caso, su guion y quiénes se sientan (en orden de silla). */
export type Junta = {
  caso: CasoJunta;
  guion: Paso[];
  asistentes: string[];
  /** Respuestas de los agentes: llegando, ya en el caso, o fallidas. */
  consulta: "pendiente" | "lista" | "fallo";
  /** Por qué falló la consulta. */
  aviso?: string;
  /** Modelos que respondieron (con openrouter/free cambian entre juntas). */
  modelos?: string[];
  /** El alumno de la junta (si se eligió uno): para agendar o guardar la nota. */
  alumnoId?: string | null;
  /** La junta en el historial, una vez guardada. */
  juntaId?: string | null;
};

/** Una junta del historial, ya terminada. */
export type JuntaGuardada = { id: string; alumnoId: string | null; creadoEn: string; modelos: string[]; caso: CasoJunta };

/** Lo que lista el historial: lo justo para encontrarla. El caso completo se pide al abrirla (ver `leerJunta`). */
export type ResumenJunta = { id: string; alumnoId: string | null; creadoEn: string; titulo: string; alumno: string; contexto: string };

/** Pasos de la junta, en orden. La vista avanza uno a uno. */
export type Paso =
  | { tipo: "convoca" }
  | { tipo: "delega"; encargo: Encargo; presente: boolean }
  | { tipo: "trabajan" }
  | { tipo: "informa"; encargo: Encargo }
  | { tipo: "decide" };

/** Arma el guion con los agentes que están sentados en la oficina: lo que nadie cubre queda señalado. */
export function guionDe(caso: CasoJunta, presentes: Set<string>): Paso[] {
  const encargos = caso.encargos.map((encargo) => ({ encargo, presente: presentes.has(encargo.agente) }));
  const cubiertos = encargos.filter((e) => e.presente).map((e) => e.encargo);
  return [
    { tipo: "convoca" },
    ...encargos.map((e) => ({ tipo: "delega" as const, ...e })),
    ...(cubiertos.length ? [{ tipo: "trabajan" as const }] : []),
    ...cubiertos.map((encargo) => ({ tipo: "informa" as const, encargo })),
    { tipo: "decide" },
  ];
}

/** Cuánto dura cada paso en pantalla (ms). */
export const DURACION: Record<Paso["tipo"], number> = {
  // Da tiempo a que caminen a la sala: desde el escritorio más lejano hay unas 16 baldosas.
  convoca: 5200,
  delega: 1500,
  trabajan: 4200,
  informa: 1700,
  decide: 0,
};
