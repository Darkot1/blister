import { z } from "zod";
import { ANCHOS, ESTILOS_PORTADA, FONDOS_PORTADA, HORAS_RESPUESTA, MAX_METODOS, MAX_TESTIMONIOS, SECCIONES } from "./contenido";

/*
  Validación del editor de la página pública. Va aparte de contenido.ts para que zod no viaje al
  navegador con las constantes que usan el editor y la vista (solo la usa la Server Action).
*/

const esquemaDiseno = z.object({
  secciones: z.array(z.object({ id: z.enum(SECCIONES), visible: z.boolean(), ancho: z.enum(ANCHOS) })).max(SECCIONES.length),
  acento: z.string().regex(/^#[0-9a-f]{6}$/i, "Color no válido."),
  portada: z.enum(ESTILOS_PORTADA),
  fondo: z.enum(FONDOS_PORTADA),
  boton: z.string().trim().min(1, "Escribe el texto del botón.").max(30, "Máximo 30 caracteres."),
});

const textoOpcional = (max: number, mensaje = `Máximo ${max} caracteres.`) =>
  z
    .string()
    .trim()
    .max(max, mensaje)
    .transform((v) => v || null);

/** Validación del editor (la base de datos repite los límites por si alguien se salta la app). */
export const esquemaContenido = z.object({
  pagina_publica: z.boolean(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Mínimo 3 caracteres.")
    .max(40, "Máximo 40 caracteres.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones (sin espacios ni tildes)."),
  titular: textoOpcional(120),
  presentacion: textoOpcional(1500),
  foto_ruta: z.string().max(300).nullable(),
  metodos: z
    .array(
      z.object({
        titulo: z.string().trim().min(1, "Ponle un título.").max(60, "Máximo 60 caracteres."),
        descripcion: z.string().trim().max(300, "Máximo 300 caracteres."),
      }),
    )
    .max(MAX_METODOS, `Máximo ${MAX_METODOS} métodos.`),
  modalidad: z.enum(["presencial", "en_linea", "mixta"]).nullable(),
  ubicacion: textoOpcional(80),
  experiencia_anos: z.number().int().min(0).max(60, "Máximo 60 años.").nullable(),
  certificaciones: textoOpcional(400),
  instagram: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9._]{1,30}$/.test(v), "Solo el usuario, sin @ ni enlaces.")
    .transform((v) => v || null),
  whatsapp: z
    .string()
    .transform((v) => v.replace(/[\s()-]/g, ""))
    .refine((v) => v === "" || /^\+?[0-9]{7,15}$/.test(v), "Número con indicativo, p. ej. +57 300 123 4567.")
    .transform((v) => v || null),
  testimonios: z
    .array(
      z.object({
        nombre: z.string().trim().min(1, "Escribe quién lo dice.").max(40, "Máximo 40 caracteres."),
        texto: z.string().trim().min(1, "Escribe el testimonio.").max(300, "Máximo 300 caracteres."),
        resultado: z.string().trim().max(60, "Máximo 60 caracteres."),
      }),
    )
    .max(MAX_TESTIMONIOS, `Máximo ${MAX_TESTIMONIOS} testimonios.`),
  respuesta_horas: z
    .number()
    .int()
    .refine((h) => (HORAS_RESPUESTA as readonly number[]).includes(h), "Elige una de las opciones.")
    .nullable(),
  oferta_inicial: textoOpcional(80),
  diseno: esquemaDiseno,
});

export type EntradaContenido = z.input<typeof esquemaContenido>;

