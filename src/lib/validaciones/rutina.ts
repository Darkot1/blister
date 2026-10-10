import { z } from "zod";
import { TIPOS_BLOQUE } from "@/lib/entrenamiento/prescripcion";
import { ETIQUETA_TIPO_OBJETIVO } from "@/lib/formato";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const entero = (min: number, max: number, nombre: string) =>
  z.number().int(`${nombre}: usa un número entero`).min(min, `${nombre}: mínimo ${min}`).max(max, `${nombre}: máximo ${max}`).nullable();

const decimal = (min: number, max: number, nombre: string) =>
  z.number().min(min, `${nombre}: mínimo ${min}`).max(max, `${nombre}: máximo ${max}`).nullable();

export const esquemaEjercicioRutina = z.object({
  ejercicio_id: z.uuid("Ejercicio no válido"),
  series: entero(1, 20, "Series"),
  repeticiones: texto(20),
  peso: decimal(0, 1000, "Peso"),
  unidad_peso: z.enum(["kg", "lb"]),
  descanso_segundos: entero(0, 900, "Descanso"),
  tempo: texto(12),
  rir: decimal(0, 10, "RIR"),
  rpe: decimal(0, 10, "RPE"),
  notas: texto(300),
});

export const esquemaBloqueRutina = z.object({
  nombre: z.string().trim().min(1, "Ponle nombre al bloque").max(60, "Máximo 60 caracteres"),
  tipo: z.enum(TIPOS_BLOQUE),
  rondas: entero(1, 20, "Rondas"),
  descanso_segundos: entero(0, 900, "Descanso"),
  notas: texto(300),
  ejercicios: z.array(esquemaEjercicioRutina).max(20, "Máximo 20 ejercicios por bloque"),
});

export const esquemaDiaRutina = z.object({
  nombre: z.string().trim().min(1, "Ponle nombre al día").max(60, "Máximo 60 caracteres"),
  bloques: z.array(esquemaBloqueRutina).max(12, "Máximo 12 bloques por día"),
});

export const esquemaRutina = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre de la rutina").max(120, "Máximo 120 caracteres"),
  descripcion: texto(1000),
  tipo_objetivo: z
    .string()
    .nullable()
    .refine((v) => v === null || v in ETIQUETA_TIPO_OBJETIVO, "Objetivo no válido"),
  dias: z.array(esquemaDiaRutina).min(1, "La rutina necesita al menos un día").max(7, "Máximo 7 días"),
});

export type RutinaEntrada = z.input<typeof esquemaRutina>;
export type Rutina = z.output<typeof esquemaRutina>;

export const esquemaAsignacion = z.object({
  alumno_id: z.uuid("Elige un alumno"),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de inicio"),
  activar: z.literal("on").optional(),
});
