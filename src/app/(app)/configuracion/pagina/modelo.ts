import { normalizarDiseno, type Diseno } from "@/lib/pagina-publica/contenido";
import type { EntradaContenido } from "@/lib/pagina-publica/validacion";
import type { MetodoTrabajo, OrganizacionFila, PaginaPublica, Testimonio } from "@/lib/supabase/tipos-bd";

/** Lo que el editor lee del espacio. El nombre del espacio no: la página se presenta con el del entrenador. */
export type Inicial = Pick<
  OrganizacionFila,
  | "slug"
  | "pagina_publica"
  | "titular"
  | "presentacion"
  | "foto_ruta"
  | "metodos"
  | "modalidad"
  | "ubicacion"
  | "experiencia_anos"
  | "certificaciones"
  | "instagram"
  | "whatsapp"
  | "diseno"
  | "testimonios"
  | "respuesta_horas"
  | "oferta_inicial"
>;

/** El formulario guarda texto tal cual se escribe; al guardar se valida y se normaliza en el servidor. */
export type Borrador = {
  pagina_publica: boolean;
  slug: string;
  titular: string;
  presentacion: string;
  foto_ruta: string | null;
  metodos: (MetodoTrabajo & { clave: string })[];
  modalidad: string;
  ubicacion: string;
  experiencia_anos: string;
  certificaciones: string;
  instagram: string;
  whatsapp: string;
  testimonios: (Testimonio & { clave: string })[];
  respuesta_horas: string;
  oferta_inicial: string;
  diseno: Diseno;
};

export const nuevaClave = () => crypto.randomUUID();

export const desdeInicial = (i: Inicial): Borrador => ({
  pagina_publica: i.pagina_publica,
  slug: i.slug,
  titular: i.titular ?? "",
  presentacion: i.presentacion ?? "",
  foto_ruta: i.foto_ruta,
  // Claves fijas para lo que viene del servidor (iguales al hidratar); aleatorias solo para lo nuevo.
  metodos: (i.metodos ?? []).map((m, n) => ({ ...m, clave: `guardado-${n}` })),
  modalidad: i.modalidad ?? "",
  ubicacion: i.ubicacion ?? "",
  experiencia_anos: i.experiencia_anos === null ? "" : String(i.experiencia_anos),
  certificaciones: i.certificaciones ?? "",
  instagram: i.instagram ?? "",
  whatsapp: i.whatsapp ?? "",
  testimonios: (i.testimonios ?? []).map((t, n) => ({ ...t, clave: `guardado-${n}` })),
  respuesta_horas: i.respuesta_horas == null ? "" : String(i.respuesta_horas),
  oferta_inicial: i.oferta_inicial ?? "",
  diseno: normalizarDiseno(i.diseno),
});

/** Para comparar con lo guardado: sin las claves de las listas, que son solo de la interfaz. */
export const serializar = (b: Borrador) => JSON.stringify(b, (k, v) => (k === "clave" ? undefined : v));

const numero = (v: string) => (v.trim() === "" ? null : Number(v));

/** Lo que se manda a guardar. */
export const aEntrada = (b: Borrador, publicar = b.pagina_publica): EntradaContenido => ({
  ...b,
  pagina_publica: publicar,
  modalidad: (b.modalidad || null) as "presencial" | "en_linea" | "mixta" | null,
  experiencia_anos: numero(b.experiencia_anos),
  metodos: b.metodos.map(({ titulo, descripcion }) => ({ titulo, descripcion })),
  testimonios: b.testimonios.map(({ nombre, texto, resultado }) => ({ nombre, texto, resultado })),
  respuesta_horas: numero(b.respuesta_horas),
});

/** Lo que ve el visitante, con lo que se está escribiendo ahora mismo. */
export const aPagina = (b: Borrador, entrenadores: PaginaPublica["entrenadores"]): PaginaPublica => ({
  nombre: "",
  titular: b.titular.trim() || null,
  presentacion: b.presentacion.trim() || null,
  foto_ruta: b.foto_ruta,
  metodos: b.metodos,
  modalidad: (b.modalidad || null) as PaginaPublica["modalidad"],
  ubicacion: b.ubicacion.trim() || null,
  experiencia_anos: numero(b.experiencia_anos) || null,
  certificaciones: b.certificaciones.trim() || null,
  instagram: b.instagram.trim().replace(/^@/, "") || null,
  whatsapp: b.whatsapp.trim() || null,
  diseno: b.diseno,
  testimonios: b.testimonios,
  respuesta_horas: numero(b.respuesta_horas),
  oferta_inicial: b.oferta_inicial.trim() || null,
  entrenadores,
});

/* ---------- Pasos ---------- */

export const PASOS = [
  { id: "portada", corto: "Portada", titulo: "Tu foto y tu promesa", texto: "Lo primero que ve quien abre tu enlace: decide en segundos si sigue leyendo." },
  { id: "oferta", corto: "Qué ofreces", titulo: "Qué ofreces y cómo trabajas", texto: "Para quién es tu entrenamiento y cómo es empezar contigo." },
  { id: "confianza", corto: "Confianza", titulo: "Por qué confiar en ti", texto: "Lo que dicen tus alumnos y tu experiencia: es lo que más convence." },
  { id: "contacto", corto: "Contacto", titulo: "Oferta y contacto", texto: "Un motivo para escribir hoy y la forma más fácil de hacerlo." },
  { id: "diseno", corto: "Diseño", titulo: "Cómo se ve", texto: "Color, portada y orden de las secciones." },
  { id: "publicar", corto: "Publicar", titulo: "Publica y comparte", texto: "Tu enlace, listo para Instagram, WhatsApp y tus tarjetas." },
] as const;

export type Paso = (typeof PASOS)[number]["id"];

export const esPaso = (v: string | null): v is Paso => PASOS.some((p) => p.id === v);

/** En qué paso se edita cada campo: para llevar al entrenador al error al guardar. */
const CAMPO_PASO: Record<string, Paso> = {
  foto_ruta: "portada",
  titular: "portada",
  presentacion: "oferta",
  metodos: "oferta",
  modalidad: "oferta",
  ubicacion: "oferta",
  experiencia_anos: "confianza",
  certificaciones: "confianza",
  testimonios: "confianza",
  oferta_inicial: "contacto",
  whatsapp: "contacto",
  instagram: "contacto",
  respuesta_horas: "contacto",
  diseno: "diseno",
  slug: "publicar",
  pagina_publica: "publicar",
};

export const pasoDeError = (errores: Record<string, unknown>): Paso | null => {
  for (const p of PASOS) if (Object.keys(errores).some((c) => CAMPO_PASO[c.split(".")[0]] === p.id)) return p.id;
  return null;
};

/**
 * Lo que más ayuda a que un visitante pida su cupo, en orden de impacto. Sirve de lista en el paso de
 * publicar y marca qué pasos están completos.
 */
export type PuntoLista = { id: string; paso: Paso; texto: string; hecho: boolean };

export const lista = (b: Borrador): PuntoLista[] => {
  const testimonios = b.testimonios.filter((t) => t.nombre.trim() && t.texto.trim()).length;
  return [
    { id: "foto", paso: "portada", texto: "Una foto tuya entrenando", hecho: Boolean(b.foto_ruta) },
    { id: "titular", paso: "portada", texto: "Una promesa clara bajo tu nombre", hecho: b.titular.trim().length >= 15 },
    { id: "presentacion", paso: "oferta", texto: "Para quién es tu entrenamiento", hecho: b.presentacion.trim().length >= 80 },
    { id: "metodos", paso: "oferta", texto: "Al menos 2 pasos de cómo trabajas", hecho: b.metodos.filter((m) => m.titulo.trim()).length >= 2 },
    { id: "testimonios", paso: "confianza", texto: "Al menos un testimonio real", hecho: testimonios >= 1 },
    { id: "experiencia", paso: "confianza", texto: "Tu experiencia o certificaciones", hecho: Boolean(b.experiencia_anos.trim() || b.certificaciones.trim()) },
    { id: "oferta", paso: "contacto", texto: "Una oferta para empezar", hecho: Boolean(b.oferta_inicial.trim()) },
    { id: "respuesta", paso: "contacto", texto: "Cuánto tardas en responder", hecho: Boolean(b.respuesta_horas) },
    { id: "whatsapp", paso: "contacto", texto: "Tu WhatsApp", hecho: Boolean(b.whatsapp.trim()) },
  ];
};

/** Un paso está completo cuando todo lo suyo de la lista lo está (diseño y publicar no tienen lista). */
export const pasoCompleto = (b: Borrador, paso: Paso) => {
  if (paso === "diseno") return false;
  if (paso === "publicar") return b.pagina_publica;
  return lista(b)
    .filter((x) => x.paso === paso)
    .every((x) => x.hecho);
};
