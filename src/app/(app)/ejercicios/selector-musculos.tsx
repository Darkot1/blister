"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { MapaCorporal, type MusculoMapa } from "@/components/anatomia/mapa-corporal";
import { SLUGS_DIBUJADOS } from "@/components/anatomia/trazos";
import { claseSelector } from "@/components/ui/campo";

/**
 * Biblioteca de ejercicios con el mapa a la izquierda y, sobre la lista, la barra de filtros:
 * músculos profundos, músculos elegidos y tipos. La selección vive en la URL (?m=slug,slug) para
 * que la búsqueda sea compartible; mapa y barra comparten el mismo estado optimista.
 */
export function ExploradorEjercicios({
  musculos,
  seleccionados,
  busqueda,
  tipos,
  children,
}: {
  musculos: MusculoMapa[];
  seleccionados: string[];
  /** Cuadro de búsqueda (servidor). */
  busqueda: React.ReactNode;
  /** Filtros por tipo (servidor). */
  tipos: React.ReactNode;
  /** La lista de resultados (servidor). */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [optimistas, setOptimistas] = useOptimistic(seleccionados);
  const nombre = new Map(musculos.map((m) => [m.slug, m.nombre]));
  const profundos = musculos.filter((m) => !SLUGS_DIBUJADOS.has(m.slug));

  const aplicar = (siguientes: string[]) => {
    iniciar(() => {
      setOptimistas(siguientes);
      const parametros = new URLSearchParams(window.location.search);
      if (siguientes.length) parametros.set("m", siguientes.join(","));
      else parametros.delete("m");
      parametros.delete("pagina"); // la lista cambia: vuelve a la primera página
      const consulta = parametros.toString();
      router.replace(consulta ? `/ejercicios?${consulta}` : "/ejercicios", { scroll: false });
    });
  };

  const alternar = (slug: string) =>
    aplicar(optimistas.includes(slug) ? optimistas.filter((s) => s !== slug) : [...optimistas, slug]);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* En escritorio el mapa se queda a la vista y, si no cabe, se desplaza dentro de su panel. */}
      <aside
        aria-label="Buscar por músculo"
        className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:overscroll-contain"
      >
        <p className="etiqueta mb-1">Mapa muscular</p>
        <MapaCorporal musculos={musculos} seleccionados={optimistas} alAlternar={alternar} mostrarProfundos={false} />
      </aside>

      <div className="min-w-0">
        {busqueda}

        {/* Músculos (profundos y elegidos) a la izquierda de los tipos: todo filtro queda a la vista. */}
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          {profundos.length > 0 && (
            <div>
              <label htmlFor="musculo-profundo" className="sr-only">Añadir un músculo profundo</label>
              <select
                id="musculo-profundo"
                value=""
                onChange={(e) => e.target.value && alternar(e.target.value)}
                className={`${claseSelector.replace("w-full", "w-auto")} h-8 text-sm`}
              >
                <option value="">Músculos profundos</option>
                {profundos.map((m) => (
                  <option key={m.slug} value={m.slug} disabled={optimistas.includes(m.slug)}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {optimistas.length > 0 && (
            <ul aria-label="Músculos elegidos" className="contents">
              {optimistas.map((slug) => (
                <li key={slug}>
                  <button
                    type="button"
                    onClick={() => alternar(slug)}
                    aria-label={`Quitar ${nombre.get(slug) ?? slug}`}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-tinta pr-2 pl-3 text-sm font-medium text-sobre-tinta hover:bg-tinta/85"
                  >
                    {nombre.get(slug) ?? slug}
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => aplicar([])}
                  aria-label="Quitar todos los músculos elegidos"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-linea bg-superficie px-2.5 text-sm text-tenue transition-colors hover:border-peligro/40 hover:bg-peligro/[0.06] hover:text-peligro"
                >
                  <RotateCcw aria-hidden className="size-3.5" />
                  Limpiar
                </button>
              </li>
            </ul>
          )}

          <span aria-hidden className="mx-1.5 hidden h-6 w-px bg-linea sm:block" />
          {tipos}
        </div>

        {optimistas.length === 0 && (
          <p className="-mt-3 mb-4 text-sm text-tenue">
            Elige músculos en el mapa (o un músculo profundo) para ver los ejercicios sugeridos.
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
