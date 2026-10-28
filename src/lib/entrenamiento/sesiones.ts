import "server-only";
import type { Contexto } from "@/lib/sesion";
import type { SesionSerieFila } from "@/lib/supabase/tipos-bd";

type Supabase = Contexto["supabase"];

/** Consultas `in(...)` por lotes: con cientos de ids la URL de PostgREST se haría demasiado larga. */
async function porLotes<T>(ids: string[], consulta: (lote: string[]) => PromiseLike<{ data: T[] | null }>, tamano = 100) {
  const unicos = [...new Set(ids)];
  const resultados: T[] = [];
  for (let i = 0; i < unicos.length; i += tamano) {
    const { data } = await consulta(unicos.slice(i, i + tamano));
    resultados.push(...(data ?? []));
  }
  return resultados;
}

export type Serie = Pick<SesionSerieFila, "id" | "numero_serie" | "peso" | "unidad_peso" | "repeticiones" | "rpe" | "completada">;

export type EjercicioDeSesion = {
  id: string;
  ejercicioId: string;
  nombre: string;
  /** Lo que pedía el plan (si el ejercicio viene del plan). */
  prescripcion: { series: number | null; repeticiones: string | null; peso: number | null; unidad: string; rir: number | null; descanso: number | null } | null;
  series: Serie[];
  /** Lo que hizo la última vez que entrenó este ejercicio (series completadas). */
  ultimaVez: { fecha: string; series: Serie[] } | null;
};

const COLUMNAS_SERIE = "id, sesion_ejercicio_id, numero_serie, peso, unidad_peso, repeticiones, rpe, completada";

/** Una sesión lista para registrar: alumno, día del plan, ejercicios con prescripción, series y la referencia anterior. */
export async function cargarSesion(supabase: Supabase, sesionId: string) {
  const { data: sesion } = await supabase
    .from("sesiones")
    .select("id, alumno_id, plan_id, plan_dia_id, programada_para, iniciada_en, completada_en, estado, rpe_sesion, notas")
    .eq("id", sesionId)
    .maybeSingle();
  if (!sesion) return null;

  const [{ data: alumno }, { data: dia }, { data: plan }, { data: ejerciciosSesion }] = await Promise.all([
    supabase.from("alumnos").select("id, nombres, apellidos").eq("id", sesion.alumno_id).maybeSingle(),
    sesion.plan_dia_id ? supabase.from("plan_dias").select("nombre, orden").eq("id", sesion.plan_dia_id).maybeSingle() : Promise.resolve({ data: null }),
    sesion.plan_id ? supabase.from("planes").select("id, nombre").eq("id", sesion.plan_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("sesion_ejercicios").select("id, plan_ejercicio_id, ejercicio_id, orden").eq("sesion_id", sesionId).order("orden"),
  ]);
  const lista = ejerciciosSesion ?? [];
  const ejercicioIds = [...new Set(lista.map((e) => e.ejercicio_id))];
  const prescritosIds = lista.flatMap((e) => (e.plan_ejercicio_id ? [e.plan_ejercicio_id] : []));

  const [nombres, prescritos, series, anteriores] = await Promise.all([
    porLotes(ejercicioIds, (l) => supabase.from("ejercicios").select("id, nombre").in("id", l)),
    porLotes(prescritosIds, (l) =>
      supabase.from("plan_ejercicios").select("id, series, repeticiones, peso, unidad_peso, rir, descanso_segundos").in("id", l),
    ),
    porLotes(
      lista.map((e) => e.id),
      (l) => supabase.from("sesion_series").select(COLUMNAS_SERIE).in("sesion_ejercicio_id", l).order("numero_serie"),
    ),
    ultimaVezPorEjercicio(supabase, sesion.alumno_id, sesionId, ejercicioIds),
  ]);

  const nombreDe = new Map(nombres.map((e) => [e.id, e.nombre]));
  const prescritoDe = new Map(prescritos.map((p) => [p.id, p]));
  const seriesDe = Map.groupBy(series, (s) => s.sesion_ejercicio_id);

  const ejercicios: EjercicioDeSesion[] = lista.map((e) => {
    const p = e.plan_ejercicio_id ? prescritoDe.get(e.plan_ejercicio_id) : undefined;
    return {
      id: e.id,
      ejercicioId: e.ejercicio_id,
      nombre: nombreDe.get(e.ejercicio_id) ?? "Ejercicio no disponible",
      prescripcion: p
        ? { series: p.series, repeticiones: p.repeticiones, peso: p.peso, unidad: p.unidad_peso, rir: p.rir, descanso: p.descanso_segundos }
        : null,
      series: (seriesDe.get(e.id) ?? []).sort((a, b) => a.numero_serie - b.numero_serie),
      ultimaVez: anteriores.get(e.ejercicio_id) ?? null,
    };
  });

  return { sesion, alumno, dia, plan, ejercicios };
}

/** Para cada ejercicio, las series completadas de la sesión más reciente (anterior a esta) en que el alumno lo hizo. */
async function ultimaVezPorEjercicio(supabase: Supabase, alumnoId: string, excluir: string, ejercicioIds: string[]) {
  const resultado = new Map<string, { fecha: string; series: Serie[] }>();
  if (!ejercicioIds.length) return resultado;
  const { data: previas } = await supabase
    .from("sesiones")
    .select("id, completada_en, programada_para")
    .eq("alumno_id", alumnoId)
    .eq("estado", "completada")
    .neq("id", excluir)
    .order("completada_en", { ascending: false, nullsFirst: false })
    .limit(40);
  if (!previas?.length) return resultado;

  const fechaDe = new Map(previas.map((s) => [s.id, s.completada_en ?? s.programada_para ?? ""]));
  const orden = new Map(previas.map((s, i) => [s.id, i]));
  const ejercicios = await porLotes(
    previas.map((s) => s.id),
    (l) => supabase.from("sesion_ejercicios").select("id, sesion_id, ejercicio_id").in("sesion_id", l).in("ejercicio_id", ejercicioIds),
  );
  // La sesión más reciente de cada ejercicio.
  const elegido = new Map<string, (typeof ejercicios)[number]>();
  for (const e of ejercicios.sort((a, b) => (orden.get(a.sesion_id) ?? 0) - (orden.get(b.sesion_id) ?? 0))) {
    if (!elegido.has(e.ejercicio_id)) elegido.set(e.ejercicio_id, e);
  }
  const series = await porLotes(
    [...elegido.values()].map((e) => e.id),
    (l) => supabase.from("sesion_series").select(COLUMNAS_SERIE).in("sesion_ejercicio_id", l).eq("completada", true).order("numero_serie"),
  );
  const seriesDe = Map.groupBy(series, (s) => s.sesion_ejercicio_id);
  for (const [ejercicioId, e] of elegido) {
    const hechas = seriesDe.get(e.id) ?? [];
    if (hechas.length) resultado.set(ejercicioId, { fecha: fechaDe.get(e.sesion_id) ?? "", series: hechas });
  }
  return resultado;
}

const A_KG = 0.45359237;
export const aKg = (peso: number, unidad: string) => (unidad === "lb" ? peso * A_KG : peso);

/** 1RM estimado (Epley). Solo con 1–12 repeticiones: más allá la fórmula deja de ser fiable. */
export const unoRM = (pesoKg: number, reps: number) => (reps >= 1 && reps <= 12 ? (reps === 1 ? pesoKg : pesoKg * (1 + reps / 30)) : null);

export type SesionHecha = {
  id: string;
  fecha: string;
  dia: string | null;
  rpe: number | null;
  /** Por ejercicio: mejor serie, 1RM estimado y volumen (kg × reps de las series completadas). */
  ejercicios: { ejercicioId: string; series: number; mejorPesoKg: number | null; mejorReps: number | null; unoRM: number | null; volumenKg: number }[];
};

/** Sesiones completadas de un alumno (las más recientes primero), con lo hecho en cada ejercicio. */
export async function historialSesiones(supabase: Supabase, alumnoId: string, limite = 100) {
  const { data: sesiones } = await supabase
    .from("sesiones")
    .select("id, plan_dia_id, completada_en, programada_para, rpe_sesion")
    .eq("alumno_id", alumnoId)
    .eq("estado", "completada")
    .order("completada_en", { ascending: false, nullsFirst: false })
    .limit(limite);
  const lista = sesiones ?? [];
  if (!lista.length) return { sesiones: [] as SesionHecha[], nombres: new Map<string, string>() };

  const [dias, ejercicios] = await Promise.all([
    porLotes(
      lista.flatMap((s) => (s.plan_dia_id ? [s.plan_dia_id] : [])),
      (l) => supabase.from("plan_dias").select("id, nombre").in("id", l),
    ),
    porLotes(
      lista.map((s) => s.id),
      (l) => supabase.from("sesion_ejercicios").select("id, sesion_id, ejercicio_id").in("sesion_id", l),
    ),
  ]);
  const [series, nombres] = await Promise.all([
    porLotes(
      ejercicios.map((e) => e.id),
      (l) => supabase.from("sesion_series").select(COLUMNAS_SERIE).in("sesion_ejercicio_id", l).eq("completada", true),
    ),
    porLotes(
      ejercicios.map((e) => e.ejercicio_id),
      (l) => supabase.from("ejercicios").select("id, nombre").in("id", l),
    ),
  ]);

  const diaDe = new Map(dias.map((d) => [d.id, d.nombre]));
  const seriesDe = Map.groupBy(series, (s) => s.sesion_ejercicio_id);
  const ejerciciosDe = Map.groupBy(ejercicios, (e) => e.sesion_id);

  const resultado: SesionHecha[] = lista.map((s) => ({
    id: s.id,
    fecha: s.completada_en ?? s.programada_para ?? "",
    dia: s.plan_dia_id ? (diaDe.get(s.plan_dia_id) ?? null) : null,
    rpe: s.rpe_sesion,
    ejercicios: (ejerciciosDe.get(s.id) ?? []).flatMap((e) => {
      const hechas = seriesDe.get(e.id) ?? [];
      if (!hechas.length) return [];
      let mejorPesoKg: number | null = null;
      let mejorReps: number | null = null;
      let mejor1RM: number | null = null;
      let volumenKg = 0;
      for (const serie of hechas) {
        const kg = serie.peso !== null ? aKg(serie.peso, serie.unidad_peso) : null;
        if (kg !== null && serie.repeticiones) volumenKg += kg * serie.repeticiones;
        if (kg !== null && (mejorPesoKg === null || kg > mejorPesoKg || (kg === mejorPesoKg && (serie.repeticiones ?? 0) > (mejorReps ?? 0)))) {
          mejorPesoKg = kg;
          mejorReps = serie.repeticiones;
        }
        const rm = kg !== null && serie.repeticiones ? unoRM(kg, serie.repeticiones) : null;
        if (rm !== null && (mejor1RM === null || rm > mejor1RM)) mejor1RM = rm;
      }
      return [{ ejercicioId: e.ejercicio_id, series: hechas.length, mejorPesoKg, mejorReps, unoRM: mejor1RM, volumenKg }];
    }),
  }));

  return { sesiones: resultado, nombres: new Map(nombres.map((e) => [e.id, e.nombre])) };
}

export type FilaSesion = {
  id: string;
  alumnoId: string;
  estado: string;
  /** Cuándo ocurre o ocurrió: programada, o si no, iniciada o completada. */
  fecha: string | null;
  rpe: number | null;
  dia: string | null;
  alumno: { id: string; nombres: string; apellidos: string } | null;
};

/** Las sesiones más recientes del espacio (de cualquier alumno y estado), para el índice de Sesiones. */
export async function listarSesiones(supabase: Supabase, limite = 500): Promise<FilaSesion[]> {
  const { data } = await supabase
    .from("sesiones")
    .select("id, alumno_id, plan_dia_id, programada_para, iniciada_en, completada_en, estado, rpe_sesion")
    .order("programada_para", { ascending: false, nullsFirst: false })
    .limit(limite);
  const sesiones = data ?? [];
  const [alumnos, dias] = await Promise.all([
    porLotes(sesiones.map((s) => s.alumno_id), (l) => supabase.from("alumnos").select("id, nombres, apellidos").in("id", l)),
    porLotes(
      sesiones.flatMap((s) => (s.plan_dia_id ? [s.plan_dia_id] : [])),
      (l) => supabase.from("plan_dias").select("id, nombre").in("id", l),
    ),
  ]);
  const alumnoDe = new Map(alumnos.map((a) => [a.id, a]));
  const diaDe = new Map(dias.map((d) => [d.id, d.nombre]));
  return sesiones.map((s) => ({
    id: s.id,
    alumnoId: s.alumno_id,
    estado: s.estado,
    fecha: s.programada_para ?? s.iniciada_en ?? s.completada_en,
    rpe: s.rpe_sesion,
    dia: s.plan_dia_id ? (diaDe.get(s.plan_dia_id) ?? null) : null,
    alumno: alumnoDe.get(s.alumno_id) ?? null,
  }));
}
