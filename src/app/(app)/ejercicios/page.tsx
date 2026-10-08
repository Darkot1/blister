import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { obtenerContexto } from "@/lib/sesion";
import { rankearEjercicios, type Rol } from "@/lib/ejercicios/ranking";
import { CargandoEjercicios, PorTipo, Sugeridos, TIPOS, VistaEjercicios } from "./biblioteca";

export const metadata: Metadata = { title: "Ejercicios" };

type Busqueda = PageProps<"/ejercicios">["searchParams"];

export default function PaginaEjercicios({ searchParams }: PageProps<"/ejercicios">) {
  return (
    <>
      <Encabezado
        titulo="Ejercicios"
        descripcion="Toca en el mapa los músculos que quieres trabajar y verás qué ejercicios los cargan, del que más al que menos. Si ya sabes cuál buscas, escribe su nombre."
      />
      <Suspense fallback={<CargandoEjercicios />}>
        <Biblioteca searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Minúsculas y sin tildes: "Bíceps" coincide con "biceps". */
const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Conserva los músculos elegidos y quita búsqueda y tipo. */
const urlSinFiltros = (seleccionados: string[]) =>
  seleccionados.length ? `/ejercicios?m=${seleccionados.join(",")}` : "/ejercicios";

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

  const todos = ejercicios ?? [];
  const filtrados = todos.filter(
    (e) => (!tipo || e.tipo === tipo) && (!q || normalizar(e.nombre).includes(normalizar(q))),
  );
  const tiposPresentes = Object.keys(TIPOS).filter((t) => todos.some((e) => e.tipo === t));
  const quitarFiltros = q || tipo ? urlSinFiltros(seleccionados) : undefined;

  return (
    <VistaEjercicios
      musculos={listaMusculos.map(({ slug, nombre }) => ({ slug, nombre }))}
      seleccionados={seleccionados}
      q={q}
      tipo={tipo}
      tiposPresentes={tiposPresentes}
      error={Boolean(error)}
      total={todos.length}
    >
      {seleccionados.length ? (
        <Sugeridos
          sugerencias={rankearEjercicios(filtrados, enlaces, seleccionados)}
          nombreDe={nombreDe}
          seleccionados={seleccionados}
          quitarFiltros={quitarFiltros}
        />
      ) : (
        <PorTipo ejercicios={filtrados} principales={principales} quitarFiltros={quitarFiltros} />
      )}
    </VistaEjercicios>
  );
}
