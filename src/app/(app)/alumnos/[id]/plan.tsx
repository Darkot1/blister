import Link from "next/link";
import { ArrowUpRight, CalendarPlus, ListChecks } from "lucide-react";
import { MiniaturaMusculos } from "@/components/anatomia/miniatura-musculos";
import type { RolMuscular } from "@/components/anatomia/mapa-corporal";
import { EnlaceBoton } from "@/components/ui/boton";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { hoyLocal, partesLocales } from "@/lib/calendario";
import { cargarPlan } from "@/lib/entrenamiento/cargar";
import { diasDeSesiones } from "@/lib/entrenamiento/planes";
import { minutosEstimados } from "@/lib/entrenamiento/prescripcion";
import { ETIQUETA_TIPO_OBJETIVO, fechaCorta, fechaSinAnio, hora } from "@/lib/formato";
import type { Contexto } from "@/lib/sesion";
import { asignarRutinaAlumno } from "../../entrenamiento/acciones";
import { InsigniaPlan } from "../../entrenamiento/componentes";
import { AsignarRutinaAlumno } from "./asignar-rutina";

const PRIORIDAD: Record<RolMuscular, number> = { principal: 3, secundario: 2, estabilizador: 1 };

/** Plan de entrenamiento del alumno: el activo con sus días, la próxima sesión y los anteriores. */
export async function PlanAlumno({
  supabase,
  alumnoId,
  nombre,
  archivado,
}: {
  supabase: Contexto["supabase"];
  alumnoId: string;
  nombre: string;
  archivado: boolean;
}) {
  const ahora = new Date().toISOString();
  const [{ data: planes }, { data: rutinas }, { data: citas }] = await Promise.all([
    supabase
      .from("planes")
      .select("id, nombre, estado, fecha_inicio, tipo_objetivo")
      .eq("alumno_id", alumnoId)
      .neq("estado", "archivado")
      .order("creado_en", { ascending: false })
      .limit(10),
    supabase.from("plantillas").select("id, nombre, tipo_objetivo").eq("estado", "activo").order("nombre"),
    supabase
      .from("citas")
      .select("id, inicia_en, sesion_id")
      .eq("alumno_id", alumnoId)
      .eq("tipo", "entrenamiento")
      .in("estado", ["programada", "confirmada"])
      .gte("inicia_en", ahora)
      .order("inicia_en")
      .limit(1),
  ]);

  const activo = planes?.find((p) => p.estado === "activo") ?? null;
  const otros = (planes ?? []).filter((p) => p.id !== activo?.id);
  const detalle = activo ? await cargarPlan(supabase, activo.id) : null;
  const proxima = citas?.[0] ?? null;
  const diaProxima = proxima?.sesion_id ? (await diasDeSesiones(supabase, [proxima.sesion_id])).get(proxima.sesion_id) : undefined;

  // Músculos de cada día, para la miniatura.
  const ejercicioIds = [...new Set(detalle?.dias.flatMap((d) => d.bloques.flatMap((b) => b.ejercicios.map((e) => e.ejercicio_id))) ?? [])];
  const [{ data: relaciones }, { data: musculos }] = ejercicioIds.length
    ? await Promise.all([
        supabase.from("ejercicios_musculos").select("ejercicio_id, musculo_id, rol").in("ejercicio_id", ejercicioIds),
        supabase.from("musculos").select("id, slug"),
      ])
    : [{ data: [] }, { data: [] }];
  const slugDe = new Map((musculos ?? []).map((m) => [m.id, m.slug]));
  const relacionesDe = Map.groupBy(relaciones ?? [], (r) => r.ejercicio_id);

  const accion = asignarRutinaAlumno.bind(null, alumnoId);
  const opciones = (rutinas ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    detalle: r.tipo_objetivo ? ETIQUETA_TIPO_OBJETIVO[r.tipo_objetivo] : "Sin objetivo",
  }));
  const hoy = hoyLocal();

  return (
    <Tarjeta className="mb-4 overflow-hidden">
      <section aria-labelledby="titulo-plan">
        <CabeceraTarjeta
          id="titulo-plan"
          titulo="Plan de entrenamiento"
          accion={!archivado && <AsignarRutinaAlumno accion={accion} rutinas={opciones} hoy={hoy} planActivo={activo?.nombre ?? null} />}
        />

        {activo && detalle ? (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link href={`/entrenamiento/planes/${activo.id}`} className="inline-flex items-center gap-1 text-lg font-semibold tracking-tight hover:underline">
                {activo.nombre}
                <ArrowUpRight aria-hidden className="size-4 text-tenue" />
              </Link>
              <InsigniaPlan estado={activo.estado} />
              <span className="text-sm text-tenue">
                {activo.tipo_objetivo ? `${ETIQUETA_TIPO_OBJETIVO[activo.tipo_objetivo]} · ` : ""}desde el {fechaCorta(activo.fecha_inicio)}
              </span>
            </div>

            <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {detalle.dias.map((dia, i) => {
                const ejercicios = dia.bloques.flatMap((b) => b.ejercicios);
                const resaltados: Record<string, RolMuscular> = {};
                for (const e of ejercicios) {
                  for (const r of relacionesDe.get(e.ejercicio_id) ?? []) {
                    const slug = slugDe.get(r.musculo_id);
                    const rol = r.rol as RolMuscular;
                    if (slug && (!resaltados[slug] || PRIORIDAD[rol] > PRIORIDAD[resaltados[slug]])) resaltados[slug] = rol;
                  }
                }
                const toca = diaProxima?.dia === dia.nombre && diaProxima.orden === i + 1;
                return (
                  <li
                    key={dia.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${toca ? "border-tinta/50 bg-tinta/[0.03]" : "border-linea"}`}
                  >
                    <MiniaturaMusculos resaltados={resaltados} className="h-14 w-12" />
                    <div className="min-w-0">
                      <p className="etiqueta">
                        Día {i + 1}
                        {toca && " · próxima"}
                      </p>
                      <p className="truncate text-sm font-semibold">{dia.nombre}</p>
                      <p className="font-mono text-xs text-tenue">
                        {ejercicios.length} ejercicios{ejercicios.length > 0 && ` · ≈${minutosEstimados(dia.bloques)} min`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-fondo/60 px-3 py-2.5 text-sm">
              {proxima ? (
                <p>
                  <span className="text-tenue">Próxima sesión: </span>
                  <span className="font-medium">
                    {fechaSinAnio(partesLocales(proxima.inicia_en).fecha)}, {hora(proxima.inicia_en)}
                  </span>
                  <span className="text-tenue"> · {diaProxima ? `${diaProxima.dia}` : "día del plan sin elegir"}</span>
                </p>
              ) : (
                <p className="text-tenue">No tiene sesiones agendadas.</p>
              )}
              {!archivado && (
                <EnlaceBoton href={`/calendario?alumno=${alumnoId}`} variante="fantasma" className="h-8">
                  <CalendarPlus aria-hidden className="size-4" /> Agendar
                </EnlaceBoton>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 p-4">
            <span aria-hidden className="grid size-10 place-items-center rounded-lg border border-linea text-tenue">
              <ListChecks className="size-5" />
            </span>
            <p className="min-w-48 flex-1 text-sm text-tenue">
              {nombre} no tiene un plan activo. Asígnale una de tus rutinas para saber qué entrena en cada sesión.
            </p>
          </div>
        )}

        {otros.length > 0 && (
          <details className="border-t border-linea">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-tenue hover:text-tinta">
              Otros planes · {otros.length}
            </summary>
            <ul className="divide-y divide-linea border-t border-linea">
              {otros.map((p) => (
                <li key={p.id}>
                  <Link href={`/entrenamiento/planes/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-fondo/60">
                    <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
                    <span className="font-mono text-xs text-tenue">{fechaCorta(p.fecha_inicio)}</span>
                    <InsigniaPlan estado={p.estado} />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </Tarjeta>
  );
}
