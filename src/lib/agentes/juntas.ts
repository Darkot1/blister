/**
 * Casos de ejemplo para la junta de agentes. Mientras los agentes no estén conectados
 * a Claude, la junta es una simulación con guion: el líder reparte, cada agente
 * devuelve un hallazgo y el líder propone una decisión que el entrenador aprueba.
 */
export type Encargo = {
  agente: string;
  /** Dos o tres palabras: lo que se ve en los globos y en la pantalla de la sala. */
  titulo: string;
  /** Lo que el líder le pide. */
  tarea: string;
  /** Lo que el agente devuelve. */
  hallazgo: string;
  /** Lo que el líder propone a partir de ese hallazgo. */
  accion: string;
};

export type CasoJunta = {
  id: string;
  titulo: string;
  alumno: string;
  contexto: string;
  encargos: Encargo[];
  decision: { titulo: string; resumen: string };
};

export const CASOS: CasoJunta[] = [
  {
    id: "inactivo",
    titulo: "Lleva días sin entrenar",
    alumno: "Laura (ejemplo)",
    contexto: "9 días sin venir y 2 citas canceladas seguidas.",
    encargos: [
      {
        agente: "agenda",
        titulo: "Asistencia",
        tarea: "Revisa su asistencia y sus citas del último mes.",
        hallazgo: "Faltó a 4 de las últimas 6 citas, y todas eran a las 6:00 a. m.",
        accion: "Mover sus citas a la tarde: lunes y jueves a las 6:00 p. m.",
      },
      {
        agente: "coach",
        titulo: "Notas y objetivo",
        tarea: "Revisa sus notas y su objetivo.",
        hallazgo: "En su última nota contó que sale muy cansada del trabajo. Su objetivo sigue siendo bajar de peso.",
        accion: "Escribirle hoy un mensaje corto, sin reproches, proponiendo el nuevo horario.",
      },
      {
        agente: "rutinas",
        titulo: "Duración",
        tarea: "Mira si la rutina encaja con el tiempo que tiene.",
        hallazgo: "Sus sesiones duran 75 minutos; con su horario, 45 minutos es más realista.",
        accion: "Recortar la rutina a 3 días de 45 minutos.",
      },
      {
        agente: "cargas",
        titulo: "Cargas de regreso",
        tarea: "Dime con qué cargas debería volver.",
        hallazgo: "Después de 9 días sin entrenar conviene bajar cerca de un 10 % las cargas la primera semana.",
        accion: "Primera semana al 90 % de sus cargas anteriores.",
      },
    ],
    decision: {
      titulo: "Recuperar la constancia antes que la carga",
      resumen: "El problema es el horario, no las ganas. Primero que vuelva a venir; luego subimos.",
    },
  },
  {
    id: "meta",
    titulo: "No alcanzó su meta",
    alumno: "Andrés (ejemplo)",
    contexto: "Meta: bajar 5 kg en 12 semanas. Bajó 1,8 kg.",
    encargos: [
      {
        agente: "progreso",
        titulo: "Peso y medidas",
        tarea: "Compara su peso y sus medidas con lo que planeamos.",
        hallazgo: "Bajó 1,8 kg pero 4 cm de cintura: pierde grasa más lento de lo previsto, no está estancado.",
        accion: "Medir el avance por cintura y % de grasa, no solo por peso.",
      },
      {
        agente: "cargas",
        titulo: "Fuerza",
        tarea: "Revisa cómo va su fuerza.",
        hallazgo: "Su 1RM estimado en sentadilla subió un 12 %: está ganando músculo.",
        accion: "Mantener la progresión de cargas actual.",
      },
      {
        agente: "agenda",
        titulo: "Asistencia",
        tarea: "Revisa su asistencia.",
        hallazgo: "Vino al 70 % de las sesiones; bajó entre la semana 6 y la 8.",
        accion: "Agendar una revisión corta cada 2 semanas.",
      },
      {
        agente: "coach",
        titulo: "La conversación",
        tarea: "Prepara la conversación con él.",
        hallazgo: "La meta era muy exigente para su punto de partida y se está desanimando.",
        accion: "Acordar con él una meta nueva: 3 kg en 8 semanas.",
      },
    ],
    decision: {
      titulo: "Ajustar la meta, no el plan",
      resumen: "El plan está funcionando: gana fuerza y pierde cintura. La meta era la que no encajaba.",
    },
  },
  {
    id: "rutina",
    titulo: "Su rutina no era óptima",
    alumno: "Camila (ejemplo)",
    contexto: "5 semanas estancada en press banca y molestia en el hombro derecho.",
    encargos: [
      {
        agente: "rutinas",
        titulo: "Reparto de volumen",
        tarea: "Revisa cómo está repartido el volumen.",
        hallazgo: "Hace 22 series semanales de pecho y solo 6 de espalda: el reparto está descompensado.",
        accion: "Equilibrar a 14 series de pecho y 14 de espalda.",
      },
      {
        agente: "movilidad",
        titulo: "Hombro",
        tarea: "Revisa la molestia del hombro.",
        hallazgo: "La molestia aparece en el press con barra; con mancuernas y agarre neutro no.",
        accion: "Cambiar el press con barra por press con mancuernas y agarre neutro.",
      },
      {
        agente: "cargas",
        titulo: "RIR y cargas",
        tarea: "Revisa sus cargas y su RIR.",
        hallazgo: "Lleva 5 semanas llegando al fallo (RIR 0) en press: no se está recuperando.",
        accion: "Una semana de descarga y volver con RIR 2.",
      },
      {
        agente: "progreso",
        titulo: "Tendencia de marcas",
        tarea: "Mira la tendencia del resto de sus marcas.",
        hallazgo: "Sus demás ejercicios siguen subiendo: el estancamiento es solo en los empujes.",
        accion: "Volver a revisar el press en 4 semanas.",
      },
    ],
    decision: {
      titulo: "Rehacer el bloque de empuje",
      resumen: "No es falta de esfuerzo: sobra pecho, falta espalda y el hombro avisa. Cambiamos el bloque, no todo el plan.",
    },
  },
];

/** Una junta en curso: el caso, su guion y quiénes se sientan (en orden de silla). */
export type Junta = { caso: CasoJunta; guion: Paso[]; asistentes: string[] };

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
