// Sin zod: los usa también el calendario en el navegador (ver cita.ts para la validación).
export const DURACIONES_CITA = [30, 45, 60, 75, 90, 120] as const;

export const ESTADOS_CITA = ["programada", "confirmada", "completada", "cancelada", "no_asistio"] as const;
export type EstadoCita = (typeof ESTADOS_CITA)[number];
