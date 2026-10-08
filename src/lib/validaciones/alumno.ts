import { z } from "zod";

const textoOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const fechaOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha no válida");

export const esquemaAlumno = z.object({
  nombres: z.string().trim().min(1, "Escribe el nombre"),
  apellidos: z.string().trim().min(1, "Escribe el apellido"),
  correo: textoOpcional.refine((v) => v === null || z.email().safeParse(v).success, "Correo no válido"),
  telefono: textoOpcional,
  fecha_nacimiento: fechaOpcional,
  fecha_inicio: fechaOpcional,
  estado: z.enum(["activo", "inactivo", "archivado"]).default("activo"),
});

const medidaOpcional = (max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(",", "."))))
    .nullable()
    .refine((v) => v === null || (Number.isFinite(v) && v > 0 && v <= max), "Valor no válido");

export const esquemaMedicion = z
  .object({
    medido_en: z.string().trim().min(1, "Indica la fecha"),
    peso_kg: medidaOpcional(400),
    estatura_cm: medidaOpcional(260),
    grasa_corporal_pct: medidaOpcional(100),
    cintura_cm: medidaOpcional(300),
    cadera_cm: medidaOpcional(300),
    pecho_cm: medidaOpcional(300),
    brazo_izq_cm: medidaOpcional(100),
    brazo_der_cm: medidaOpcional(100),
    muslo_izq_cm: medidaOpcional(150),
    muslo_der_cm: medidaOpcional(150),
    notas: textoOpcional,
  })
  .refine(
    (m) =>
      [m.peso_kg, m.estatura_cm, m.grasa_corporal_pct, m.cintura_cm, m.cadera_cm, m.pecho_cm,
        m.brazo_izq_cm, m.brazo_der_cm, m.muslo_izq_cm, m.muslo_der_cm].some((v) => v !== null),
    { message: "Registra al menos una medida", path: ["peso_kg"] },
  );

export type EstadoFormulario = {
  error?: string;
  errores?: Record<string, string[] | undefined>;
  valores?: Record<string, string>;
  ok?: boolean;
};

export function valoresDe(formData: FormData) {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (typeof valor === "string" && !clave.startsWith("$")) valores[clave] = valor;
  }
  return valores;
}
