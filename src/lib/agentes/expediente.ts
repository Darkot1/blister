import "server-only";
import type { Contexto } from "@/lib/sesion";
import { planesActivos } from "@/lib/entrenamiento/planes";
import { progresoAlumno } from "@/lib/entrenamiento/progreso";
import { partesLocales } from "@/lib/calendario";
import { ETIQUETA_TIPO_OBJETIVO, edad, fechaSinAnio, hora, numero } from "@/lib/formato";

type Supabase = Contexto["supabase"];

/**
 * La rutina activa ejercicio por ejercicio ("Día A: Press banca 4×8 RIR 2 60 kg; …"): sin esto, el
 * agente de Rutinas no puede mejorarla. Null si el plan no tiene ejercicios.
 */
async function detalleRutina(supabase: Supabase, planId: string): Promise<string | null> {
  const { data: dias } = await supabase.from("plan_dias").select("id, nombre, orden").eq("plan_id", planId).order("orden");
  if (!dias?.length) return null;
  const { data: bloques } = await supabase.from("plan_bloques").select("id, plan_dia_id, orden").in("plan_dia_id", dias.map((d) => d.id));
  if (!bloques?.length) return null;
  const { data: ejercicios } = await supabase
    .from("plan_ejercicios")
    .select("plan_bloque_id, ejercicio_id, orden, series, repeticiones, rir, peso, unidad_peso")
    .in("plan_bloque_id", bloques.map((b) => b.id));
  if (!ejercicios?.length) return null;
  const { data: nombres } = await supabase.from("ejercicios").select("id, nombre").in("id", [...new Set(ejercicios.map((e) => e.ejercicio_id))]);
  const nombreDe = new Map((nombres ?? []).map((e) => [e.id, e.nombre]));
  const bloqueDe = new Map(bloques.map((b) => [b.id, b]));

  return dias
    .map((d) => {
      const suyos = ejercicios
        .filter((e) => bloqueDe.get(e.plan_bloque_id)?.plan_dia_id === d.id)
        .sort((a, b) => bloqueDe.get(a.plan_bloque_id)!.orden - bloqueDe.get(b.plan_bloque_id)!.orden || a.orden - b.orden)
        .map((e) => {
          const prescripcion = [
            e.series && e.repeticiones ? `${e.series}×${e.repeticiones}` : e.series ? `${e.series} series` : "",
            e.rir !== null ? `RIR ${numero(e.rir)}` : "",
            e.peso !== null ? `${numero(e.peso)} ${e.unidad_peso}` : "",
          ].filter(Boolean);
          return `${nombreDe.get(e.ejercicio_id) ?? "Ejercicio"}${prescripcion.length ? ` ${prescripcion.join(" ")}` : ""}`;
        });
      return `${d.nombre}: ${suyos.length ? suyos.join("; ") : "sin ejercicios"}`;
    })
    .join(" | ");
}

const signo = (v: number, decimales = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${numero(Math.abs(v), decimales)}`;
const recortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);

/**
 * Lo que los agentes saben de un alumno de la base de datos, en texto, para dárselo al modelo.
 * Sin nombre, apellidos, correo ni teléfono: para el modelo es "el alumno" (los gratuitos no
 * garantizan privacidad). Las notas van tal cual las escribió el entrenador, recortadas.
 * Devuelve el nombre aparte, solo para mostrarlo en la app; null si el alumno no es de tu espacio (RLS).
 */
export async function expedienteAlumno(supabase: Supabase, alumnoId: string): Promise<{ nombre: string; texto: string } | null> {
  const ahora = new Date();
  const hace30 = new Date(ahora.getTime() - 30 * 86_400_000).toISOString();
  const hace90 = new Date(ahora.getTime() - 90 * 86_400_000).toISOString();
  const [datos, { data: ficha }, { data: condiciones }, { data: notas }, { data: citas }, planes, { data: citas90 }] = await Promise.all([
    progresoAlumno(supabase, alumnoId),
    supabase.from("alumnos").select("fecha_nacimiento, fecha_inicio").eq("id", alumnoId).maybeSingle(),
    supabase.from("condiciones_alumno").select("tipo, descripcion, severidad").eq("alumno_id", alumnoId).eq("estado", "activo").limit(10),
    supabase
      .from("notas_alumno")
      .select("contenido, creado_en")
      .eq("alumno_id", alumnoId)
      .is("archivado_en", null)
      .order("creado_en", { ascending: false })
      .limit(5),
    supabase.from("citas").select("estado, inicia_en").eq("alumno_id", alumnoId).gte("inicia_en", hace30).order("inicia_en"),
    planesActivos(supabase, [alumnoId]),
    supabase.from("citas").select("estado, inicia_en").eq("alumno_id", alumnoId).gte("inicia_en", hace90).lte("inicia_en", ahora.toISOString()),
  ]);
  if (!datos) return null;

  const lineas: string[] = [];
  const anos = edad(ficha?.fecha_nacimiento ?? null);
  lineas.push(`- General: ${anos !== null ? `${anos} años` : "edad sin registrar"}${ficha?.fecha_inicio ? `; entrena desde el ${fechaSinAnio(ficha.fecha_inicio)}` : ""}.`);

  const o = datos.objetivo;
  lineas.push(
    o
      ? `- Objetivo principal: ${o.nombre} (${ETIQUETA_TIPO_OBJETIVO[o.tipo] ?? o.tipo})${o.valor_meta !== null ? `, meta ${numero(o.valor_meta)} ${o.unidad ?? ""}`.trimEnd() : ""}${o.fecha_meta ? ` para el ${fechaSinAnio(o.fecha_meta)}` : ""}.`
      : "- Objetivo principal: sin definir.",
  );

  lineas.push(
    condiciones?.length
      ? `- Lesiones, dolores o limitaciones activas: ${condiciones.map((c) => `${c.descripcion} (${c.tipo}${c.severidad ? `, ${c.severidad}` : ""})`).join("; ")}.`
      : "- Lesiones, dolores o limitaciones activas: ninguna registrada.",
  );

  const plan = planes.get(alumnoId);
  if (plan) {
    const detalle = await detalleRutina(supabase, plan.id);
    lineas.push(`- Rutina activa: «${plan.nombre}», ${plan.dias.length} días.${detalle ? ` Ejercicios: ${detalle}` : ` Días: ${plan.dias.map((d) => d.nombre).join(", ")}.`}`);
  } else lineas.push("- Rutina activa: ninguna.");

  const [pesoIni, pesoAct] = [datos.peso[0], datos.peso.at(-1)];
  if (pesoAct) {
    const cambio = pesoIni && datos.peso.length > 1 ? `; ${signo(pesoAct.valor - pesoIni.valor)} kg desde el ${fechaSinAnio(pesoIni.fecha)}` : "";
    lineas.push(`- Peso: ${numero(pesoAct.valor)} kg (medido el ${fechaSinAnio(pesoAct.fecha)})${cambio}.`);
  } else lineas.push("- Peso: sin mediciones.");
  const grasa = datos.grasa.at(-1);
  if (grasa) lineas.push(`- Grasa corporal: ${numero(grasa.valor)} %${datos.grasa.length > 1 ? ` (${signo(grasa.valor - datos.grasa[0].valor)} puntos desde el inicio)` : ""}.`);
  const medidas = datos.medidas.filter((m) => m.mediciones > 1);
  if (medidas.length) lineas.push(`- Medidas: ${medidas.map((m) => `${m.etiqueta} ${numero(m.actual)} cm (${signo(m.actual - m.inicial)})`).join(", ")}.`);

  const a = datos.asistencia90;
  lineas.push(`- Asistencia 90 días: ${a.porcentaje === null ? "sin citas resueltas" : `${a.porcentaje} % (${a.hechas} hechas, ${a.faltas} faltas)`}.`);
  const semanas = datos.semanas.slice(-6).map((s) => s.valor);
  lineas.push(`- Sesiones por semana (últimas 6, la última es la actual): ${semanas.join(", ")}.`);
  const recientes = (citas ?? []).filter((c) => new Date(c.inicia_en) <= ahora);
  const canceladas = recientes.filter((c) => c.estado === "cancelada" || c.estado === "no_asistio").length;
  const proxima = (citas ?? []).find((c) => new Date(c.inicia_en) > ahora && (c.estado === "programada" || c.estado === "confirmada"));
  lineas.push(
    `- Citas últimos 30 días: ${recientes.length} (${canceladas} canceladas o sin asistir).${proxima ? ` Próxima: ${fechaSinAnio(proxima.inicia_en)}.` : " Sin próxima cita agendada."}`,
  );

  const ultimas = datos.sesiones.slice(0, 4);
  if (ultimas.length) {
    lineas.push(
      `- Últimas sesiones: ${ultimas.map((s) => `${fechaSinAnio(s.fecha)} ${s.dia ?? "sesión libre"}${s.rpe !== null ? ` (RPE ${numero(s.rpe)})` : ""}`).join("; ")}.`,
    );
  } else lineas.push("- Últimas sesiones: ninguna registrada.");

  const ejercicios = datos.ejercicios.filter((e) => e.unoRMActual !== null).slice(0, 6);
  if (ejercicios.length) {
    lineas.push(
      `- Rendimiento (1RM estimado): ${ejercicios
        .map(
          (e) =>
            `${e.nombre} ${numero(e.unoRMActual)} kg${e.unoRMInicial !== null && e.serie.length > 1 ? ` (${signo(((e.unoRMActual! - e.unoRMInicial) / e.unoRMInicial) * 100, 0)} %)` : ""}, mejor serie reciente ${e.ultimaMejor.pesoKg !== null ? `${numero(e.ultimaMejor.pesoKg)} kg × ${e.ultimaMejor.reps ?? "—"}` : "—"}`,
        )
        .join("; ")}.`,
    );
  }

  // Cargas recientes: la mejor serie de cada ejercicio en sus últimas 3 sesiones (de la más reciente atrás).
  const nombreEjercicio = new Map(datos.ejercicios.map((e) => [e.ejercicioId, e.nombre]));
  const porEjercicio = new Map<string, string[]>();
  for (const s of datos.sesiones.slice(0, 3)) {
    for (const e of s.ejercicios) {
      if (e.mejorPesoKg === null) continue;
      const lista = porEjercicio.get(e.ejercicioId) ?? [];
      lista.push(`${fechaSinAnio(s.fecha)} ${numero(e.mejorPesoKg)} kg × ${e.mejorReps ?? "—"} (${e.series} series)`);
      porEjercicio.set(e.ejercicioId, lista);
    }
  }
  if (porEjercicio.size) {
    lineas.push(
      `- Cargas recientes (mejor serie por sesión): ${[...porEjercicio]
        .slice(0, 8)
        .map(([id, sesiones]) => `${nombreEjercicio.get(id) ?? "Ejercicio"}: ${sesiones.join(", ")}`)
        .join("; ")}.`,
    );
  }

  // Horarios: cuándo suele venir y cuándo falta (citas de los últimos 90 días, hora de Bogotá).
  const diaSemana = (instante: string) => new Intl.DateTimeFormat("es-CO", { weekday: "long", timeZone: "America/Bogota" }).format(new Date(instante));
  const franja = (instante: string) => `${diaSemana(instante)} ${hora(instante)}`;
  const contar = (lista: string[]) =>
    [...lista.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const hechas = (citas90 ?? []).filter((c) => c.estado === "completada").map((c) => franja(c.inicia_en));
  const fallidas = (citas90 ?? []).filter((c) => c.estado === "no_asistio" || c.estado === "cancelada").map((c) => franja(c.inicia_en));
  if (hechas.length || fallidas.length) {
    const texto = (lista: [string, number][]) => lista.map(([f, n]) => `${f}${n > 1 ? ` (${n})` : ""}`).join(", ");
    lineas.push(
      `- Horarios (90 días): ${hechas.length ? `viene ${texto(contar(hechas))}` : "sin citas hechas"}${fallidas.length ? `; falta o cancela ${texto(contar(fallidas))}` : ""}. Hoy es ${fechaSinAnio(partesLocales(ahora.toISOString()).fecha)}.`,
    );
  }

  if (notas?.length) {
    lineas.push(`- Notas recientes del entrenador: ${notas.map((n) => `(${fechaSinAnio(n.creado_en)}) ${recortar(n.contenido.replace(/\s+/g, " "), 220)}`).join(" | ")}`);
  }

  return { nombre: `${datos.alumno.nombres} ${datos.alumno.apellidos}`.trim(), texto: lineas.join("\n") };
}
