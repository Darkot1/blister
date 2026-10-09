"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { exigirSuperadmin } from "@/lib/sesion";

export type EstadoCambio = { error?: string; ok?: boolean };

const esquema = z.object({
  id: z.uuid(),
  estado: z.enum(["activo", "suspendido"]),
  motivo: z.string().trim().max(500).optional(),
});

/** Suspende o reactiva un espacio. La RPC vuelve a comprobar el rol y deja el registro. */
export async function cambiarEstadoEspacio(_: EstadoCambio, formData: FormData): Promise<EstadoCambio> {
  const datos = esquema.safeParse({
    id: formData.get("id"),
    estado: formData.get("estado"),
    motivo: formData.get("motivo") ?? undefined,
  });
  if (!datos.success) return { error: "Datos no válidos." };
  if (datos.data.estado === "suspendido" && !datos.data.motivo) {
    return { error: "Escribe el motivo de la suspensión: queda en la bitácora." };
  }

  const { supabase } = await exigirSuperadmin();
  const { error } = await supabase.rpc("admin_cambiar_estado_espacio", {
    p_organizacion_id: datos.data.id,
    p_estado: datos.data.estado,
    p_motivo: datos.data.motivo || undefined,
  });
  if (error) {
    return { error: error.code === "42501" || error.code === "P0002" || error.code === "22023" ? error.message : "No se pudo cambiar el estado. Inténtalo de nuevo." };
  }
  refresh();
  return { ok: true };
}
