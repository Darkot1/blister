"use server";

import { refresh } from "next/cache";
import { obtenerContexto } from "@/lib/sesion";
import { desconectarGoogle } from "@/lib/google/calendario";

/** Quita el permiso de Google Calendar. Los eventos ya creados se quedan en el calendario. */
export async function desconectarGoogleCalendar() {
  const { supabase, usuarioId } = await obtenerContexto();
  await desconectarGoogle(supabase, usuarioId);
  refresh();
}
