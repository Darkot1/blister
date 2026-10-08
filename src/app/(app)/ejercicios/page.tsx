import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { claseControl } from "@/components/ui/campo";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { ListaAgrupada, TituloGrupo, Vacio as VacioBase } from "@/components/ui/tarjeta";
import { obtenerContexto } from "@/lib/sesion";
import { rankearEjercicios, type Rol } from "@/lib/ejercicios/ranking";
import { SelectorMusculos } from "./selector-musculos";

export const metadata: Metadata = { title: "Ejercicios" };

const TIPOS: Record<string, string> = {
  fuerza: "Fuerza",
  movilidad: "Movilidad",
  estiramiento: "Estiramiento",
  activacion: "Activación",
  cardio: "Cardio",
  calentamiento: "Calentamiento",
  enfriamiento: "Enfriamiento",
  otro: "Otros",
};

const DIFICULTAD: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const ROL: Record<Rol, string> = { principal: "principal", secundario: "secundario", estabilizador: "estabilizador" };

type Busqueda = PageProps<"/ejercicios">["searchParams"];

export default function PaginaEjercicios({ searchParams }: PageProps<"/ejercicios">) {
  return (
    <>
      <Encabezado
        titulo="Ejercicios"
        descripcion="Elige músculos en el mapa y te sugerimos ejercicios ordenados por relevancia."
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
  const tiposPresentes = Object.keys(TIPOS).filter((t) => (ejercicios ?? []).some((e) => e.tipo === t));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside aria-label="Buscar por músculo" className="rounded-[var(--radius-tarjeta)] bg-superficie p-5 lg:sticky lg:top-8">
        <SelectorMusculos musculos={listaMusculos.map(({ slug, nombre }) => ({ slug, nombre }))} seleccionados={seleccionados} />
      </aside>

      <div className="min-w-0">
        <Form action="/ejercicios" className="mb-6 space-y-3">
          {seleccionados.length > 0 && <input type="hidden" name="m" value={seleccionados.join(",")} />}
          <label className="relative block sm:max-w-sm">
            <span className="sr-only">Buscar ejercicio</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-tenue" />
            <input name="q" type="search" defaultValue={q} placeholder="Buscar por nombre" className={`${claseControl} h-11 pl-10`} />
          </label>
          <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-1.5">
            {[["", "Todos"] as const, ...tiposPresentes.map((t) => [t, TIPOS[t]] as const)].map(([valor, texto]) => (
              <button
                key={valor || "todos"}
                type="submit"
                name="tipo"
                value={valor}
                aria-pressed={tipo === valor}
                className={`h-9 rounded-full px-3.5 text-sm transition-colors ${
                  tipo === valor
                    ? "bg-tinta font-semibold text-white"
                    : "bg-superficie text-tenue hover:text-tinta"
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </Form>

        {error ? (
          <p className="text-peligro">No se pudieron cargar los ejercicios. Recarga la página.</p>
        ) : seleccionados.length ? (
          <Sugeridos sugerencias={rankearEjercicios(filtrados, enlaces, seleccionados)} nombreDe={nombreDe} />
        ) : (
          <PorTipo ejercicios={filtrados} principales={principales} />
        )}
      </div>
    </div>
  );
}

function Sugeridos({
  sugerencias,
  nombreDe,
}: {
  sugerencias: ReturnType<typeof rankearEjercicios<{ id: string; nombre: string; tipo: string; dificultad: string | null }>>;
  nombreDe: Map<string, string>;
}) {
  if (!sugerencias.length) {
    return (
      <Vacio titulo="Ningún ejercicio trabaja esa combinación" texto="Quita algún músculo o cambia los filtros de búsqueda." />
    );
  }
  return (
    <section aria-labelledby="titulo-sugeridos">
      <TituloGrupo id="titulo-sugeridos">
        Sugeridos <span className="text-base font-medium text-tenue">({sugerencias.length})</span>
      </TituloGrupo>
      <ListaAgrupada ordenada>
        {sugerencias.map(({ ejercicio: e, relevancia, coincidencias }) => (
          <li key={e.id}><div className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="font-semibold">{e.nombre}</p>
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
          </div></li>
        ))}
      </ListaAgrupada>
    </section>
  );
}

/** Cinco barras, como los discos cargados en una barra. */
function Relevancia({ valor }: { valor: number }) {
  return (
    <span role="img" aria-label={`Relevancia ${valor} de 5`} className="flex items-end gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`w-1.5 rounded-full ${n <= valor ? "bg-app-ejercicios" : "bg-tinta/10"}`} style={{ height: 6 + n * 2.5 }} />
      ))}
    </span>
  );
}

function PorTipo({
  ejercicios,
  principales,
}: {
  ejercicios: { id: string; nombre: string; tipo: string; dificultad: string | null }[];
  principales: Map<string, string[]>;
}) {
  const porTipo = Object.keys(TIPOS)
    .map((tipo) => ({ tipo, lista: ejercicios.filter((e) => e.tipo === tipo) }))
    .filter((g) => g.lista.length);

  if (!porTipo.length) return <Vacio titulo="Ningún ejercicio coincide" texto="Prueba con otro nombre o quita el filtro de tipo." />;

  return (
    <div className="space-y-10">
      {porTipo.map(({ tipo, lista }) => (
        <section key={tipo} aria-labelledby={`tipo-${tipo}`}>
          <TituloGrupo id={`tipo-${tipo}`}>
            {TIPOS[tipo]} <span className="text-base font-medium text-tenue">({lista.length})</span>
          </TituloGrupo>
          <ListaAgrupada>
            {lista.map((e) => (
              <li key={e.id}>
                <div className="grid gap-1 px-4 py-3 sm:grid-cols-[2fr_2fr_auto] sm:items-center sm:gap-4">
                  <span className="font-semibold">{e.nombre}</span>
                  <span className="text-sm text-tenue">{(principales.get(e.id) ?? []).join(", ") || "—"}</span>
                  {e.dificultad && <NivelDificultad dificultad={e.dificultad} />}
                </div>
              </li>
            ))}
          </ListaAgrupada>
        </section>
      ))}
    </div>
  );
}

function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return <VacioBase icono={<Search aria-hidden className="size-8 text-tinta/25" />} titulo={titulo} texto={texto} />;
}

const TONO_DIFICULTAD: Record<string, string> = {
  principiante: "bg-exito/10 text-exito",
  intermedio: "bg-aviso/10 text-aviso",
  avanzado: "bg-peligro/10 text-peligro",
};

function NivelDificultad({ dificultad }: { dificultad: string }) {
  return (
    <span className={`inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-semibold ${TONO_DIFICULTAD[dificultad] ?? ""}`}>
      {DIFICULTAD[dificultad] ?? dificultad}
    </span>
  );
}
