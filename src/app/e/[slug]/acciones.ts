"use server";

import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoSolicitud = {
  enviada?: boolean;
  /** Ya había enviado desde este navegador: no se manda otra. */
  repetida?: boolean;
  error?: string;
  errores?: Record<string, string[] | undefined>;
  valores?: Record<string, string>;
};

const OBJETIVOS = ["hipertrofia", "perdida_grasa", "fuerza", "movilidad", "resistencia", "tecnica", "rehabilitacion", "salud_general"] as const;

const esquema = z
  .object({
    tipo: z.enum(["registro", "contacto"]),
    nombres: z.string().trim().min(1, "Escribe tu nombre.").max(80),
    apellidos: z.string().trim().max(80),
    correo: z.union([z.literal(""), z.email("Revisa tu correo.").max(254)]),
    telefono: z
      .string()
      .trim()
      .max(30)
      .refine((t) => t === "" || /^[0-9+()\s-]{7,30}$/.test(t), "Revisa tu teléfono."),
    objetivo: z.union([z.literal(""), z.enum(OBJETIVOS)]),
    fecha_nacimiento: z.union([
      z.literal(""),
      z.iso.date("Revisa la fecha.").refine((f) => {
        const anios = (Date.now() - new Date(`${f}T12:00:00`).getTime()) / (365.25 * 24 * 3600 * 1000);
        return anios >= 5 && anios <= 100;
      }, "Revisa la fecha."),
    ]),
    lesiones: z.string().trim().max(500, "Máximo 500 caracteres."),
    mensaje: z.string().trim().max(1000, "Máximo 1000 caracteres."),
    // Autorización de tratamiento de datos (Ley 1581 de 2012): el mensaje puede traer datos de salud.
    autoriza: z.literal("si", "Necesitamos tu autorización para tratar tus datos."),
  })
  .refine((d) => d.correo !== "" || d.telefono !== "", { message: "Deja un correo o un teléfono.", path: ["correo"] });

/** Mensajes que la RPC lanza a propósito para quien llena el formulario (validación, límite, página apagada). */
const CODIGOS_CON_MENSAJE = new Set(["22023", "54000", "P0002"]);

/** Un día: desde el mismo navegador no se manda otra solicitud a la misma página. */
const COOKIE_DURACION = 60 * 60 * 24;

/** Huella de la conexión (HMAC de la IP con el secreto del servidor): limita envíos sin guardar la IP. */
async function origen(secreto: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  return ip ? createHmac("sha256", secreto).update(ip).digest("hex") : "";
}

/** Formulario de /e/<slug>: deja una solicitud para el entrenador. Sin sesión: todo pasa por la RPC enviar_solicitud_web, que exige el secreto del servidor. */
export async function enviarSolicitud(slug: string, _: EstadoSolicitud, formData: FormData): Promise<EstadoSolicitud> {
  const valores = Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  // Trampa para bots: un campo oculto que una persona nunca llena. Se finge éxito.
  if (valores.sitio_web) return { enviada: true };

  // Los campos que solo salen al pedir entrenar pueden no venir (al escribir una pregunta).
  const datos = esquema.safeParse({ fecha_nacimiento: "", lesiones: "", ...valores });
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores };

  const almacen = await cookies();
  const marca = `solicitud-${slug}`;
  if (almacen.has(marca)) return { enviada: true, repetida: true };

  const secreto = process.env.FORMULARIO_SECRETO;
  if (!secreto) return { error: "No se pudo enviar. Inténtalo de nuevo en un momento.", valores };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("enviar_solicitud_web", {
    p_secreto: secreto,
    p_origen: await origen(secreto),
    p_slug: slug,
    p_tipo: datos.data.tipo,
    p_nombres: datos.data.nombres,
    p_apellidos: datos.data.apellidos,
    p_correo: datos.data.correo,
    p_telefono: datos.data.telefono,
    p_objetivo: datos.data.objetivo,
    p_mensaje: datos.data.mensaje,
    p_autoriza: true,
    p_fecha_nacimiento: datos.data.fecha_nacimiento || null,
    p_lesiones: datos.data.lesiones,
  });
  if (error) {
    return { error: CODIGOS_CON_MENSAJE.has(error.code) ? error.message : "No se pudo enviar. Inténtalo de nuevo en un momento.", valores };
  }
  almacen.set(marca, "1", { maxAge: COOKIE_DURACION, httpOnly: true, sameSite: "lax", secure: true, path: `/e/${slug}` });
  return { enviada: true };
}
