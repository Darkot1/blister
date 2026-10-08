import "server-only";
import type { Contexto } from "@/lib/sesion";

/** Músculos (globales + propios) por grupo y el equipamiento, para el formulario de ejercicio. */
export async function catalogoFormulario(supabase: Contexto["supabase"]) {
  const [{ data: grupos }, { data: musculos }, { data: equipamiento }] = await Promise.all([
    supabase.from("grupos_musculares").select("id, nombre, orden").order("orden"),
    supabase.from("musculos").select("id, nombre, grupo_muscular_id, organizacion_id, orden").order("orden").order("nombre"),
    supabase.from("equipamiento").select("id, nombre").order("nombre"),
  ]);
  return {
    grupos: (grupos ?? [])
      .map((g) => ({
        nombre: g.nombre,
        musculos: (musculos ?? [])
          .filter((m) => m.grupo_muscular_id === g.id)
          .map((m) => ({ id: m.id, nombre: m.nombre, propio: m.organizacion_id !== null })),
      }))
      .filter((g) => g.musculos.length),
    equipamiento: equipamiento ?? [],
  };
}
