"use server";

import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoSolicitud = {
  enviada?: boolean;
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

/** Formulario de /e/<slug>: deja una solicitud para el entrenador. Sin sesión: todo pasa por la RPC enviar_solicitud. */
export async function enviarSolicitud(slug: string, _: EstadoSolicitud, formData: FormData): Promise<EstadoSolicitud> {
  const valores = Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  // Trampa para bots: un campo oculto que una persona nunca llena. Se finge éxito.
  if (valores.sitio_web) return { enviada: true };

  // Los campos que solo salen al pedir entrenar pueden no venir (al escribir una pregunta).
  const datos = esquema.safeParse({ fecha_nacimiento: "", lesiones: "", ...valores });
  if (!datos.success) return { errores: z.flattenError(datos.error).fieldErrors, valores };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("enviar_solicitud", {
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
  return { enviada: true };
}
