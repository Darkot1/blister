import { CalendarCheck, ClipboardList, Crown, HeartPulse, Lightbulb, TrendingUp, Weight, type LucideIcon } from "lucide-react";

/** Cómo se ve el personaje en la oficina: tono de piel, pelo y un detalle propio. */
export type Apariencia = {
  piel: string;
  pelo: string;
  peinado: "corto" | "largo" | "cola" | "rapado" | "rizado" | "gorra" | "mono";
  accesorio?: "gafas" | "audifonos" | "silbato" | "cinta" | "corona";
  /** Espalda ancha (el de las cargas). */
  fornido?: boolean;
};

/**
 * Agentes de la oficina. En una junta, cada uno responde con IA (OpenRouter, ver
 * `lib/agentes/consulta.ts`) según su rol, habilidades y forma de trabajar. Como todo
 * en Blister, sugieren; el entrenador decide.
 */
export type Agente = {
  id: string;
  nombre: string;
  rol: string;
  descripcion: string;
  /** En qué es bueno: lo que el líder tiene en cuenta al repartir un caso. */
  habilidades: string[];
  /** Su forma de trabajar, en pocas palabras. */
  cualidad: string;
  /** Lo que podrá hacer cuando esté conectado. */
  tareas: string[];
  /** Ejemplos de lo que el entrenador le pediría. */
  ejemplos: string[];
  icono: LucideIcon;
  /** Tinte apagado de la camiseta (mismo criterio que el avatar: se lee igual en los dos temas). */
  tinte: string;
  apariencia: Apariencia;
};

/** El que reparte: no ocupa puesto, tiene su propia oficina y preside las juntas. */
export const LIDER: Agente = {
  id: "lider",
  nombre: "Líder",
  rol: "Reparte el caso y propone una decisión",
  descripcion:
    "Recibe el caso de un alumno, lo reparte entre los agentes según lo que sabe hacer cada uno, cruza lo que le devuelven y te propone una decisión.",
  habilidades: ["Repartir tareas", "Cruzar hallazgos", "Priorizar"],
  cualidad: "Decide con todo sobre la mesa",
  tareas: ["Convocar una junta por un alumno", "Repartir el caso entre el equipo", "Proponerte una decisión"],
  ejemplos: ["Laura lleva 9 días sin venir: ¿qué hacemos?", "Revisa a todos los que no llegaron a su meta"],
  icono: Crown,
  tinte: "#f0e6c8",
  apariencia: { piel: "#e8b98f", pelo: "#2b1d16", peinado: "mono", accesorio: "corona" },
};

export const AGENTES: Agente[] = [
  {
    id: "rutinas",
    nombre: "Rutinas",
    rol: "Arma rutinas y planes",
    descripcion: "Propone días, bloques y ejercicios según el objetivo, el nivel y el equipamiento del alumno.",
    habilidades: ["Selección de ejercicios", "Volumen por músculo", "Periodización"],
    cualidad: "Metódico",
    tareas: ["Proponer una rutina desde cero", "Repartir el volumen por músculo", "Sugerir sustitutos de un ejercicio"],
    ejemplos: ["Rutina de 3 días para hipertrofia con mancuernas", "Cambia el press banca por algo sin barra"],
    icono: ClipboardList,
    tinte: "#d9ddf5",
    apariencia: { piel: "#c68642", pelo: "#1d1d1f", peinado: "corto", accesorio: "gafas" },
  },
  {
    id: "cargas",
    nombre: "Cargas",
    rol: "Sugiere pesos y progresión",
    descripcion: "Lee las últimas sesiones y propone el peso de cada serie con el RIR y el 1RM estimado.",
    habilidades: ["1RM estimado", "RIR y RPE", "Descargas"],
    cualidad: "Preciso con los números",
    tareas: ["Calcular el peso de trabajo", "Proponer la progresión de la semana", "Avisar cuando conviene descargar"],
    ejemplos: ["¿Qué peso le pongo en sentadilla hoy?", "Progresión para las próximas 4 semanas"],
    icono: Weight,
    tinte: "#ece2da",
    apariencia: { piel: "#8d5524", pelo: "#151515", peinado: "rapado", accesorio: "cinta", fornido: true },
  },
  {
    id: "coach",
    nombre: "Coach",
    rol: "Recomendaciones por alumno",
    descripcion: "Resume cómo va cada alumno y te sugiere el siguiente paso: ajustar el plan, medir o hablar con él.",
    habilidades: ["Motivación", "Objetivos realistas", "Comunicación"],
    cualidad: "Cercano",
    tareas: ["Resumir la semana de un alumno", "Sugerir ajustes al plan", "Preparar la próxima cita"],
    ejemplos: ["¿Qué le ajusto a Laura esta semana?", "Prepárame la sesión de mañana"],
    icono: Lightbulb,
    tinte: "#d8e7e1",
    apariencia: { piel: "#f1c27d", pelo: "#7a4a26", peinado: "gorra", accesorio: "silbato" },
  },
  {
    id: "progreso",
    nombre: "Analista",
    rol: "Lee el progreso",
    descripcion: "Busca estancamientos y mejoras en peso, medidas y marcas, y te lo explica en dos líneas.",
    habilidades: ["Tendencias", "Medidas corporales", "Comparar periodos"],
    cualidad: "Curioso",
    tareas: ["Detectar estancamientos", "Comparar dos periodos", "Explicar una gráfica"],
    ejemplos: ["¿Quién lleva un mes sin mejorar?", "Compara su fuerza con la de marzo"],
    icono: TrendingUp,
    tinte: "#e4dcf0",
    apariencia: { piel: "#ffdbac", pelo: "#b5651d", peinado: "largo", accesorio: "gafas" },
  },
  {
    id: "movilidad",
    nombre: "Movilidad",
    rol: "Calentamiento y molestias",
    descripcion: "Propone calentamientos y alternativas cuando un alumno tiene una molestia o una condición.",
    habilidades: ["Molestias y lesiones", "Calentamiento", "Alternativas seguras"],
    cualidad: "Prudente",
    tareas: ["Armar el calentamiento", "Adaptar ejercicios a una molestia", "Sugerir trabajo de movilidad"],
    ejemplos: ["Calentamiento para día de pierna", "Le duele el hombro: ¿qué cambio?"],
    icono: HeartPulse,
    tinte: "#e3e3ea",
    apariencia: { piel: "#e0ac69", pelo: "#3b2418", peinado: "cola" },
  },
  {
    id: "agenda",
    nombre: "Agenda",
    rol: "Constancia y seguimiento",
    descripcion: "Vigila la asistencia y te avisa de quién lleva días sin entrenar o tiene una medición pendiente.",
    habilidades: ["Asistencia", "Horarios", "Recordatorios"],
    cualidad: "Constante",
    tareas: ["Detectar alumnos que faltan", "Recordar mediciones pendientes", "Proponer horarios"],
    ejemplos: ["¿Quién no ha venido esta semana?", "¿A quién le toca medirse?"],
    icono: CalendarCheck,
    tinte: "#dbe5ef",
    apariencia: { piel: "#a0663d", pelo: "#2a1a12", peinado: "rizado", accesorio: "audifonos" },
  },
];

export const agentePorId = (id: string) => (id === LIDER.id ? LIDER : AGENTES.find((a) => a.id === id));
