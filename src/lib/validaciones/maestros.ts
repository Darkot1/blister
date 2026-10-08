import { z } from "zod";
import { DIFICULTADES, ROLES_MUSCULO, TIPOS_EJERCICIO } from "@/lib/ejercicios/etiquetas";

const textoOpcional = z
  .string()
  .trim()
  .max(4000, "Es demasiado largo")
  .transform((v) => (v === "" ? null : v))
  .nullable();

const uuid = z.string().regex(/^[0-9a-f-]{36}$/i, "Valor no válido");

export const esquemaEjercicio = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre del ejercicio").max(120, "Usa un nombre más corto"),
  tipo: z.enum(TIPOS_EJERCICIO, { message: "Elige el tipo" }),
  dificultad: z
    .union([z.enum(DIFICULTADES), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  es_unilateral: z.boolean(),
  descripcion: textoOpcional,
  instrucciones: textoOpcional,
  musculos: z
    .array(z.object({ id: uuid, rol: z.enum(ROLES_MUSCULO) }))
    .min(1, "Añade al menos un músculo")
    .refine((m) => m.some((x) => x.rol === "principal"), "Marca al menos un músculo como principal")
    .refine((m) => new Set(m.map((x) => x.id)).size === m.length, "Hay músculos repetidos"),
  equipos: z.array(uuid),
});

/** Lee el formulario del ejercicio: los músculos llegan como "id:rol" y los equipos repetidos. */
export function leerEjercicio(formData: FormData) {
  return esquemaEjercicio.safeParse({
    nombre: formData.get("nombre") ?? "",
    tipo: formData.get("tipo") ?? "",
    dificultad: formData.get("dificultad") ?? "",
    es_unilateral: formData.get("es_unilateral") === "on",
    descripcion: formData.get("descripcion") ?? "",
    instrucciones: formData.get("instrucciones") ?? "",
    musculos: formData.getAll("musculo").map((v) => {
      const [id, rol] = String(v).split(":");
      return { id, rol };
    }),
    equipos: formData.getAll("equipo").map(String),
  });
}

export const esquemaMusculo = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre del músculo").max(80, "Usa un nombre más corto"),
  grupo_muscular_id: z.string().regex(/^[0-9a-f-]{36}$/i, "Elige el grupo muscular"),
  descripcion: textoOpcional,
});

/** "Glúteo menor" → "gluteo_menor". */
export function slugDe(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}
