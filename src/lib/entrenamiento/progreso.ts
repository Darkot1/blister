import "server-only";
import type { Contexto } from "@/lib/sesion";
import { inicioSemana, partesLocales, sumarDias } from "@/lib/calendario";
import { historialSesiones, type SesionHecha } from "./sesiones";

type Supabase = Contexto["supabase"];

const DIA_MS = 24 * 60 * 60 * 1000;

async function porLotes<T>(ids: string[], consulta: (lote: string[]) => PromiseLike<{ data: T[] | null }>, tamano = 100) {
  const unicos = [...new Set(ids)];
  const resultados: T[] = [];
  for (let i = 0; i < unicos.length; i += tamano) resultados.push(...((await consulta(unicos.slice(i, i + tamano))).data ?? []));
  return resultados;
}

/** Asistencia: de las citas ya resueltas, cuántas se hicieron. null si no hay ninguna resuelta. */
const tasa = (hechas: number, faltas: number) => (hechas + faltas ? Math.round((hechas / (hechas + faltas)) * 100) : null);

export type FilaResumen = {
  id: string;
  nombre: string;
  nombres: string;
  apellidos: string;
  pesoActual: number | null;
  /** Cambio de peso desde la primera medición. */
  cambioPeso: number | null;
  ultimaMedicion: string | null;
  diasSinMedir: number | null;
  sesiones30: number;
  ultimaSesion: string | null;
  asistencia30: number | null;
};

/** Una fila por alumno activo: lo que el entrenador mira para decidir a quién atender. */
export async function resumenAlumnos(supabase: Supabase): Promise<FilaResumen[]> {
  const { data: alumnos } = await supabase.from("alumnos").select("id, nombres, apellidos").eq("estado", "activo").order("nombres").limit(1000);
  const lista = alumnos ?? [];
  if (!lista.length) return [];
  const ids = lista.map((a) => a.id);
  const ahora = Date.now();
  const hace30 = new Date(ahora - 30 * DIA_MS).toISOString();

  const [mediciones, sesiones, citas] = await Promise.all([
    porLotes(ids, (l) =>
      supabase.from("mediciones").select("alumno_id, medido_en, peso_kg").in("alumno_id", l).not("peso_kg", "is", null).order("medido_en"),
    ),
    porLotes(ids, (l) =>
      supabase.from("sesiones").select("alumno_id, completada_en").in("alumno_id", l).eq("estado", "completada").order("completada_en"),
    ),
    porLotes(ids, (l) =>
      supabase.from("citas").select("alumno_id, estado").in("alumno_id", l).in("estado", ["completada", "no_asistio"]).gte("inicia_en", hace30).lte("inicia_en", new Date(ahora).toISOString()),
    ),
  ]);
  const medicionesDe = Map.groupBy(mediciones, (m) => m.alumno_id);
  const sesionesDe = Map.groupBy(sesiones, (s) => s.alumno_id);
  const citasDe = Map.groupBy(citas, (c) => c.alumno_id);

  return lista.map((a) => {
    const m = medicionesDe.get(a.id) ?? [];
    const s = sesionesDe.get(a.id) ?? [];
    const c = citasDe.get(a.id) ?? [];
    const ultima = m.at(-1);
    return {
      id: a.id,
      nombre: `${a.nombres} ${a.apellidos}`,
      nombres: a.nombres,
      apellidos: a.apellidos,
      pesoActual: ultima?.peso_kg ?? null,
      cambioPeso: m.length > 1 ? ultima!.peso_kg! - m[0].peso_kg! : null,
      ultimaMedicion: ultima?.medido_en ?? null,
      diasSinMedir: ultima ? Math.floor((ahora - new Date(ultima.medido_en).getTime()) / DIA_MS) : null,
      sesiones30: s.filter((x) => x.completada_en && x.completada_en >= hace30).length,
      ultimaSesion: s.at(-1)?.completada_en ?? null,
      asistencia30: tasa(c.filter((x) => x.estado === "completada").length, c.filter((x) => x.estado === "no_asistio").length),
    };
  });
}

export type EjercicioProgreso = {
  ejercicioId: string;
  nombre: string;
  sesiones: number;
  primeraFecha: string;
  ultimaFecha: string;
  /** 1RM estimado de la primera y la última sesión con dato (kg). */
  unoRMInicial: number | null;
  unoRMActual: number | null;
  /** Mejor serie de la última sesión. */
  ultimaMejor: { pesoKg: number | null; reps: number | null };
  /** Para la gráfica: 1RM estimado por sesión. */
  serie: { fecha: string; valor: number; nota: string }[];
};

export const MEDIDAS = [
  ["cintura_cm", "Cintura"],
  ["cadera_cm", "Cadera"],
  ["pecho_cm", "Pecho"],
  ["brazo_der_cm", "Brazo derecho"],
  ["brazo_izq_cm", "Brazo izquierdo"],
  ["muslo_der_cm", "Muslo derecho"],
  ["muslo_izq_cm", "Muslo izquierdo"],
] as const;

/** Todo el progreso de un alumno. */
export async function progresoAlumno(supabase: Supabase, alumnoId: string) {
  const ahora = Date.now();
  const hace90 = new Date(ahora - 90 * DIA_MS).toISOString();
  const [{ data: alumno }, { data: mediciones }, { data: objetivo }, { data: citas }, historial] = await Promise.all([
    supabase.from("alumnos").select("id, nombres, apellidos, estado").eq("id", alumnoId).maybeSingle(),
    supabase.from("mediciones").select("*").eq("alumno_id", alumnoId).order("medido_en").limit(500),
    supabase
      .from("objetivos_alumno")
      .select("nombre, tipo, valor_meta, unidad, fecha_meta")
      .eq("alumno_id", alumnoId)
      .eq("es_principal", true)
      .eq("estado", "activo")
      .maybeSingle(),
    supabase
      .from("citas")
      .select("estado")
      .eq("alumno_id", alumnoId)
      .in("estado", ["completada", "no_asistio"])
      .gte("inicia_en", hace90)
      .lte("inicia_en", new Date(ahora).toISOString()),
    historialSesiones(supabase, alumnoId, 200),
  ]);
  if (!alumno) return null;

  const m = mediciones ?? [];
  const conPeso = m.filter((x) => x.peso_kg !== null);
  const conGrasa = m.filter((x) => x.grasa_corporal_pct !== null);
  const medidas = MEDIDAS.flatMap(([clave, etiqueta]) => {
    const con = m.filter((x) => x[clave] !== null);
    if (!con.length) return [];
    return [{ clave, etiqueta, inicial: con[0][clave] as number, actual: con.at(-1)![clave] as number, desde: con[0].medido_en, mediciones: con.length }];
  });

  const hechas = (citas ?? []).filter((c) => c.estado === "completada").length;
  const faltas = (citas ?? []).filter((c) => c.estado === "no_asistio").length;

  return {
    alumno,
    objetivo,
    peso: conPeso.map((x) => ({ fecha: x.medido_en, valor: Number(x.peso_kg) })),
    grasa: conGrasa.map((x) => ({ fecha: x.medido_en, valor: Number(x.grasa_corporal_pct) })),
    medidas,
    ultimaMedicion: m.at(-1)?.medido_en ?? null,
    asistencia90: { porcentaje: tasa(hechas, faltas), hechas, faltas },
    sesiones: historial.sesiones,
    semanas: sesionesPorSemana(historial.sesiones, 12),
    ejercicios: progresoPorEjercicio(historial.sesiones, historial.nombres),
  };
}

/** Sesiones completadas en cada una de las últimas N semanas (lunes a domingo, Bogotá), de la más antigua a la actual. */
function sesionesPorSemana(sesiones: SesionHecha[], semanas: number) {
  const esta = inicioSemana(partesLocales(new Date().toISOString()).fecha);
  const inicios = Array.from({ length: semanas }, (_, i) => sumarDias(esta, -7 * (semanas - 1 - i)));
  const cuenta = new Map(inicios.map((d) => [d, 0]));
  for (const s of sesiones) {
    if (!s.fecha) continue;
    const lunes = inicioSemana(partesLocales(s.fecha).fecha);
    if (cuenta.has(lunes)) cuenta.set(lunes, cuenta.get(lunes)! + 1);
  }
  return inicios.map((lunes) => ({ lunes, valor: cuenta.get(lunes)! }));
}

/** Por ejercicio: cuántas veces se entrenó y cómo evolucionó su 1RM estimado. Los más entrenados primero. */
function progresoPorEjercicio(sesiones: SesionHecha[], nombres: Map<string, string>): EjercicioProgreso[] {
  const porEjercicio = new Map<string, { fecha: string; e: SesionHecha["ejercicios"][number] }[]>();
  // Del más antiguo al más reciente.
  for (const s of [...sesiones].reverse()) {
    for (const e of s.ejercicios) {
      const lista = porEjercicio.get(e.ejercicioId) ?? [];
      lista.push({ fecha: s.fecha, e });
      porEjercicio.set(e.ejercicioId, lista);
    }
  }
  return [...porEjercicio]
    .map(([ejercicioId, registros]) => {
      const conRM = registros.filter((r) => r.e.unoRM !== null);
      const ultimo = registros.at(-1)!;
      return {
        ejercicioId,
        nombre: nombres.get(ejercicioId) ?? "Ejercicio",
        sesiones: registros.length,
        primeraFecha: registros[0].fecha,
        ultimaFecha: ultimo.fecha,
        unoRMInicial: conRM[0]?.e.unoRM ?? null,
        unoRMActual: conRM.at(-1)?.e.unoRM ?? null,
        ultimaMejor: { pesoKg: ultimo.e.mejorPesoKg, reps: ultimo.e.mejorReps },
        serie: conRM.map((r) => ({
          fecha: r.fecha,
          valor: Math.round(r.e.unoRM! * 10) / 10,
          nota: r.e.mejorPesoKg !== null ? `Mejor serie: ${Math.round(r.e.mejorPesoKg * 10) / 10} kg × ${r.e.mejorReps ?? "—"}` : "",
        })),
      };
    })
    .sort((a, b) => b.sesiones - a.sesiones || b.ultimaFecha.localeCompare(a.ultimaFecha));
}
