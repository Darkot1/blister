"use server";

import { refresh } from "next/cache";
import { obtenerContexto } from "@/lib/sesion";
import { desconectarGoogle } from "@/lib/google/calendario";
import { BUCKET_PAGINAS, esquemaContenido, type EntradaContenido } from "@/lib/pagina-publica/contenido";

type Supabase = Awaited<ReturnType<typeof obtenerContexto>>["supabase"];

/** Quita el permiso de Google Calendar. Los eventos ya creados se quedan en el calendario. */
export async function desconectarGoogleCalendar() {
  const { supabase, usuarioId } = await obtenerContexto();
  await desconectarGoogle(supabase, usuarioId);
  refresh();
}

export type EstadoPagina = { ok?: boolean; error?: string; errores?: Record<string, string[] | undefined> };

/** Borra de la carpeta del espacio las fotos que ya no usa la página (subidas y luego cambiadas o quitadas). */
async function limpiarFotos(supabase: Supabase, organizacionId: string, conservar: string | null) {
  const { data: archivos } = await supabase.storage.from(BUCKET_PAGINAS).list(organizacionId, { limit: 100 });
  const sobrantes = (archivos ?? []).map((a) => `${organizacionId}/${a.name}`).filter((ruta) => ruta !== conservar);
  if (sobrantes.length) await supabase.storage.from(BUCKET_PAGINAS).remove(sobrantes);
}

/** Página pública del espacio (/e/<slug>): enlace, visibilidad y todo su contenido. Solo propietario o admin (RLS). */
export async function guardarPagina(entrada: EntradaContenido): Promise<EstadoPagina> {
  const datos = esquemaContenido.safeParse(entrada);
  if (!datos.success) {
    // Cada error con su ruta completa ("diseno.boton", "metodos.0.titulo") y la de su sección ("metodos").
    const errores: Record<string, string[]> = {};
    for (const { path, message } of datos.error.issues) {
      for (const clave of new Set([path.join("."), String(path[0])])) (errores[clave] ??= []).push(message);
    }
    return { errores, error: "Revisa los campos marcados." };
  }

  const { supabase, organizacionId } = await obtenerContexto();
  if (datos.data.foto_ruta && !datos.data.foto_ruta.startsWith(`${organizacionId}/`)) return { error: "La foto no es de tu espacio." };

  const { data, error } = await supabase.from("organizaciones").update(datos.data).eq("id", organizacionId).select("id");
  // 23505: otro espacio ya usa ese enlace.
  if (error?.code === "23505") return { errores: { slug: ["Ese enlace ya está en uso. Prueba con otro."] }, error: "Revisa los campos marcados." };
  if (error || !data?.length) return { error: "No se pudo guardar. Solo el propietario o un administrador puede cambiar la página." };
  await limpiarFotos(supabase, organizacionId, datos.data.foto_ruta);
  refresh();
  return { ok: true };
}

/** Apaga la página y borra su contenido y su foto. El enlace se conserva para volver a usarlo. */
export async function eliminarPagina(): Promise<EstadoPagina> {
  const { supabase, organizacionId } = await obtenerContexto();
  const { data, error } = await supabase
    .from("organizaciones")
    .update({
      pagina_publica: false,
      titular: null,
      presentacion: null,
      foto_ruta: null,
      metodos: [],
      modalidad: null,
      ubicacion: null,
      experiencia_anos: null,
      certificaciones: null,
      instagram: null,
      whatsapp: null,
      diseno: {},
    })
    .eq("id", organizacionId)
    .select("id");
  if (error || !data?.length) return { error: "No se pudo eliminar. Solo el propietario o un administrador puede hacerlo." };
  await limpiarFotos(supabase, organizacionId, null);
  refresh();
  return { ok: true };
}
