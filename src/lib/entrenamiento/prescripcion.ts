// Prescripción de rutinas: tipos de bloque, valores por defecto y cálculos del resumen.
// Todo determinista y sin IA: sugiere, el entrenador decide y cambia lo que quiera.

export const TIPOS_BLOQUE = [
  "calentamiento",
  "fuerza",
  "superserie",
  "circuito",
  "movilidad",
  "cardio",
  "enfriamiento",
  "libre",
] as const;

export type TipoBloque = (typeof TIPOS_BLOQUE)[number];

export const ETIQUETA_BLOQUE: Record<TipoBloque, string> = {
  calentamiento: "Calentamiento",
  fuerza: "Fuerza",
  superserie: "Superserie",
  circuito: "Circuito",
  movilidad: "Movilidad",
  cardio: "Cardio",
  enfriamiento: "Enfriamiento",
  libre: "Libre",
};

export const AYUDA_BLOQUE: Record<TipoBloque, string> = {
  calentamiento: "Prepara articulaciones y músculos antes del trabajo principal.",
  fuerza: "Series rectas: termina todas las series de un ejercicio antes del siguiente.",
  superserie: "Los ejercicios se hacen seguidos, sin descanso, y se descansa al final de cada ronda.",
  circuito: "Una ronda pasa por todos los ejercicios; se repite el número de rondas.",
  movilidad: "Rango de movimiento y control.",
  cardio: "Trabajo cardiovascular por tiempo o distancia.",
  enfriamiento: "Vuelta a la calma y estiramientos.",
  libre: "Bloque sin reglas: cada ejercicio con su propia prescripción.",
};

/** En estos bloques la serie es la ronda: series y descanso se fijan en el bloque, no en cada ejercicio. */
export const esPorRondas = (tipo: string) => tipo === "superserie" || tipo === "circuito";

export type Prescripcion = {
  series: number | null;
  repeticiones: string | null;
  descanso_segundos: number | null;
  rir: number | null;
};

/** Valores de partida por objetivo para ejercicios de fuerza. */
const POR_OBJETIVO: Record<string, Prescripcion> = {
  hipertrofia: { series: 3, repeticiones: "8-12", descanso_segundos: 90, rir: 2 },
  fuerza: { series: 4, repeticiones: "4-6", descanso_segundos: 180, rir: 2 },
  resistencia: { series: 3, repeticiones: "15-20", descanso_segundos: 45, rir: 3 },
  perdida_grasa: { series: 3, repeticiones: "12-15", descanso_segundos: 60, rir: 2 },
  tecnica: { series: 3, repeticiones: "6-8", descanso_segundos: 90, rir: 4 },
  rehabilitacion: { series: 2, repeticiones: "12-15", descanso_segundos: 60, rir: 4 },
};
const GENERAL: Prescripcion = { series: 3, repeticiones: "10-12", descanso_segundos: 75, rir: 3 };

/** Ejercicios que no se prescriben con repeticiones al fallo. */
const POR_TIPO_EJERCICIO: Record<string, Prescripcion> = {
  cardio: { series: 1, repeticiones: "10 min", descanso_segundos: null, rir: null },
  estiramiento: { series: 2, repeticiones: "30 s", descanso_segundos: 15, rir: null },
  movilidad: { series: 2, repeticiones: "10", descanso_segundos: 30, rir: null },
  activacion: { series: 2, repeticiones: "12", descanso_segundos: 30, rir: null },
  calentamiento: { series: 1, repeticiones: "5 min", descanso_segundos: null, rir: null },
  enfriamiento: { series: 1, repeticiones: "5 min", descanso_segundos: null, rir: null },
};

export function prescripcionInicial(tipoEjercicio: string, objetivo: string | null): Prescripcion {
  return POR_TIPO_EJERCICIO[tipoEjercicio] ?? POR_OBJETIVO[objetivo ?? ""] ?? GENERAL;
}

/** Bloque sugerido para un ejercicio cuando el día aún no tiene bloques. */
export function bloqueParaEjercicio(tipoEjercicio: string): TipoBloque {
  if (tipoEjercicio === "calentamiento" || tipoEjercicio === "activacion") return "calentamiento";
  if (tipoEjercicio === "estiramiento" || tipoEjercicio === "enfriamiento") return "enfriamiento";
  if (tipoEjercicio === "movilidad") return "movilidad";
  if (tipoEjercicio === "cardio") return "cardio";
  return "fuerza";
}

/** Letra del bloque (A, B, C…) para nombrar ejercicios como A1, A2, B1. */
export const letraBloque = (indice: number) =>
  indice < 26 ? String.fromCharCode(65 + indice) : `${String.fromCharCode(65 + Math.floor(indice / 26) - 1)}${String.fromCharCode(65 + (indice % 26))}`;

/**
 * Segundos que dura una repetición o serie prescrita, para estimar la duración de la sesión.
 * "30 s" → 30, "5 min" → 300, "8-12" → 10 reps × 3 s, "AMRAP" → 40 s.
 */
function segundosDeTrabajo(repeticiones: string | null) {
  const texto = (repeticiones ?? "").toLowerCase().replace(",", ".");
  const tiempo = texto.match(/(\d+(?:\.\d+)?)\s*(min|m\b|s\b|seg)/);
  if (tiempo) return Number(tiempo[1]) * (tiempo[2].startsWith("m") ? 60 : 1);
  const numeros = texto.match(/\d+/g)?.map(Number) ?? [];
  if (!numeros.length) return 40;
  const reps = numeros.length === 2 && texto.includes("-") ? (numeros[0] + numeros[1]) / 2 : numeros[0];
  return reps * 3;
}

type EjercicioResumen = { series: number | null; repeticiones: string | null; descanso_segundos: number | null };
type BloqueResumen = { tipo: string; rondas: number | null; descanso_segundos: number | null; ejercicios: EjercicioResumen[] };

/** Series efectivas de un ejercicio: en superseries y circuitos, las rondas del bloque. */
export const seriesDe = (bloque: { tipo: string; rondas: number | null }, ejercicio: { series: number | null }) =>
  (esPorRondas(bloque.tipo) ? bloque.rondas : ejercicio.series) ?? 1;

/** Minutos estimados del día: trabajo + descansos + 30 s de transición por ejercicio. */
export function minutosEstimados(bloques: BloqueResumen[]) {
  let segundos = 0;
  for (const b of bloques) {
    if (esPorRondas(b.tipo)) {
      const rondas = b.rondas ?? 1;
      const vuelta = b.ejercicios.reduce((t, e) => t + segundosDeTrabajo(e.repeticiones) + 15, 0);
      segundos += rondas * vuelta + Math.max(0, rondas - 1) * (b.descanso_segundos ?? 0);
    } else {
      for (const e of b.ejercicios) {
        const series = e.series ?? 1;
        segundos += series * segundosDeTrabajo(e.repeticiones) + Math.max(0, series - 1) * (e.descanso_segundos ?? 0);
      }
    }
    segundos += b.ejercicios.length * 30;
  }
  return Math.round(segundos / 60);
}

/** Duración estimada de cada bloque por separado (para la línea de tiempo del día). */
export function minutosPorBloque(bloques: BloqueResumen[]) {
  return bloques.map((b) => minutosEstimados([b]));
}

// ---------- Ayudas para empezar ----------

const PECHO = ["pectoral_esternal", "pectoral_clavicular"];
const HOMBRO = ["deltoides_anterior", "deltoides_lateral", "deltoides_posterior"];
const ESPALDA = ["dorsal_ancho", "romboides", "trapecio_medio_inferior", "redondo_mayor"];
const PIERNA = ["cuadriceps", "isquiotibiales", "gluteo_mayor", "aductores", "gastrocnemio"];
const CORE = ["recto_abdominal", "oblicuos"];

/** Palabras del nombre de un día → músculos que suele trabajar. Primera coincidencia gana. */
const ENFOQUES: [RegExp, string[]][] = [
  [/empuj|push/, [...PECHO, "deltoides_anterior", "deltoides_lateral", "triceps_braquial"]],
  [/tir[oó]n|jal[oó]n|pull/, [...ESPALDA, "deltoides_posterior", "biceps_braquial"]],
  [/torso|superior|upper/, [...PECHO, ...ESPALDA, ...HOMBRO]],
  [/pierna|inferior|lower|leg/, PIERNA],
  [/full|completo|cuerpo/, ["cuadriceps", "gluteo_mayor", "pectoral_esternal", "dorsal_ancho", "deltoides_lateral"]],
  [/pecho/, PECHO],
  [/espalda/, ESPALDA],
  [/hombro/, HOMBRO],
  [/brazo|b[ií]ceps|tr[ií]ceps/, ["biceps_braquial", "triceps_braquial", "braquial"]],
  [/gl[uú]teo/, ["gluteo_mayor", "gluteo_medio"]],
  [/core|abdom/, CORE],
];

export function musculosSugeridos(nombreDia: string) {
  const texto = nombreDia.toLowerCase();
  return ENFOQUES.find(([patron]) => patron.test(texto))?.[1] ?? [];
}

/** Nombres de día que el entrenador elige con un toque. */
export const NOMBRES_DIA = ["Empuje", "Tirón", "Pierna", "Torso", "Full body", "Core"];

/** Estructuras de semana para no empezar en blanco. `semana`: días (0 = lunes) en que se entrena. */
export const ESTRUCTURAS = [
  { clave: "full", titulo: "Full body", detalle: "3 días · cuerpo completo", dias: ["Full body A", "Full body B", "Full body C"], semana: [0, 2, 4] },
  { clave: "torso-pierna", titulo: "Torso / Pierna", detalle: "4 días", dias: ["Torso A", "Pierna A", "Torso B", "Pierna B"], semana: [0, 1, 3, 4] },
  { clave: "ppl", titulo: "Empuje / Tirón / Pierna", detalle: "3 días", dias: ["Empuje", "Tirón", "Pierna"], semana: [0, 2, 4] },
  { clave: "libre", titulo: "Desde cero", detalle: "Un día y lo armas a tu gusto", dias: ["Día 1"], semana: [0] },
] as const;
