import "server-only";
import type { Contexto } from "@/lib/sesion";

type Supabase = Contexto["supabase"];

export type DiaPlan = { id: string; nombre: string; orden: number };

export type PlanActivo = {
  id: string;
  nombre: string;
  fechaInicio: string;
  dias: DiaPlan[];
  /** Día que toca a continuación: el siguiente al de la última sesión agendada (o el primero). */
  siguienteDiaId: string | null;
};

const ESTADOS_QUE_CUENTAN = ["programada", "en_curso", "completada"];

/** Plan activo de cada alumno (alumno_id → plan), con sus días. Sin `alumnoIds`, todos los del espacio. */
export async function planesActivos(supabase: Supabase, alumnoIds?: string[]) {
  const resultado = new Map<string, PlanActivo>();
  if (alumnoIds && !alumnoIds.length) return resultado;

  let consulta = supabase.from("planes").select("id, alumno_id, nombre, fecha_inicio").eq("estado", "activo");
  if (alumnoIds) consulta = consulta.in("alumno_id", alumnoIds);
  const { data: planes } = await consulta;
  if (!planes?.length) return resultado;

  const planIds = planes.map((p) => p.id);
  const [{ data: dias }, { data: sesiones }] = await Promise.all([
    supabase.from("plan_dias").select("id, plan_id, nombre, orden").in("plan_id", planIds).order("orden"),
    supabase
      .from("sesiones")
      .select("plan_id, plan_dia_id, programada_para")
      .in("plan_id", planIds)
      .in("estado", ESTADOS_QUE_CUENTAN)
      .not("plan_dia_id", "is", null)
      .order("programada_para", { ascending: false })
      .limit(1000),
  ]);

  const diasDe = Map.groupBy(dias ?? [], (d) => d.plan_id);
  const ultimoDia = new Map<string, string>();
  for (const s of sesiones ?? []) if (s.plan_id && s.plan_dia_id && !ultimoDia.has(s.plan_id)) ultimoDia.set(s.plan_id, s.plan_dia_id);

  for (const p of planes) {
    const susDias = (diasDe.get(p.id) ?? []).map(({ id, nombre, orden }) => ({ id, nombre, orden }));
    const ultimo = susDias.findIndex((d) => d.id === ultimoDia.get(p.id));
    const siguiente = susDias.length ? susDias[(ultimo + 1) % susDias.length] : null;
    resultado.set(p.alumno_id, { id: p.id, nombre: p.nombre, fechaInicio: p.fecha_inicio, dias: susDias, siguienteDiaId: siguiente?.id ?? null });
  }
  return resultado;
}

export type DiaDeSesion = { planId: string; plan: string; dia: string; orden: number };

/** Qué día del plan se entrena en cada sesión (sesion_id → día). */
export async function diasDeSesiones(supabase: Supabase, sesionIds: string[]) {
  const resultado = new Map<string, DiaDeSesion>();
  if (!sesionIds.length) return resultado;
  const { data: sesiones } = await supabase.from("sesiones").select("id, plan_id, plan_dia_id").in("id", sesionIds);
  const diaIds = [...new Set((sesiones ?? []).flatMap((s) => (s.plan_dia_id ? [s.plan_dia_id] : [])))];
  const planIds = [...new Set((sesiones ?? []).flatMap((s) => (s.plan_id ? [s.plan_id] : [])))];
  if (!diaIds.length) return resultado;
  const [{ data: dias }, { data: planes }] = await Promise.all([
    supabase.from("plan_dias").select("id, nombre, orden").in("id", diaIds),
    supabase.from("planes").select("id, nombre").in("id", planIds),
  ]);
  const dia = new Map((dias ?? []).map((d) => [d.id, d]));
  const plan = new Map((planes ?? []).map((p) => [p.id, p.nombre]));
  for (const s of sesiones ?? []) {
    const d = s.plan_dia_id ? dia.get(s.plan_dia_id) : undefined;
    if (d && s.plan_id) resultado.set(s.id, { planId: s.plan_id, plan: plan.get(s.plan_id) ?? "", dia: d.nombre, orden: d.orden });
  }
  return resultado;
}
