const ZONA = "America/Bogota";

/** Node y los navegadores usan espacios Unicode distintos (U+202F, U+00A0) en fechas: se igualan para no romper la hidratación. */
export const espaciosSimples = (texto: string) => texto.replace(/[\u00a0\u202f]/g, " ");

/** "8 oct 2026" */
export function fechaCorta(valor: string | null | undefined) {
  if (!valor) return "—";
  // Las fechas sin hora (YYYY-MM-DD) se interpretan como calendario, no como UTC.
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  return espaciosSimples(
    new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: ZONA })
      .format(fecha)
      .replace(".", ""),
  );
}

/** "8 oct", sin el año (para listas de la semana en curso). */
export function fechaSinAnio(valor: string | null | undefined) {
  return fechaCorta(valor).replace(/( de)? \d{4}$/, "");
}

/** "8 oct, 3:45 p. m." */
export function fechaHora(valor: string) {
  return espaciosSimples(
    new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: ZONA,
    }).format(new Date(valor)),
  );
}

/** "3:45 p. m." */
export function hora(valor: string) {
  return espaciosSimples(
    new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: ZONA }).format(new Date(valor)),
  );
}

/** Fecha de hoy en Colombia ("AAAA-MM-DD"): el servidor corre en UTC y de noche ya sería mañana. */
const hoyEnColombia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });

export function edad(fechaNacimiento: string | null) {
  if (!fechaNacimiento) return null;
  const [anioN, mesN, diaN] = fechaNacimiento.slice(0, 10).split("-").map(Number);
  const [anioH, mesH, diaH] = hoyEnColombia.format(new Date()).split("-").map(Number);
  if (!anioN || !anioH) return null;
  const aunNoCumple = mesH < mesN || (mesH === mesN && diaH < diaN);
  return anioH - anioN - (aunNoCumple ? 1 : 0);
}

export function numero(valor: number | null | undefined, decimales = 1) {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: decimales }).format(valor);
}

export function iniciales(nombres: string, apellidos: string) {
  return `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase();
}

export const ETIQUETA_ESTADO_ALUMNO: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  archivado: "Archivado",
};

export const ETIQUETA_TIPO_OBJETIVO: Record<string, string> = {
  hipertrofia: "Hipertrofia",
  perdida_grasa: "Pérdida de grasa",
  fuerza: "Fuerza",
  resistencia: "Resistencia",
  movilidad: "Movilidad",
  tecnica: "Técnica",
  rehabilitacion: "Rehabilitación",
  salud_general: "Salud general",
};

export const ETIQUETA_TIPO_CITA: Record<string, string> = {
  entrenamiento: "Entrenamiento",
  evaluacion: "Evaluación",
  consulta: "Consulta",
  otro: "Otro",
};

export const ETIQUETA_ESTADO_CITA: Record<string, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
  reprogramada: "Reprogramada",
  no_asistio: "No asistió",
};
