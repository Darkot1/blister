import { z } from "zod";

export const DURACIONES_CITA = [30, 45, 60, 75, 90, 120] as const;

export const ESTADOS_CITA = ["programada", "confirmada", "completada", "cancelada", "no_asistio"] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];

export const esquemaCita = z.object({
  alumno_id: z.uuid("Elige un alumno"),
  tipo: z.enum(["entrenamiento", "evaluacion", "consulta", "otro"]).default("entrenamiento"),
  fecha: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Indica la fecha"),
  hora: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Indica la hora"),
  duracion: z.coerce
    .number()
    .refine((v) => (DURACIONES_CITA as readonly number[]).includes(v), "Duración no válida"),
  notas: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});
