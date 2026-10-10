import "server-only";
import type { Contexto } from "@/lib/sesion";
import type { BloqueFila, PrescripcionFila } from "@/lib/supabase/tipos-bd";
import type { Rol } from "@/lib/ejercicios/ranking";

type Supabase = Contexto["supabase"];

export type EjercicioCatalogo = { id: string; nombre: string; tipo: string; dificultad: string | null; activo: boolean };

export type Catalogo = {
  ejercicios: EjercicioCatalogo[];
  relaciones: { ejercicioId: string; slug: string; rol: Rol }[];
  musculos: { slug: string; nombre: string }[];
};

/** Ejercicios utilizables (globales y propios), sus músculos y el catálogo de músculos. */
export async function cargarCatalogo(supabase: Supabase): Promise<Catalogo> {
  const [{ data: ejercicios }, { data: relaciones }, { data: musculos }] = await Promise.all([
    supabase.from("ejercicios").select("id, nombre, tipo, dificultad, estado").order("nombre"),
    supabase.from("ejercicios_musculos").select("ejercicio_id, musculo_id, rol"),
    supabase.from("musculos").select("id, slug, nombre").order("orden"),
  ]);
  const slugDe = new Map((musculos ?? []).map((m) => [m.id, m.slug]));
  return {
    ejercicios: (ejercicios ?? []).map(({ estado, ...e }) => ({ ...e, activo: estado === "activo" })),
    relaciones: (relaciones ?? []).flatMap((r) => {
      const slug = slugDe.get(r.musculo_id);
      return slug ? [{ ejercicioId: r.ejercicio_id, slug, rol: r.rol as Rol }] : [];
    }),
    musculos: (musculos ?? []).map(({ slug, nombre }) => ({ slug, nombre })),
  };
}

export type BloqueArbol = BloqueFila & { ejercicios: PrescripcionFila[] };
export type DiaArbol = { id: string; nombre: string; descripcion: string | null; bloques: BloqueArbol[] };

function armar(
  dias: { id: string; nombre: string; descripcion: string | null }[],
  bloques: (BloqueFila & { dia_id: string })[],
  ejercicios: (PrescripcionFila & { bloque_id: string })[],
): DiaArbol[] {
  const porBloque = Map.groupBy([...ejercicios].sort((a, b) => a.orden - b.orden), (e) => e.bloque_id);
  const porDia = Map.groupBy([...bloques].sort((a, b) => a.orden - b.orden), (b) => b.dia_id);
  return dias.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    descripcion: d.descripcion,
    bloques: (porDia.get(d.id) ?? []).map((b) => ({ ...b, ejercicios: porBloque.get(b.id) ?? [] })),
  }));
}

const COLUMNAS_PRESCRIPCION =
  "id, ejercicio_id, orden, series, repeticiones, peso, unidad_peso, descanso_segundos, tempo, rir, rpe, notas";

/** Rutina (plantilla) con días, bloques y ejercicios. `null` si no existe o no es de la organización. */
export async function cargarPlantilla(supabase: Supabase, id: string) {
  const { data: plantilla } = await supabase
    .from("plantillas")
    .select("id, nombre, descripcion, tipo_objetivo, estado, actualizado_en")
    .eq("id", id)
    .maybeSingle();
  if (!plantilla) return null;

  const { data: dias } = await supabase
    .from("plantilla_dias")
    .select("id, nombre, descripcion, orden")
    .eq("plantilla_id", id)
    .order("orden");
  const diaIds = (dias ?? []).map((d) => d.id);
  const { data: bloques } = diaIds.length
    ? await supabase.from("plantilla_bloques").select("*").in("plantilla_dia_id", diaIds)
    : { data: [] };
  const bloqueIds = (bloques ?? []).map((b) => b.id);
  const { data: ejercicios } = bloqueIds.length
    ? await supabase.from("plantilla_ejercicios").select(`${COLUMNAS_PRESCRIPCION}, plantilla_bloque_id` as const).in("plantilla_bloque_id", bloqueIds)
    : { data: [] };

  return {
    ...plantilla,
    dias: armar(
      dias ?? [],
      (bloques ?? []).map(({ plantilla_dia_id, ...b }) => ({ ...b, dia_id: plantilla_dia_id })),
      (ejercicios ?? []).map(({ plantilla_bloque_id, ...e }) => ({ ...e, bloque_id: plantilla_bloque_id })),
    ),
  };
}

/** Plan de un alumno con días, bloques y ejercicios. `null` si no existe o no es de la organización. */
export async function cargarPlan(supabase: Supabase, id: string) {
  const { data: plan } = await supabase.from("planes").select("*").eq("id", id).maybeSingle();
  if (!plan) return null;

  const { data: dias } = await supabase
    .from("plan_dias")
    .select("id, nombre, descripcion, orden")
    .eq("plan_id", id)
    .order("orden");
  const diaIds = (dias ?? []).map((d) => d.id);
  const { data: bloques } = diaIds.length
    ? await supabase.from("plan_bloques").select("*").in("plan_dia_id", diaIds)
    : { data: [] };
  const bloqueIds = (bloques ?? []).map((b) => b.id);
  const { data: ejercicios } = bloqueIds.length
    ? await supabase.from("plan_ejercicios").select(`${COLUMNAS_PRESCRIPCION}, plan_bloque_id` as const).in("plan_bloque_id", bloqueIds)
    : { data: [] };

  return {
    ...plan,
    dias: armar(
      dias ?? [],
      (bloques ?? []).map(({ plan_dia_id, ...b }) => ({ ...b, dia_id: plan_dia_id })),
      (ejercicios ?? []).map(({ plan_bloque_id, ...e }) => ({ ...e, bloque_id: plan_bloque_id })),
    ),
  };
}
