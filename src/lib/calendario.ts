// Aritmética de calendario en la zona del entrenador (America/Bogota).
// Bogotá no tiene horario de verano: el desfase es siempre -05:00, así que basta
// con sumar/restar 5 horas en lugar de depender de la zona del servidor o del navegador.

import { espaciosSimples } from "./formato";

const DESFASE = "-05:00";
const DESFASE_MS = 5 * 60 * 60 * 1000;

export const HORA_INICIO_DIA = 6; // 6:00
export const HORA_FIN_DIA = 22; // 22:00

const esFecha = (valor: unknown): valor is string => typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);

/** Fecha de hoy en Bogotá, "YYYY-MM-DD". */
export function hoyLocal() {
  return partesLocales(new Date().toISOString()).fecha;
}

/** Normaliza un parámetro de URL a una fecha válida; si no lo es, hoy. */
export function fechaOHoy(valor: unknown) {
  return esFecha(valor) && !Number.isNaN(Date.parse(valor)) ? valor : hoyLocal();
}

export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana que contiene `fecha`. */
export function inicioSemana(fecha: string) {
  const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((diaSemana + 6) % 7));
}

export function diasDeSemana(lunes: string) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** "2026-10-08" + "07:30" → instante ISO con el desfase de Bogotá. */
export function aInstante(fecha: string, hora: string) {
  return `${fecha}T${hora}:00${DESFASE}`;
}

/** Fecha y minuto del día (0–1439) de un instante, vistos desde Bogotá. */
export function partesLocales(instante: string) {
  const local = new Date(new Date(instante).getTime() - DESFASE_MS);
  return {
    fecha: local.toISOString().slice(0, 10),
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

const formatoDia = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", timeZone: "UTC" });
const formatoDiaLargo = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const formatoMes = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const enUTC = (fecha: string) => new Date(`${fecha}T12:00:00Z`);
const formatear = (formato: Intl.DateTimeFormat, fecha: string) => espaciosSimples(formato.format(enUTC(fecha)));

/** "lun 6" */
export function etiquetaDia(fecha: string) {
  return formatear(formatoDia, fecha).replace(".", "").replace(",", "");
}

/** "lunes, 6 de octubre" */
export function etiquetaDiaLarga(fecha: string) {
  const texto = formatear(formatoDiaLargo, fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "6 – 12 oct 2026" (o "28 sept – 4 oct 2026" si cruza de mes). */
export function etiquetaSemana(lunes: string) {
  const domingo = sumarDias(lunes, 6);
  const fin = formatear(formatoMes, domingo).replace(".", "");
  const mismoMes = lunes.slice(0, 7) === domingo.slice(0, 7);
  const inicio = mismoMes
    ? String(Number(lunes.slice(8)))
    : formatear(formatoMes, lunes).replace(".", "").replace(/ \d{4}$/, "");
  return `${inicio} – ${fin}`;
}
