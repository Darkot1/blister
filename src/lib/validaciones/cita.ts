import { z } from "zod";
import { DURACIONES_CITA, ESTADOS_CITA, type EstadoCita } from "./cita-constantes";

export { DURACIONES_CITA, ESTADOS_CITA, type EstadoCita };

export const esquemaCita = z.object({
  alumno_id: z.uuid("Elige un alumno"),
  tipo: z.enum(["entrenamiento", "evaluacion", "consulta", "otro"]).default("entrenamiento"),
  fecha: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha"),
  hora: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Indica la hora"),
  duracion: z.coerce
    .number()
    .refine((v) => (DURACIONES_CITA as readonly number[]).includes(v), "Duración no válida"),
  /** Día del plan que se entrena en la cita (crea la sesión prescrita). Vacío = solo la cita. */
  plan_dia_id: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((v) => v || null),
  notas: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});

/** Mover una cita: nueva fecha, hora y duración (el alumno y el tipo no cambian). */
export const esquemaReprogramacion = esquemaCita.pick({ fecha: true, hora: true, duracion: true });
