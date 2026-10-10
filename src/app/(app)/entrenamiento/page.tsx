import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, ClipboardList, ListChecks, Plus } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { CabeceraTarjeta, Lista, Tarjeta, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { ETIQUETA_TIPO_OBJETIVO, fechaCorta } from "@/lib/formato";
import { obtenerContexto } from "@/lib/sesion";
import { InsigniaPlan } from "./componentes";

export const metadata: Metadata = { title: "Rutinas y planes" };

type Busqueda = PageProps<"/entrenamiento">["searchParams"];

export default function PaginaEntrenamiento({ searchParams }: PageProps<"/entrenamiento">) {
  return (
    <>
      <Encabezado
        titulo="Rutinas y planes"
        miga="Entrenamiento"
        descripcion="Arma una rutina una vez y asígnala a los alumnos que la necesiten."
        acciones={
          <EnlaceBoton href="/entrenamiento/rutinas/nueva">
            <Plus aria-hidden className="size-4" /> Nueva rutina
          </EnlaceBoton>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Suspense fallback={<CargandoRutinas />}>
          <Rutinas searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<EsqueletoLista filas={5} />}>
          <Planes />
        </Suspense>
      </div>
    </>
  );
}

function CargandoRutinas() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Esqueleto key={i} className="h-32" />
      ))}
    </div>
  );
}

async function Rutinas({ searchParams }: { searchParams: Busqueda }) {
  const parametros = await searchParams;
  const archivadas = parametros.ver === "archivadas";
  const { supabase } = await obtenerContexto();

  const { data: rutinas, error } = await supabase
    .from("plantillas")
    .select("id, nombre, tipo_objetivo, actualizado_en")
    .eq("estado", archivadas ? "archivado" : "activo")
    .order("actualizado_en", { ascending: false });
  const ids = (rutinas ?? []).map((r) => r.id);
  const [{ data: dias }, { data: asignaciones }] = ids.length
    ? await Promise.all([
        supabase.from("plantilla_dias").select("plantilla_id, nombre").in("plantilla_id", ids).order("orden"),
        supabase.from("planes").select("plantilla_origen_id, alumno_id").in("plantilla_origen_id", ids).in("estado", ["activo", "borrador"]),
      ])
    : [{ data: [] }, { data: [] }];

  const diasDe = Map.groupBy(dias ?? [], (d) => d.plantilla_id);
  const alumnosDe = new Map<string, Set<string>>();
  for (const a of asignaciones ?? []) {
    if (!a.plantilla_origen_id) continue;
    alumnosDe.set(a.plantilla_origen_id, (alumnosDe.get(a.plantilla_origen_id) ?? new Set()).add(a.alumno_id));
  }

  return (
    <section aria-labelledby="titulo-rutinas" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-rutinas" className="etiqueta">
          Rutinas · {ids.length}
        </h2>
        <nav aria-label="Filtrar rutinas" className={claseSegmentado}>
          <Link href="/entrenamiento" scroll={false} aria-current={!archivadas ? "true" : undefined} className={`${claseSegmento(!archivadas)} inline-flex items-center`}>
            Activas
          </Link>
          <Link
            href="/entrenamiento?ver=archivadas"
            scroll={false}
            aria-current={archivadas ? "true" : undefined}
            className={`${claseSegmento(archivadas)} inline-flex items-center`}
          >
            Archivadas
          </Link>
        </nav>
      </div>

      {error ? (
        <p className="text-peligro">No se pudieron cargar las rutinas. Recarga la página.</p>
      ) : !ids.length ? (
        archivadas ? (
          <Vacio icono={<ListChecks aria-hidden className="size-5" />} titulo="No hay rutinas archivadas" texto="Las rutinas que archives aparecerán aquí y podrás restaurarlas." />
        ) : (
          <Vacio
            icono={<ListChecks aria-hidden className="size-5" />}
            titulo="Aún no tienes rutinas"
            texto="Elige ejercicios por nombre o por músculo, ajusta series y repeticiones, y guárdala para asignarla a tus alumnos."
            accion={
              <EnlaceBoton href="/entrenamiento/rutinas/nueva">
                <Plus aria-hidden className="size-4" /> Crear la primera rutina
              </EnlaceBoton>
            }
          />
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(rutinas ?? []).map((r) => {
            const susDias = diasDe.get(r.id) ?? [];
            const alumnos = alumnosDe.get(r.id)?.size ?? 0;
            return (
              <li key={r.id}>
                <Link
                  href={`/entrenamiento/rutinas/${r.id}`}
                  className="group flex h-full flex-col rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 transition-colors hover:border-tinta/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold tracking-tight group-hover:underline">{r.nombre}</p>
                    <ChevronRight aria-hidden className="mt-0.5 size-4 shrink-0 text-tenue" />
                  </div>
                  <p className="mt-1 text-sm text-tenue">
                    {r.tipo_objetivo ? ETIQUETA_TIPO_OBJETIVO[r.tipo_objetivo] : "Sin objetivo"} · {susDias.length}{" "}
                    {susDias.length === 1 ? "día" : "días"}
                  </p>
                  {susDias.length > 0 && (
                    <p className="mt-2 line-clamp-2 text-sm">{susDias.map((d) => d.nombre).join(" · ")}</p>
                  )}
                  <p className="mt-auto flex flex-wrap justify-between gap-2 pt-3 font-mono text-xs text-tenue">
                    <span>{alumnos ? `${alumnos} ${alumnos === 1 ? "alumno" : "alumnos"} con plan` : "Sin asignar"}</span>
                    <span>{fechaCorta(r.actualizado_en)}</span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Planes en curso: los activos y los asignados que aún no se activan. */
async function Planes() {
  const { supabase } = await obtenerContexto();
  const { data: planes } = await supabase
    .from("planes")
    .select("id, nombre, alumno_id, estado, fecha_inicio")
    .in("estado", ["activo", "borrador"])
    .order("estado")
    .order("fecha_inicio", { ascending: false })
    .limit(30);
  const alumnoIds = [...new Set((planes ?? []).map((p) => p.alumno_id))];
  const { data: alumnos } = alumnoIds.length
    ? await supabase.from("alumnos").select("id, nombres, apellidos").in("id", alumnoIds)
    : { data: [] };
  const alumnoDe = new Map((alumnos ?? []).map((a) => [a.id, a]));

  return (
    <section aria-labelledby="titulo-planes" className="lg:sticky lg:top-6">
      <Tarjeta className="overflow-hidden">
        <CabeceraTarjeta id="titulo-planes" titulo={`Planes en curso · ${planes?.length ?? 0}`} />
        {!planes?.length ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <ClipboardList aria-hidden className="mb-2 size-5 text-tenue" />
            <p className="text-sm text-tenue">Abre una rutina y usa «Asignar a alumno» para crear su plan.</p>
          </div>
        ) : (
          <Lista>
            {planes.map((p) => {
              const alumno = alumnoDe.get(p.alumno_id);
              return (
                <li key={p.id}>
                  <Link href={`/entrenamiento/planes/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-fondo/60">
                    {alumno && <Avatar id={alumno.id} nombres={alumno.nombres} apellidos={alumno.apellidos} tamano="sm" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {alumno ? `${alumno.nombres} ${alumno.apellidos}` : "Alumno"}
                      </span>
                      <span className="block truncate text-xs text-tenue">
                        {p.nombre} · desde {fechaCorta(p.fecha_inicio)}
                      </span>
                    </span>
                    <InsigniaPlan estado={p.estado} />
                  </Link>
                </li>
              );
            })}
          </Lista>
        )}
      </Tarjeta>
    </section>
  );
}
