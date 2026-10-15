"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Boton, EnlaceBoton } from "@/components/ui/boton";
import { Tarjeta } from "@/components/ui/tarjeta";

/**
 * Si una pantalla falla (sin conexión, la base de datos rechazó un cambio…), se muestra esto
 * en lugar de la página de error genérica; el menú sigue disponible.
 */
export default function ErrorPantalla({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Tarjeta role="alert" className="mx-auto mt-6 max-w-xl p-6 sm:p-8">
      <span className="mb-4 grid size-11 place-items-center rounded-xl border border-linea text-peligro">
        <TriangleAlert aria-hidden className="size-5" />
      </span>
      <h1 className="titulo-serif text-[1.75rem] leading-[1.2]">Algo no salió bien</h1>
      <p className="mt-2 text-tenue">
        No pudimos cargar o guardar esto. Revisa tu conexión e inténtalo de nuevo; si sigue pasando, vuelve al panel.
      </p>
      {error.digest && <p className="mt-3 tabular-nums text-xs text-tenue">Código: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        <Boton type="button" onClick={retry}>
          <RotateCcw aria-hidden className="size-4" /> Reintentar
        </Boton>
        <EnlaceBoton href="/inicio" variante="secundario">
          Ir al panel
        </EnlaceBoton>
      </div>
    </Tarjeta>
  );
}
