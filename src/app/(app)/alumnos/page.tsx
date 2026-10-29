import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { ChevronRight, Inbox, ListChecks, Plus, RotateCcw, Search, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { EnlaceBoton } from "@/components/ui/boton";
import { Paginacion, conParametros } from "@/components/ui/paginacion";
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
          <>
            <Suspense fallback={null}>
              <BotonSolicitudes />
            </Suspense>
            <EnlaceBoton href="/alumnos/nuevo">
              <Plus aria-hidden className="size-4" /> Nuevo alumno
            </EnlaceBoton>
          </>
        }
      />
      <Suspense fallback={<EsqueletoLista />}>
        <ListaAlumnos searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Acceso a lo que llega desde la página pública, con cuántas solicitudes esperan respuesta. */
async function BotonSolicitudes() {
  const { supabase } = await obtenerContexto();
  const { count } = await supabase.from("solicitudes").select("id", { count: "exact", head: true }).eq("estado", "nueva");
  const nuevas = count ?? 0;
  return (
    <EnlaceBoton href="/alumnos/solicitudes" variante="secundario" aria-label={`Solicitudes${nuevas ? `: ${nuevas} nuevas` : ""}`}>
      <Inbox aria-hidden className="size-4" /> Solicitudes
      {nuevas > 0 && (
        <span aria-hidden className="grid h-5 min-w-5 place-items-center rounded-full bg-acento px-1.5 text-xs font-semibold tabular-nums text-sobre-acento">
          {nuevas}
        </span>
      )}
    </EnlaceBoton>
  );
}

const POR_PAGINA = 25;

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
  const pedida = Math.max(1, Number.parseInt(typeof parametros.pagina === "string" ? parametros.pagina : "1", 10) || 1);

  const { supabase } = await obtenerContexto();
  // Paginada en la base: con muchos alumnos no se trae la lista entera (antes se cortaba en 200 sin avisar).
  const consultar = (pagina: number) => {
    let consulta = supabase
      .from("alumnos")
      .select("id, nombres, apellidos, fecha_nacimiento, telefono, fecha_inicio, estado", { count: "exact" })
      .order("apellidos")
      .order("nombres")
      .order("id")
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
    if (estado !== "todos") consulta = consulta.eq("estado", estado);
    if (q) {
      const patron = `%${q.replace(/[%_,()]/g, " ")}%`;
      consulta = consulta.or(`nombres.ilike.${patron},apellidos.ilike.${patron},telefono.ilike.${patron}`);
    }
    return consulta;
  };
  let pagina = pedida;
  let { data: alumnos, error, count } = await consultar(pagina);
  // Página fuera de rango (p. ej. tras archivar alumnos): se muestra la última.
  if (!error && !alumnos?.length && count && pagina > 1) {
    pagina = Math.ceil(count / POR_PAGINA);
    ({ data: alumnos, error, count } = await consultar(pagina));
  }
  const total = count ?? alumnos?.length ?? 0;
  // Sin alumnos activos ni filtros: ¿no hay ninguno, o solo inactivos/archivados?
  const { count: otros } =
    !error && !alumnos?.length && !q && estado === "activo"
      ? await supabase.from("alumnos").select("id", { count: "exact", head: true })
      : { count: 0 };
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
        <Vacio
          icono={<RotateCcw aria-hidden className="size-5" />}
          titulo="No se pudieron cargar los alumnos"
          texto="Revisa tu conexión e inténtalo de nuevo."
          accion={
            <EnlaceBoton href={conParametros("/alumnos", { q, estado: estado === "activo" ? undefined : estado, pagina: pagina > 1 ? String(pagina) : undefined })} variante="secundario">
              <RotateCcw aria-hidden className="size-4" /> Reintentar
            </EnlaceBoton>
          }
        />
      ) : !alumnos?.length ? (
        <SinResultados hayFiltro={Boolean(q) || estado !== "activo"} soloInactivos={(otros ?? 0) > 0} />
      ) : (
        <>
          <Tarjeta className="overflow-hidden">
            <div aria-hidden className="etiqueta hidden grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5rem_minmax(0,1fr)_7rem_1rem] gap-4 border-b border-linea bg-hueso/50 px-4 py-2.5 md:grid">
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
                      className="grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 px-4 py-2.5 transition-colors hover:bg-hueso/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_5rem_minmax(0,1fr)_7rem_1rem]"
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
                      <span className="hidden tabular-nums text-[0.8rem] text-tenue md:block">{anios !== null ? `${anios} años` : "—"}</span>
                      <span className="hidden tabular-nums text-[0.8rem] text-tenue md:block">{fechaCorta(a.fecha_inicio)}</span>
                      <span><InsigniaEstado estado={a.estado} /></span>
                      <ChevronRight aria-hidden className="size-4 text-tinta/25" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            {total > POR_PAGINA ? (
              <Paginacion
                pagina={pagina}
                total={total}
                porPagina={POR_PAGINA}
                href={(n) => conParametros("/alumnos", { q, estado: estado === "activo" ? undefined : estado, pagina: n > 1 ? String(n) : undefined })}
              />
            ) : (
              <p className="border-t border-linea bg-hueso/50 px-4 py-2.5 tabular-nums text-xs text-tenue">
                {total === 1 ? "1 alumno" : `${total} alumnos`}
              </p>
            )}
          </Tarjeta>
        </>
      )}
    </>
  );
}

function SinResultados({ hayFiltro, soloInactivos }: { hayFiltro: boolean; soloInactivos: boolean }) {
  if (soloInactivos) {
    return (
      <Vacio
        icono={<Users aria-hidden className="size-5" />}
        titulo="No tienes alumnos activos"
        texto="Los que tienes están inactivos o archivados. Míralos todos o registra uno nuevo."
        accion={
          <EnlaceBoton href="/alumnos?estado=todos" variante="secundario">
            Ver todos
          </EnlaceBoton>
        }
      />
    );
  }
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
