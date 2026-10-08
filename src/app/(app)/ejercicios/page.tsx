import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { EnlaceBoton } from "@/components/ui/boton";
import { Encabezado } from "@/components/app/encabezado";
import { claseControl } from "@/components/ui/campo";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { Paginacion, conParametros, leerPagina } from "@/components/ui/paginacion";
import { CabeceraTarjeta, Lista, Tarjeta, Vacio as VacioBase } from "@/components/ui/tarjeta";
import { obtenerContexto } from "@/lib/sesion";
import { rankearEjercicios, type Rol } from "@/lib/ejercicios/ranking";
import { ETIQUETA_DIFICULTAD, ETIQUETA_TIPO } from "@/lib/ejercicios/etiquetas";
import { NivelDificultad } from "@/components/ui/nivel-dificultad";
import { ExploradorEjercicios } from "./selector-musculos";

export const metadata: Metadata = { title: "Ejercicios" };

const TIPOS = ETIQUETA_TIPO;
const DIFICULTAD = ETIQUETA_DIFICULTAD;

const ROL: Record<Rol, string> = { principal: "principal", secundario: "secundario", estabilizador: "estabilizador" };

type Busqueda = PageProps<"/ejercicios">["searchParams"];

export default function PaginaEjercicios({ searchParams }: PageProps<"/ejercicios">) {
  return (
    <>
      <Encabezado
        titulo="Ejercicios"
        miga="Entrenamiento"
        descripcion="Elige músculos en el mapa y te sugerimos ejercicios ordenados por relevancia."
        acciones={
          <EnlaceBoton href="/maestros/ejercicios/nuevo" variante="secundario">
            <Plus aria-hidden className="size-4" /> Crear ejercicio
          </EnlaceBoton>
        }
      />
      <Suspense fallback={<Cargando />}>
        <Biblioteca searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function Cargando() {
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Esqueleto className="h-[30rem] w-full" />
      <EsqueletoLista filas={8} />
    </div>
  );
}

/** Minúsculas y sin tildes: "Bíceps" coincide con "biceps". */
const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

async function Biblioteca({ searchParams }: { searchParams: Busqueda }) {
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const tipo = typeof parametros.tipo === "string" && parametros.tipo in TIPOS ? parametros.tipo : "";

  const { supabase } = await obtenerContexto();
  const [{ data: ejercicios, error }, { data: relaciones }, { data: musculos }] = await Promise.all([
    supabase.from("ejercicios").select("id, nombre, tipo, dificultad, es_global").eq("estado", "activo").order("nombre"),
    supabase.from("ejercicios_musculos").select("ejercicio_id, musculo_id, rol"),
    supabase.from("musculos").select("id, slug, nombre").order("orden"),
  ]);

  const listaMusculos = musculos ?? [];
  const slugValido = new Set(listaMusculos.map((m) => m.slug));
  const seleccionados =
    typeof parametros.m === "string" ? [...new Set(parametros.m.split(",").filter((s) => slugValido.has(s)))] : [];

  const slugDe = new Map(listaMusculos.map((m) => [m.id, m.slug]));
  const nombreDe = new Map(listaMusculos.map((m) => [m.slug, m.nombre]));
  const enlaces = (relaciones ?? []).map((r) => ({
    ejercicioId: r.ejercicio_id,
    slug: slugDe.get(r.musculo_id) ?? "",
    rol: r.rol as Rol,
  }));
  const principales = new Map<string, string[]>();
  for (const e of enlaces) {
    if (e.rol !== "principal") continue;
    principales.set(e.ejercicioId, [...(principales.get(e.ejercicioId) ?? []), nombreDe.get(e.slug) ?? ""]);
  }

  const filtrados = (ejercicios ?? []).filter(
    (e) => (!tipo || e.tipo === tipo) && (!q || normalizar(e.nombre).includes(normalizar(q))),
  );
  const cuentaTipo = new Map<string, number>();
  for (const e of ejercicios ?? []) cuentaTipo.set(e.tipo, (cuentaTipo.get(e.tipo) ?? 0) + 1);
  const tiposPresentes = Object.keys(TIPOS).filter((t) => cuentaTipo.has(t));

  // Cada filtro conserva la búsqueda y los músculos elegidos.
  const m = seleccionados.join(",");
  const url = (cambios: { tipo?: string; pagina?: number }) =>
    conParametros("/ejercicios", { m, q, tipo, ...cambios, pagina: cambios.pagina ?? 1 });

  const sugerencias = seleccionados.length ? rankearEjercicios(filtrados, enlaces, seleccionados) : [];
  const lista = seleccionados.length ? sugerencias : filtrados;
  const pagina = leerPagina(parametros.pagina, lista.length, POR_PAGINA);
  const desde = (pagina - 1) * POR_PAGINA;
  const paginacion = (
    <Paginacion pagina={pagina} total={lista.length} porPagina={POR_PAGINA} href={(n) => url({ pagina: n })} />
  );

  return (
    <ExploradorEjercicios
      musculos={listaMusculos.map(({ slug, nombre }) => ({ slug, nombre }))}
      seleccionados={seleccionados}
      busqueda={
        <Form action="/ejercicios" className="mb-3">
          {m && <input type="hidden" name="m" value={m} />}
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <label className="relative block sm:max-w-sm">
            <span className="sr-only">Buscar ejercicio</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
            <input name="q" type="search" defaultValue={q} placeholder="Buscar por nombre" className={`${claseControl} pl-9`} />
          </label>
        </Form>
      }
      tipos={
        /* Enlaces y no botones de envío: next/form no incluye el botón pulsado en la URL. */
        // `contents`: los tipos siguen en la misma línea que los músculos, a su derecha.
        <nav aria-label="Filtrar por tipo" className="contents">
          {[["", "Todos", (ejercicios ?? []).length] as const, ...tiposPresentes.map((t) => [t, TIPOS[t], cuentaTipo.get(t) ?? 0] as const)].map(
            ([valor, texto, n]) => (
              <Link
                key={valor || "todos"}
                href={url({ tipo: valor })}
                scroll={false}
                aria-current={tipo === valor ? "true" : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors ${
                  tipo === valor
                    ? "border-tinta bg-tinta font-medium text-sobre-tinta"
                    : "border-linea bg-superficie text-tenue hover:border-tinta/30 hover:text-tinta"
                }`}
              >
                {texto}
                <span className={`font-mono text-[0.7rem] ${tipo === valor ? "opacity-60" : "text-tenue/70"}`}>{n}</span>
              </Link>
            ),
          )}
        </nav>
      }
    >
      {error ? (
          <p className="text-peligro">No se pudieron cargar los ejercicios. Recarga la página.</p>
        ) : seleccionados.length ? (
          <Sugeridos sugerencias={sugerencias.slice(desde, desde + POR_PAGINA)} total={sugerencias.length} nombreDe={nombreDe} pie={paginacion} />
        ) : !tipo && !q ? (
          <Resumen ejercicios={filtrados} principales={principales} url={url} />
        ) : (
          <Listado
            titulo={`${tipo ? TIPOS[tipo] : "Resultados"}${q ? ` · “${q}”` : ""}`}
            ejercicios={filtrados.slice(desde, desde + POR_PAGINA)}
            total={filtrados.length}
            principales={principales}
            pie={paginacion}
          />
        )}
    </ExploradorEjercicios>
  );
}

const POR_PAGINA = 20;
const POR_TIPO_EN_RESUMEN = 5;

type Ejercicio = { id: string; nombre: string; tipo: string; dificultad: string | null };

function Sugeridos({
  sugerencias,
  total,
  nombreDe,
  pie,
}: {
  sugerencias: ReturnType<typeof rankearEjercicios<Ejercicio>>;
  total: number;
  nombreDe: Map<string, string>;
  pie: React.ReactNode;
}) {
  if (!total) {
    return (
      <Vacio titulo="Ningún ejercicio trabaja esa combinación" texto="Quita algún músculo o cambia los filtros de búsqueda." />
    );
  }
  return (
    <section aria-labelledby="titulo-sugeridos">
      <Tarjeta className="overflow-hidden">
        <CabeceraTarjeta id="titulo-sugeridos" titulo={`Sugeridos · ${total}`} />
        <Lista ordenada>
          {sugerencias.map(({ ejercicio: e, relevancia, coincidencias }) => (
            <li key={e.id} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium">{e.nombre}</p>
                <p className="text-sm text-tenue">
                  {coincidencias.map((c, i) => (
                    <span key={c.slug}>
                      {i > 0 && " · "}
                      <span className={c.rol === "principal" ? "font-medium text-tinta" : ""}>{nombreDe.get(c.slug)}</span>{" "}
                      ({ROL[c.rol]})
                    </span>
                  ))}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-tenue">
                <span>{TIPOS[e.tipo]}{e.dificultad ? `, ${DIFICULTAD[e.dificultad].toLowerCase()}` : ""}</span>
                <Relevancia valor={relevancia} />
              </div>
            </li>
          ))}
        </Lista>
        {pie}
      </Tarjeta>
    </section>
  );
}

/** Cinco barras, como los discos cargados en una barra. */
function Relevancia({ valor }: { valor: number }) {
  return (
    <span role="img" aria-label={`Relevancia ${valor} de 5`} className="flex items-end gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`w-1.5 rounded-full ${n <= valor ? "bg-tinta" : "bg-tinta/10"}`} style={{ height: 6 + n * 2.5 }} />
      ))}
    </span>
  );
}

/** Sin filtros: un vistazo por tipo (los primeros de cada uno) en lugar de la biblioteca completa. */
function Resumen({
  ejercicios,
  principales,
  url,
}: {
  ejercicios: Ejercicio[];
  principales: Map<string, string[]>;
  url: (cambios: { tipo?: string }) => string;
}) {
  const porTipo = Object.keys(TIPOS)
    .map((tipo) => ({ tipo, lista: ejercicios.filter((e) => e.tipo === tipo) }))
    .filter((g) => g.lista.length);

  if (!porTipo.length) return <Vacio titulo="Aún no hay ejercicios" texto="La biblioteca está vacía." />;

  return (
    <div className="space-y-4">
      {porTipo.map(({ tipo, lista }) => (
        <section key={tipo} aria-labelledby={`tipo-${tipo}`}>
          <Tarjeta className="overflow-hidden">
            <CabeceraTarjeta
              id={`tipo-${tipo}`}
              titulo={`${TIPOS[tipo]} · ${lista.length}`}
            />
            <FilasEjercicios ejercicios={lista.slice(0, POR_TIPO_EN_RESUMEN)} principales={principales} />
            {lista.length > POR_TIPO_EN_RESUMEN && (
              <Link
                href={url({ tipo })}
                scroll={false}
                className="flex items-center justify-between border-t border-linea bg-fondo/60 px-4 py-2.5 text-sm font-medium hover:bg-fondo"
              >
                Ver los {lista.length} ejercicios de {TIPOS[tipo].toLowerCase()}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </Tarjeta>
        </section>
      ))}
    </div>
  );
}

/** Un tipo o una búsqueda: lista plana paginada. */
function Listado({
  titulo,
  ejercicios,
  total,
  principales,
  pie,
}: {
  titulo: string;
  ejercicios: Ejercicio[];
  total: number;
  principales: Map<string, string[]>;
  pie: React.ReactNode;
}) {
  if (!total) return <Vacio titulo="Ningún ejercicio coincide" texto="Prueba con otro nombre o cambia el tipo." />;
  return (
    <section aria-labelledby="titulo-listado">
      <Tarjeta className="overflow-hidden">
        <CabeceraTarjeta id="titulo-listado" titulo={`${titulo} · ${total}`} />
        <FilasEjercicios ejercicios={ejercicios} principales={principales} />
        {pie}
      </Tarjeta>
    </section>
  );
}

function FilasEjercicios({ ejercicios, principales }: { ejercicios: Ejercicio[]; principales: Map<string, string[]> }) {
  return (
    <Lista>
      {ejercicios.map((e) => (
        <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_7.5rem] sm:items-center sm:gap-4">
          <span className="text-sm font-medium">{e.nombre}</span>
          <span className="text-sm text-tenue">{(principales.get(e.id) ?? []).join(", ") || "—"}</span>
          <span className="sm:justify-self-end">{e.dificultad && <NivelDificultad dificultad={e.dificultad} />}</span>
        </li>
      ))}
    </Lista>
  );
}

function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return <VacioBase icono={<Search aria-hidden className="size-5" />} titulo={titulo} texto={texto} />;
}
