"use client";

import { useMemo, useState, type Ref } from "react";
import { Check, Plus, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { MapaCorporal, type RolMuscular } from "@/components/anatomia/mapa-corporal";
import { MiniaturaMusculos } from "@/components/anatomia/miniatura-musculos";
import { claseControl, claseSelector } from "@/components/ui/campo";
import { claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { rankearEjercicios } from "@/lib/ejercicios/ranking";
import { ETIQUETA_TIPO } from "@/lib/ejercicios/etiquetas";
import type { Catalogo, EjercicioCatalogo } from "@/lib/entrenamiento/cargar";

/** Minúsculas y sin tildes: "Bíceps" coincide con "biceps". */
const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const POR_TANDA = 30;

/**
 * Buscador de ejercicios del constructor. Por nombre (con filtro de tipo) o por músculo:
 * en el mapa se eligen músculos y la lista se ordena por relevancia, como en la biblioteca.
 */
export function CatalogoEjercicios({
  catalogo,
  principalesDe,
  resaltadosDe,
  sugerencia,
  enDia,
  destino,
  alAnadir,
  refBusqueda,
}: {
  catalogo: Catalogo;
  principalesDe: Map<string, string>;
  resaltadosDe: (ejercicioId: string) => Record<string, RolMuscular>;
  /** Músculos que sugiere el nombre del día abierto ("Empuje" → pecho, hombro, tríceps). */
  sugerencia: { dia: string; musculos: string[] } | null;
  /** Cuántas veces está cada ejercicio en el día abierto. */
  enDia: Map<string, number>;
  /** Selector "Añadir a…" (lo pinta el constructor). */
  destino: React.ReactNode;
  alAnadir: (ejercicio: EjercicioCatalogo) => void;
  refBusqueda?: Ref<HTMLInputElement>;
}) {
  const [q, setQ] = useState("");
  const [modo, setModo] = useState<"nombre" | "musculo">("nombre");
  const [tipo, setTipo] = useState("");
  const [musculos, setMusculos] = useState<string[]>([]);
  const [limite, setLimite] = useState(POR_TANDA);

  const activos = useMemo(() => catalogo.ejercicios.filter((e) => e.activo), [catalogo.ejercicios]);
  const tipos = useMemo(() => Object.keys(ETIQUETA_TIPO).filter((t) => activos.some((e) => e.tipo === t)), [activos]);
  const nombreMusculo = useMemo(() => new Map(catalogo.musculos.map((m) => [m.slug, m.nombre])), [catalogo.musculos]);

  const resultados = useMemo(() => {
    const texto = normalizar(q.trim());
    const filtrados = activos.filter((e) => (!tipo || e.tipo === tipo) && (!texto || normalizar(e.nombre).includes(texto)));
    if (modo === "musculo" && musculos.length) {
      return rankearEjercicios(filtrados, catalogo.relaciones, musculos).map((s) => s.ejercicio);
    }
    return filtrados;
  }, [activos, q, tipo, modo, musculos, catalogo.relaciones]);

  const alternarMusculo = (slug: string) => {
    setMusculos((m) => (m.includes(slug) ? m.filter((s) => s !== slug) : [...m, slug]));
    setLimite(POR_TANDA);
  };

  const sinMusculos = modo === "musculo" && musculos.length === 0;
  const musculosSugeridos = sugerencia?.musculos.filter((m) => nombreMusculo.has(m)) ?? [];
  const usandoSugerencia =
    modo === "musculo" && musculosSugeridos.length > 0 && musculosSugeridos.length === musculos.length && musculosSugeridos.every((m) => musculos.includes(m));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="space-y-3 border-b border-linea p-4">
        {destino}
        <label className="relative block">
          <span className="sr-only">Buscar ejercicio por nombre</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tenue" />
          <input
            ref={refBusqueda}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimite(POR_TANDA);
            }}
            placeholder="Buscar ejercicio"
            autoComplete="off"
            className={`${claseControl} pl-9`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div className={claseSegmentado} role="group" aria-label="Cómo buscar">
            <button type="button" aria-pressed={modo === "nombre"} onClick={() => setModo("nombre")} className={claseSegmento(modo === "nombre")}>
              Lista
            </button>
            <button type="button" aria-pressed={modo === "musculo"} onClick={() => setModo("musculo")} className={claseSegmento(modo === "musculo")}>
              Por músculo
            </button>
          </div>
          <label htmlFor="catalogo-tipo" className="sr-only">
            Tipo de ejercicio
          </label>
          <select
            id="catalogo-tipo"
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setLimite(POR_TANDA);
            }}
            className={`${claseSelector.replace("w-full", "min-w-0 flex-1").replace("h-10", "h-9")} text-sm`}
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </select>
        </div>

        {sugerencia && musculosSugeridos.length > 0 && !usandoSugerencia && (
          <button
            type="button"
            onClick={() => {
              setModo("musculo");
              setMusculos(musculosSugeridos);
              setLimite(POR_TANDA);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-tinta/30 bg-tinta/[0.03] px-3 py-2 text-left text-sm hover:border-tinta/60"
          >
            <Sparkles aria-hidden className="size-4 shrink-0 text-tenue" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Ejercicios para «{sugerencia.dia}»</span>
              <span className="block truncate text-xs text-tenue">
                {musculosSugeridos.map((m) => nombreMusculo.get(m)).join(", ")}
              </span>
            </span>
          </button>
        )}

        {modo === "musculo" && (
          <div>
            <MapaCorporal musculos={catalogo.musculos} seleccionados={musculos} alAlternar={alternarMusculo} className="mx-auto max-w-64" />
            {musculos.length > 0 && (
              <ul aria-label="Músculos elegidos" className="mt-2 flex flex-wrap gap-1.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setMusculos([])}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-linea px-2 text-xs text-tenue hover:text-tinta"
                  >
                    <RotateCcw aria-hidden className="size-3" /> Limpiar
                  </button>
                </li>
                {musculos.map((slug) => (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => alternarMusculo(slug)}
                      aria-label={`Quitar ${nombreMusculo.get(slug) ?? slug}`}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-tinta pr-1.5 pl-2.5 text-xs font-medium text-sobre-tinta"
                    >
                      {nombreMusculo.get(slug) ?? slug}
                      <X aria-hidden className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {sinMusculos ? (
        <p className="p-4 text-sm text-tenue">Toca los músculos que quieres trabajar y te sugerimos ejercicios, los más completos primero.</p>
      ) : resultados.length === 0 ? (
        <p className="p-4 text-sm text-tenue">Ningún ejercicio coincide. Prueba con otro nombre o quita filtros.</p>
      ) : (
        <>
          <p className="etiqueta px-4 pt-3 pb-1">
            {modo === "musculo" ? "Sugeridos" : "Ejercicios"} · {resultados.length}
          </p>
          <ul className="divide-y divide-linea">
            {resultados.slice(0, limite).map((e) => {
              const veces = enDia.get(e.id) ?? 0;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => alAnadir(e)}
                    className="group flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-fondo/60 focus-visible:bg-fondo/60"
                  >
                    <MiniaturaMusculos resaltados={resaltadosDe(e.id)} className="h-10 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{e.nombre}</span>
                      <span className="block truncate text-xs text-tenue">
                        {principalesDe.get(e.id) || ETIQUETA_TIPO[e.tipo]}
                      </span>
                    </span>
                    {veces > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-xs text-exito" title="Ya está en este día">
                        <Check aria-hidden className="size-3.5" />
                        <span className="sr-only">Ya está en este día</span>
                        {veces > 1 ? `×${veces}` : ""}
                      </span>
                    )}
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded-lg border border-linea text-tenue transition-colors group-hover:border-tinta group-hover:bg-tinta group-hover:text-sobre-tinta"
                    >
                      <Plus className="size-4" />
                    </span>
                    <span className="sr-only">Añadir</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {resultados.length > limite && (
            <button
              type="button"
              onClick={() => setLimite(limite + POR_TANDA)}
              className="w-full border-t border-linea px-4 py-2.5 text-sm font-medium text-tenue hover:bg-fondo/60 hover:text-tinta"
            >
              Mostrar más ({resultados.length - limite})
            </button>
          )}
        </>
      )}
    </div>
  );
}
