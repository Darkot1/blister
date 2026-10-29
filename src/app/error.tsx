"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Boton, EnlaceBoton } from "@/components/ui/boton";

/**
 * Error fuera de la app (portada, página pública /e/<slug>, ingreso, textos legales): misma voz que
 * el de la app, pero sin el menú y llevando a la portada.
 */
export default function ErrorPublico({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="contenido" role="alert" className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-xl border border-linea text-peligro">
          <TriangleAlert aria-hidden className="size-5" />
        </span>
        <h1 className="titulo-display text-[1.875rem] leading-[1.2]">Algo no salió bien</h1>
        <p className="mt-2 text-tenue">No pudimos cargar esta página. Revisa tu conexión e inténtalo de nuevo.</p>
        {error.digest && <p className="mt-3 tabular-nums text-xs text-tenue">Código: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Boton type="button" onClick={retry}>
            <RotateCcw aria-hidden className="size-4" /> Reintentar
          </Boton>
          <EnlaceBoton href="/" variante="secundario">
            Ir a la portada
          </EnlaceBoton>
        </div>
      </div>
    </main>
  );
}
