"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Diálogo modal sobre <dialog> nativo: atrapa el foco, cierra con Escape y
 * devuelve el foco al elemento que lo abrió. Clic en el fondo también cierra.
 * En móvil sube desde abajo como una hoja; en pantallas grandes queda centrado.
 */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-full rounded-t-[1.75rem] bg-superficie p-0 text-tinta shadow-2xl backdrop:bg-tinta/40 backdrop:backdrop-blur-[2px] sm:m-auto sm:w-[min(34rem,calc(100vw-2rem))] sm:rounded-[1.75rem]"
    >
      {abierto && (
        <div className="px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
          <span aria-hidden className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-tinta/15 sm:hidden" />
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id={idTitulo} className="text-[1.6rem] leading-tight font-bold tracking-tight">{titulo}</h2>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-tinta/[0.07] text-tenue hover:bg-tinta/[0.11] hover:text-tinta"
            >
              <X aria-hidden className="size-[18px]" strokeWidth={2.4} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
