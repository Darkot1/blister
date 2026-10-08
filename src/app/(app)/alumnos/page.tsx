import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { Plus, Search } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { InsigniaEstado } from "@/components/ui/insignia-estado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { edad, fechaCorta, iniciales } from "@/lib/formato";

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
      <Form action="/alumnos" className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-60 flex-1 sm:max-w-sm">
          <span className="sr-only">Buscar alumno</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o teléfono"
            className="h-10 w-full rounded-md border border-linea bg-superficie pr-3 pl-9 focus:border-acento focus:ring-2 focus:ring-acento/20 focus:outline-none"
          />
        </label>
        <div role="group" aria-label="Filtrar por estado" className="flex rounded-md border border-linea bg-superficie p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="submit"
              name="estado"
              value={f.valor}
              aria-pressed={estado === f.valor}
              className={`h-9 rounded px-3 text-sm transition-colors ${
                estado === f.valor ? "bg-tinta font-semibold text-white" : "text-tenue hover:text-tinta"
              }`}
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
          <ul className="divide-y divide-linea overflow-hidden rounded-lg border border-linea bg-superficie">
            {alumnos.map((a) => {
              const anios = edad(a.fecha_nacimiento);
              return (
                <li key={a.id}>
                  <Link
                    href={`/alumnos/${a.id}`}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 hover:bg-fondo/60 sm:grid-cols-[auto_2fr_1fr_1fr_auto]"
                  >
                    <span aria-hidden className="grid size-10 place-items-center rounded-full bg-tinta/[0.07] font-titulo font-semibold">
                      {iniciales(a.nombres, a.apellidos)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{a.apellidos}, {a.nombres}</span>
                      <span className="block truncate text-sm text-tenue">
                        {[anios !== null ? `${anios} años` : null, a.telefono].filter(Boolean).join(", ") || "Sin datos de contacto"}
                      </span>
                    </span>
                    <span className="hidden text-sm text-tenue sm:block">Desde {fechaCorta(a.fecha_inicio)}</span>
                    <span className="hidden sm:block"><InsigniaEstado estado={a.estado} /></span>
                    <span className="sm:hidden"><InsigniaEstado estado={a.estado} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-tenue">
            {alumnos.length === 1 ? "1 alumno" : `${alumnos.length} alumnos`}
          </p>
        </>
      )}
    </>
  );
}

function SinResultados({ hayFiltro }: { hayFiltro: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-linea bg-superficie/60 px-6 py-12 text-center">
      {hayFiltro ? (
        <>
          <p className="font-titulo text-xl font-semibold">Ningún alumno coincide</p>
          <p className="mt-1 text-tenue">Prueba con otro nombre o cambia el filtro de estado.</p>
        </>
      ) : (
        <>
          <p className="font-titulo text-xl font-semibold">Aún no tienes alumnos</p>
          <p className="mt-1 mb-5 text-tenue">Registra el primero para empezar a planificar su entrenamiento.</p>
          <EnlaceBoton href="/alumnos/nuevo"><Plus aria-hidden className="size-4" /> Nuevo alumno</EnlaceBoton>
        </>
      )}
    </div>
  );
}
