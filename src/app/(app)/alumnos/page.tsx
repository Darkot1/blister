import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { ChevronRight, ListChecks, Plus, Search, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { conParametros } from "@/components/ui/paginacion";
import { claseControl } from "@/components/ui/campo";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { Tarjeta, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
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
        miga="Gestión"
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
  const ids = (alumnos ?? []).map((a) => a.id);
  const { data: planes } = ids.length
    ? await supabase.from("planes").select("id, alumno_id, nombre").eq("estado", "activo").in("alumno_id", ids)
    : { data: [] };
  const planDe = new Map((planes ?? []).map((p) => [p.alumno_id, p]));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Form action="/alumnos" className="relative min-w-60 flex-1 sm:max-w-sm">
          {estado !== "activo" && <input type="hidden" name="estado" value={estado} />}
          <label>
            <span className="sr-only">Buscar alumno</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
            <input name="q" type="search" defaultValue={q} placeholder="Buscar por nombre o teléfono" className={`${claseControl} pl-9`} />
          </label>
        </Form>
        {/* Enlaces y no botones de envío: next/form no incluye el botón pulsado en la URL. */}
        <nav aria-label="Filtrar por estado" className={`${claseSegmentado} max-w-full overflow-x-auto`}>
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={conParametros("/alumnos", { q, estado: f.valor === "activo" ? undefined : f.valor })}
              scroll={false}
              aria-current={estado === f.valor ? "true" : undefined}
              className={`inline-flex items-center ${claseSegmento(estado === f.valor)}`}
            >
              {f.texto}
            </Link>
          ))}
        </nav>
      </div>

      {error ? (
        <p className="text-peligro">No se pudieron cargar los alumnos. Recarga la página.</p>
      ) : !alumnos?.length ? (
        <SinResultados hayFiltro={Boolean(q) || estado !== "activo"} />
      ) : (
        <>
          <Tarjeta className="overflow-hidden">
            <div aria-hidden className="etiqueta hidden grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5rem_minmax(0,1fr)_7rem_1rem] gap-4 border-b border-linea bg-fondo/60 px-4 py-2.5 md:grid">
              <span>Alumno</span>
              <span>Plan activo</span>
              <span>Edad</span>
              <span>Entrena desde</span>
              <span>Estado</span>
              <span />
            </div>
            <ul className="divide-y divide-linea">
              {alumnos.map((a) => {
                const anios = edad(a.fecha_nacimiento);
                const plan = planDe.get(a.id);
                return (
                  <li key={a.id}>
                    <Link
                      href={`/alumnos/${a.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 px-4 py-2.5 transition-colors hover:bg-fondo/70 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5rem_minmax(0,1fr)_7rem_1rem]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar id={a.id} nombres={a.nombres} apellidos={a.apellidos} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{a.nombres} {a.apellidos}</span>
                          {/* En móvil, el plan va bajo el nombre. */}
                          <span className="block truncate text-xs text-tenue md:hidden">
                            {plan ? plan.nombre : "Sin plan"}
                            {anios !== null ? ` · ${anios} años` : ""}
                          </span>
                        </span>
                      </span>
                      <span className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
                        {plan ? (
                          <>
                            <ListChecks aria-hidden className="size-3.5 shrink-0 text-tenue" />
                            <span className="truncate">{plan.nombre}</span>
                          </>
                        ) : (
                          <span className="text-tenue">Sin plan</span>
                        )}
                      </span>
                      <span className="hidden font-mono text-[0.8rem] text-tenue md:block">{anios !== null ? `${anios} años` : "—"}</span>
                      <span className="hidden font-mono text-[0.8rem] text-tenue md:block">{fechaCorta(a.fecha_inicio)}</span>
                      <span><InsigniaEstado estado={a.estado} /></span>
                      <ChevronRight aria-hidden className="size-4 text-tinta/25" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-linea bg-fondo/60 px-4 py-2.5 font-mono text-xs text-tenue">
              {alumnos.length === 1 ? "1 alumno" : `${alumnos.length} alumnos`}
            </p>
          </Tarjeta>
        </>
      )}
    </>
  );
}

function SinResultados({ hayFiltro }: { hayFiltro: boolean }) {
  return hayFiltro ? (
    <Vacio
      icono={<Search aria-hidden className="size-5" />}
      titulo="Ningún alumno coincide"
      texto="Prueba con otro nombre o cambia el filtro de estado."
    />
  ) : (
    <Vacio
      icono={<Users aria-hidden className="size-5" />}
      titulo="Aún no tienes alumnos"
      texto="Registra el primero para empezar a planificar su entrenamiento."
      accion={<EnlaceBoton href="/alumnos/nuevo"><Plus aria-hidden className="size-4" /> Nuevo alumno</EnlaceBoton>}
    />
  );
}
