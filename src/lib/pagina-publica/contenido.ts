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

/** Luminancia relativa (WCAG 2) de un color "#rrggbb". */
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre dos colores (1 a 21; texto normal pide 4,5 y grande o iconos 3). */
export function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Texto legible sobre el color elegido: blanco, o casi negro si el color es claro (amarillo, verde lima…). */
export const textoSobre = (hex: string) => (contraste(hex, "#ffffff") >= contraste(hex, "#12121b") ? "#ffffff" : "#12121b");

/** ¿El color se lee como texto sobre los fondos de la página (oscuro y claro)? Para avisar en el editor. */
export const contrasteBajo = (hex: string) => Math.min(contraste(hex, "#171721"), contraste(hex, "#f5f5f8")) < 2.2;

/** URL pública de la portada (el bucket es público: no hace falta firmarla). */
export const urlFoto = (ruta: string | null) =>
  ruta ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PAGINAS}/${ruta}` : null;

/** "Certificado NSCA, Fisioterapeuta" o una por línea → ["Certificado NSCA", "Fisioterapeuta"]. */
export const listaCertificaciones = (texto: string | null) =>
  (texto ?? "")
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);

/** WhatsApp: con 10 dígitos que empiezan por 3 se asume un celular de Colombia (+57). */
export const enlaceWhatsapp = (telefono: string) => {
  const digitos = telefono.replace(/\D/g, "");
  return `https://wa.me/${digitos.length === 10 && digitos.startsWith("3") ? `57${digitos}` : digitos}`;
};
