/**
 * Datos públicos del sitio: origen para SEO y datos del responsable para los textos legales.
 *
 * PENDIENTE antes de publicar: completa RESPONSABLE con los datos reales (razón social o nombre,
 * NIT o cédula, domicilio y correo de privacidad). Los textos legales los leen de aquí.
 */

/** Origen público (sin "/" final). APP_URL en producción; en Vercel, su dominio de producción. */
export const URL_SITIO = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const NOMBRE_SITIO = "Blister Fitness";
export const DESCRIPCION_SITIO =
  "Agenda, fichas de alumnos, rutinas por músculo, registro de sesiones y progreso para entrenadores personales. Con tus citas en Google Calendar.";

/** Responsable del tratamiento de los datos de las cuentas (Ley 1581 de 2012). */
export const RESPONSABLE = {
  nombre: "[RAZÓN SOCIAL O NOMBRE COMPLETO]",
  identificacion: "[NIT O CÉDULA]",
  domicilio: "[DIRECCIÓN], [CIUDAD], Colombia",
  correo: "[correo de privacidad, p. ej. privacidad@tudominio.com]",
} as const;

/** Fecha desde la que rigen los textos legales. Cámbiala cada vez que los modifiques. */
export const VIGENCIA_LEGAL = "28 de octubre de 2026";
