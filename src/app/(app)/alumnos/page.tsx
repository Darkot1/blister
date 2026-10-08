import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { seccion } from "@/components/app/secciones";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { IconoApp } from "@/components/ui/icono-app";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { ListaAgrupada, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { edad, fechaCorta } from "@/lib/formato";

export const metadata: Metadata = { title: "Alumnos" };

type Busqueda = PageProps<"/alumnos">["searchParams"];

export default function PaginaAlumnos({ searchParams }: PageProps<"/alumnos">) {
  return (
    <>
      <Encabezado
        titulo="Alumnos"
        acciones={
          <EnlaceBoton href="/alumnos/nuevo">
            <Plus aria-hidden className="size-4" /> Nuevo alumno
          </EnlaceBoton>
        }
      />
      <Suspense fallback={<EsqueletoLista />}>
        <ListaAlumnos searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const FILTROS = [
  { valor: "activo", texto: "Activos" },
  { valor: "inactivo", texto: "Inactivos" },
  { valor: "archivado", texto: "Archivados" },
  { valor: "todos", texto: "Todos" },
];

async function ListaAlumnos({ searchParams }: { searchParams: Busqueda }) {
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const estado = typeof parametros.estado === "string" ? parametros.estado : "activo";

  const { supabase } = await obtenerContexto();
  let consulta = supabase
    .from("alumnos")
    .select("id, nombres, apellidos, fecha_nacimiento, telefono, fecha_inicio, estado")
    .order("apellidos")
    .order("nombres")
    .limit(200);
  if (estado !== "todos") consulta = consulta.eq("estado", estado);
  if (q) {
    const patron = `%${q.replace(/[%_,()]/g, " ")}%`;
    consulta = consulta.or(`nombres.ilike.${patron},apellidos.ilike.${patron},telefono.ilike.${patron}`);
  }
  const { data: alumnos, error } = await consulta;

  return (
    <>
      <Form action="/alumnos" className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1 sm:max-w-sm">
          <span className="sr-only">Buscar alumno</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-tenue" />
          <input name="q" type="search" defaultValue={q} placeholder="Buscar por nombre o teléfono" className={`${claseControl} h-11 pl-10`} />
        </label>
        <div role="group" aria-label="Filtrar por estado" className={`${claseSegmentado} max-w-full overflow-x-auto`}>
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="submit"
              name="estado"
              value={f.valor}
              aria-pressed={estado === f.valor}
              className={claseSegmento(estado === f.valor)}
            >
              {f.texto}
            </button>
          ))}
        </div>
      </Form>

      {error ? (
        <p className="text-peligro">No se pudieron cargar los alumnos. Recarga la página.</p>
      ) : !alumnos?.length ? (
        <SinResultados hayFiltro={Boolean(q) || estado !== "activo"} />
      ) : (
        <>
          <ListaAgrupada sangria="4.5rem">
            {alumnos.map((a) => {
              const anios = edad(a.fecha_nacimiento);
              return (
                <li key={a.id}>
                  <Link
                    href={`/alumnos/${a.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tinta/[0.03]"
                  >
                    <Avatar id={a.id} nombres={a.nombres} apellidos={a.apellidos} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.nombres} {a.apellidos}</span>
                      <span className="block truncate text-sm text-tenue">
                        {[anios !== null ? `${anios} años` : null, a.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-sm text-tenue md:block">Desde {fechaCorta(a.fecha_inicio)}</span>
                    <InsigniaEstado estado={a.estado} />
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-tinta/25" />
                  </Link>
                </li>
              );
            })}
          </ListaAgrupada>
          <p className="mt-3 px-1 text-sm text-tenue">
            {alumnos.length === 1 ? "1 alumno" : `${alumnos.length} alumnos`}
          </p>
        </>
      )}
    </>
  );
}

function SinResultados({ hayFiltro }: { hayFiltro: boolean }) {
  const app = seccion("/alumnos");
  return hayFiltro ? (
    <Vacio
      icono={<Search aria-hidden className="size-8 text-tinta/25" />}
      titulo="Ningún alumno coincide"
      texto="Prueba con otro nombre o cambia el filtro de estado."
    />
  ) : (
    <Vacio
      icono={<IconoApp icono={app.icono} tono={app.tono} tamano="lg" />}
      titulo="Aún no tienes alumnos"
      texto="Registra el primero para empezar a planificar su entrenamiento."
      accion={<EnlaceBoton href="/alumnos/nuevo"><Plus aria-hidden className="size-4" /> Nuevo alumno</EnlaceBoton>}
    />
  );
}
