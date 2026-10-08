"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MapaCorporal, type MusculoMapa } from "@/components/anatomia/mapa-corporal";

/** Mapa corporal cuya selección vive en la URL (?m=slug,slug) para que la búsqueda sea compartible. */
export function SelectorMusculos({ musculos, seleccionados }: { musculos: MusculoMapa[]; seleccionados: string[] }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [optimistas, setOptimistas] = useOptimistic(seleccionados);
  const nombre = new Map(musculos.map((m) => [m.slug, m.nombre]));

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
    <div>
      {/* La selección va arriba: así "Limpiar" queda a la vista aunque el panel se desplace. */}
      <div className="mb-4 min-h-12 border-b border-linea pb-4">
        {optimistas.length === 0 ? (
          <p className="text-sm text-tenue">Elige uno o varios músculos para ver los ejercicios sugeridos.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="etiqueta">Seleccionados · {optimistas.length}</p>
              <button type="button" onClick={() => aplicar([])} className="text-sm font-medium text-tenue underline-offset-2 hover:text-tinta hover:underline">
                Limpiar
              </button>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {optimistas.map((slug) => (
                <li key={slug}>
                  <button
                    type="button"
                    onClick={() => alternar(slug)}
                    aria-label={`Quitar ${nombre.get(slug) ?? slug}`}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-tinta pr-1.5 pl-2.5 text-xs font-medium text-white hover:bg-tinta/85"
                  >
                    {nombre.get(slug) ?? slug}
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <MapaCorporal musculos={musculos} seleccionados={optimistas} alAlternar={alternar} />
    </div>
  );
}
