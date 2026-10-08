"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Diálogo modal sobre <dialog> nativo: atrapa el foco, cierra con Escape y
 * devuelve el foco al elemento que lo abrió. Clic en el fondo también cierra.
 * Centrado en pantallas grandes y como hoja inferior en móvil; con `lateral`,
 * es un cajón que entra por la izquierda (menú en móvil).
 */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  lateral = false,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: React.ReactNode;
  lateral?: boolean;
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
      className={
        lateral
          ? "my-0 mr-auto ml-0 h-dvh max-h-dvh w-[min(18rem,85vw)] border-r border-linea bg-superficie p-0 text-tinta backdrop:bg-tinta/40"
          : "mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-full rounded-t-2xl border border-linea bg-superficie p-0 text-tinta shadow-2xl backdrop:bg-tinta/40 sm:m-auto sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-2xl"
      }
    >
      {abierto && (
        <div className={lateral ? "flex h-full flex-col" : ""}>
          <div className="flex items-center justify-between gap-4 border-b border-linea px-5 py-3.5">
            <h2 id={idTitulo} className="text-base font-semibold tracking-tight">{titulo}</h2>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-tenue hover:bg-tinta/[0.06] hover:text-tinta"
            >
              <X aria-hidden className="size-[18px]" />
            </button>
          </div>
          <div className={lateral ? "min-h-0 flex-1 overflow-y-auto" : "px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"}>
          {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
