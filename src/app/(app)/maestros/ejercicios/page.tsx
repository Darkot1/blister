import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Dumbbell, Plus, Search } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { claseControl } from "@/components/ui/campo";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { NivelDificultad } from "@/components/ui/nivel-dificultad";
import { Paginacion, conParametros, leerPagina } from "@/components/ui/paginacion";
import { Tarjeta, Vacio, claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { ETIQUETA_TIPO } from "@/lib/ejercicios/etiquetas";
import { obtenerContexto } from "@/lib/sesion";
import { PestanasMaestros } from "../pestanas";

export const metadata: Metadata = { title: "Maestro de ejercicios" };

const ORIGENES = [
  { valor: "todos", texto: "Todos" },
  { valor: "propios", texto: "Propios" },
  { valor: "globales", texto: "Globales" },
  { valor: "archivados", texto: "Archivados" },
] as const;

const POR_PAGINA = 20;

export default function PaginaMaestroEjercicios({ searchParams }: PageProps<"/maestros/ejercicios">) {
  return (
    <>
      <Encabezado
        titulo="Maestros"
        miga="Catálogo"
        descripcion="Crea tus propios ejercicios y músculos. Los globales los mantiene Blister y no se pueden editar."
        acciones={
          <EnlaceBoton href="/maestros/ejercicios/nuevo">
            <Plus aria-hidden className="size-4" /> Nuevo ejercicio
          </EnlaceBoton>
        }
      />
      <PestanasMaestros activa="/maestros/ejercicios" />
      <Suspense fallback={<EsqueletoLista filas={8} />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

async function Lista({ searchParams }: { searchParams: PageProps<"/maestros/ejercicios">["searchParams"] }) {
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const origen = ORIGENES.some((o) => o.valor === parametros.origen) ? (parametros.origen as string) : "todos";

  const { supabase } = await obtenerContexto();
  const [{ data: ejercicios, error }, { data: relaciones }, { data: musculos }] = await Promise.all([
    supabase.from("ejercicios").select("id, nombre, tipo, dificultad, es_global, estado").order("nombre"),
    supabase.from("ejercicios_musculos").select("ejercicio_id, musculo_id, rol").eq("rol", "principal"),
    supabase.from("musculos").select("id, nombre"),
  ]);

  const nombreMusculo = new Map((musculos ?? []).map((m) => [m.id, m.nombre]));
  const principales = new Map<string, string[]>();
  for (const r of relaciones ?? []) {
    principales.set(r.ejercicio_id, [...(principales.get(r.ejercicio_id) ?? []), nombreMusculo.get(r.musculo_id) ?? ""]);
  }

  const todos = ejercicios ?? [];
  const cuenta = {
    todos: todos.filter((e) => e.estado !== "archivado").length,
    propios: todos.filter((e) => !e.es_global && e.estado !== "archivado").length,
    globales: todos.filter((e) => e.es_global).length,
    archivados: todos.filter((e) => e.estado === "archivado").length,
  };
  const filtrados = todos.filter((e) => {
    const porOrigen =
      origen === "archivados" ? e.estado === "archivado"
      : e.estado === "archivado" ? false
      : origen === "propios" ? !e.es_global
      : origen === "globales" ? e.es_global
      : true;
    return porOrigen && (!q || normalizar(e.nombre).includes(normalizar(q)));
  });
  const pagina = leerPagina(parametros.pagina, filtrados.length, POR_PAGINA);
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const url = (cambios: { origen?: string; pagina?: number }) =>
    conParametros("/maestros/ejercicios", {
      q,
      origen: (cambios.origen ?? origen) === "todos" ? undefined : cambios.origen ?? origen,
      pagina: cambios.pagina ?? 1,
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Form action="/maestros/ejercicios" className="relative min-w-60 flex-1 sm:max-w-sm">
          {origen !== "todos" && <input type="hidden" name="origen" value={origen} />}
          <label>
            <span className="sr-only">Buscar ejercicio</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
            <input name="q" type="search" defaultValue={q} placeholder="Buscar por nombre" className={`${claseControl} pl-9`} />
          </label>
        </Form>
        <nav aria-label="Filtrar por origen" className={`${claseSegmentado} max-w-full overflow-x-auto`}>
          {ORIGENES.map((o) => (
            <Link
              key={o.valor}
              href={url({ origen: o.valor })}
              scroll={false}
              aria-current={origen === o.valor ? "true" : undefined}
              className={`inline-flex items-center gap-1.5 ${claseSegmento(origen === o.valor)}`}
            >
              {o.texto}
              <span className={`font-mono text-[0.7rem] ${origen === o.valor ? "opacity-70" : "text-tenue/70"}`}>{cuenta[o.valor]}</span>
            </Link>
          ))}
        </nav>
      </div>

      {error ? (
        <p className="text-peligro">No se pudieron cargar los ejercicios. Recarga la página.</p>
      ) : !filtrados.length ? (
        origen === "propios" && !q ? (
          <Vacio
            icono={<Dumbbell aria-hidden className="size-5" />}
            titulo="Aún no tienes ejercicios propios"
            texto="Crea los ejercicios que usas y no están en la biblioteca: aparecerán en las sugerencias del mapa muscular."
            accion={<EnlaceBoton href="/maestros/ejercicios/nuevo"><Plus aria-hidden className="size-4" /> Nuevo ejercicio</EnlaceBoton>}
          />
        ) : (
          <Vacio icono={<Search aria-hidden className="size-5" />} titulo="Ningún ejercicio coincide" texto="Prueba con otro nombre o cambia el filtro." />
        )
      ) : (
        <Tarjeta className="overflow-hidden">
          <div aria-hidden className="etiqueta hidden grid-cols-[minmax(0,2.4fr)_8rem_8rem_6rem_1rem] gap-4 border-b border-linea bg-fondo/60 px-4 py-2.5 md:grid">
            <span>Ejercicio</span>
            <span>Tipo</span>
            <span>Dificultad</span>
            <span>Origen</span>
            <span />
          </div>
          <ul className="divide-y divide-linea">
            {visibles.map((e) => {
              const contenido = (
                <>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{e.nombre}</span>
                    <span className="block truncate text-xs text-tenue">
                      {(principales.get(e.id) ?? []).join(", ") || "Sin músculo principal"}
                      <span className="md:hidden"> · {ETIQUETA_TIPO[e.tipo] ?? e.tipo}</span>
                    </span>
                  </span>
                  <span className="hidden text-sm text-tenue md:block">{ETIQUETA_TIPO[e.tipo] ?? e.tipo}</span>
                  <span className="hidden md:block">{e.dificultad && <NivelDificultad dificultad={e.dificultad} />}</span>
                  <span>
                    <span
                      className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-medium ${
                        e.es_global ? "border border-linea text-tenue" : "bg-acento text-sobre-acento"
                      }`}
                    >
                      {e.es_global ? "Global" : "Propio"}
                    </span>
                  </span>
                  {e.es_global ? <span /> : <ChevronRight aria-hidden className="size-4 text-tinta/25" />}
                </>
              );
              const clase =
                "grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 px-4 py-2.5 md:grid-cols-[minmax(0,2.4fr)_8rem_8rem_6rem_1rem]";
              return (
                <li key={e.id}>
                  {e.es_global ? (
                    <div className={clase}>{contenido}</div>
                  ) : (
                    <Link href={`/maestros/ejercicios/${e.id}`} className={`${clase} transition-colors hover:bg-fondo/70`}>
                      {contenido}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
          <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} href={(n) => url({ pagina: n })} />
        </Tarjeta>
      )}
    </>
  );
}
