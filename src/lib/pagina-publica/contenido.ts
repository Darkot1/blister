import { z } from "zod";
import type { PaginaPublica } from "@/lib/supabase/tipos-bd";

/** Lo que el entrenador edita de su página pública (todo opcional salvo el enlace). */
export type ContenidoPagina = Omit<PaginaPublica, "nombre" | "entrenadores">;

export const BUCKET_PAGINAS = "paginas-publicas";

export const ETIQUETA_MODALIDAD: Record<string, string> = {
  presencial: "Presencial",
  en_linea: "En línea",
  mixta: "Presencial y en línea",
};

export const MAX_METODOS = 6;

/* ---------- Diseño (lo que se personaliza en el editor) ---------- */

/** Secciones que se pueden ordenar y ocultar. La portada va siempre primero. */
export const SECCIONES = ["sobre", "metodos", "contacto"] as const;
export type Seccion = (typeof SECCIONES)[number];

export const ETIQUETA_SECCION: Record<Seccion, string> = {
  sobre: "Sobre mí",
  metodos: "Cómo trabajo",
  contacto: "Formulario de contacto",
};

/** Dónde va el texto de la portada; la foto (si hay) va siempre detrás. */
export const ESTILOS_PORTADA = ["izquierda", "centrada", "abajo"] as const;
/** Nombres de una versión anterior → los actuales. */
const ESTILO_ANTERIOR: Record<string, (typeof ESTILOS_PORTADA)[number]> = { dividida: "izquierda", fondo: "abajo" };
/** Sin foto, el fondo de la portada; con foto, el velo que la tiñe para que se lea el texto. */
export const FONDOS_PORTADA = ["suave", "oscuro", "color"] as const;
/** Una sección ocupa toda la fila o media (dos mitades seguidas quedan lado a lado). */
export const ANCHOS = ["completo", "mitad"] as const;

/** Colores probados con texto blanco encima (botones) en tema claro y oscuro. */
export const COLORES = [
  { valor: "#5266eb", nombre: "Cobalto" },
  { valor: "#7048e8", nombre: "Violeta" },
  { valor: "#d6336c", nombre: "Frambuesa" },
  { valor: "#e8590c", nombre: "Naranja" },
  { valor: "#2b8a3e", nombre: "Verde" },
  { valor: "#0c8599", nombre: "Petróleo" },
  { valor: "#495057", nombre: "Grafito" },
] as const;

export type Diseno = {
  secciones: { id: Seccion; visible: boolean; ancho: (typeof ANCHOS)[number] }[];
  /** Color principal en hex (#rrggbb): botones, números y detalles. */
  acento: string;
  portada: (typeof ESTILOS_PORTADA)[number];
  fondo: (typeof FONDOS_PORTADA)[number];
  /** Texto del botón principal. */
  boton: string;
};

export const DISENO_INICIAL: Diseno = {
  secciones: SECCIONES.map((id) => ({ id, visible: true, ancho: "completo" })),
  acento: COLORES[0].valor,
  portada: "izquierda",
  fondo: "suave",
  boton: "Quiero entrenar",
};

const esHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/**
 * Lo guardado en la base (jsonb libre) → un diseño completo y válido. Tolera datos viejos o a medias:
 * lo que falte o no se entienda toma el valor inicial, y las secciones nuevas se añaden al final.
 */
export function normalizarDiseno(guardado: unknown): Diseno {
  const d = (guardado && typeof guardado === "object" ? guardado : {}) as Record<string, unknown>;
  const lista = Array.isArray(d.secciones) ? d.secciones : [];
  const vistas = new Set<Seccion>();
  const secciones: Diseno["secciones"] = [];
  for (const item of lista) {
    const id = (item as { id?: unknown })?.id;
    if (!SECCIONES.includes(id as Seccion) || vistas.has(id as Seccion)) continue;
    vistas.add(id as Seccion);
    const ancho = (item as { ancho?: unknown }).ancho === "mitad" ? "mitad" : "completo";
    secciones.push({ id: id as Seccion, visible: (item as { visible?: unknown }).visible !== false, ancho });
  }
  for (const id of SECCIONES) if (!vistas.has(id)) secciones.push({ id, visible: true, ancho: "completo" });
  const portada = ESTILO_ANTERIOR[d.portada as string] ?? d.portada;
  return {
    secciones,
    acento: esHex(d.acento) ? d.acento.toLowerCase() : DISENO_INICIAL.acento,
    portada: ESTILOS_PORTADA.includes(portada as Diseno["portada"]) ? (portada as Diseno["portada"]) : DISENO_INICIAL.portada,
    fondo: FONDOS_PORTADA.includes(d.fondo as Diseno["fondo"]) ? (d.fondo as Diseno["fondo"]) : DISENO_INICIAL.fondo,
    boton: typeof d.boton === "string" && d.boton.trim() ? d.boton.trim().slice(0, 30) : DISENO_INICIAL.boton,
  };
}

const esquemaDiseno = z.object({
  secciones: z.array(z.object({ id: z.enum(SECCIONES), visible: z.boolean(), ancho: z.enum(ANCHOS) })).max(SECCIONES.length),
  acento: z.string().regex(/^#[0-9a-f]{6}$/i, "Color no válido."),
  portada: z.enum(ESTILOS_PORTADA),
  fondo: z.enum(FONDOS_PORTADA),
  boton: z.string().trim().min(1, "Escribe el texto del botón.").max(30, "Máximo 30 caracteres."),
});

/** URL pública de la portada (el bucket es público: no hace falta firmarla). */
export const urlFoto = (ruta: string | null) =>
  ruta ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PAGINAS}/${ruta}` : null;

/** "Certificado NSCA, Fisioterapeuta" o una por línea → ["Certificado NSCA", "Fisioterapeuta"]. */
export const listaCertificaciones = (texto: string | null) =>
  (texto ?? "")
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);

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
  diseno: esquemaDiseno,
});

export type EntradaContenido = z.input<typeof esquemaContenido>;

/** WhatsApp: con 10 dígitos que empiezan por 3 se asume un celular de Colombia (+57). */
export const enlaceWhatsapp = (telefono: string) => {
  const digitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${digitos.length === 10 && digitos.startsWith("3") ? `57${digitos}` : digitos}`;
};
