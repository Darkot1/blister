"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./dialogo.module.css";

/**
 * Diálogo modal sobre <dialog> nativo: atrapa el foco, cierra con Escape y
 * devuelve el foco al elemento que lo abrió. Clic en el fondo también cierra.
 * En móvil (< 640 px) se presenta como hoja inferior.
 */
export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  ancho = "normal",
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: React.ReactNode;
  /** `amplio` para contenido con tablas o dos columnas. */
  ancho?: "normal" | "amplio";
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
      className={cx(css.dialogo, ancho === "amplio" && css.ancho)}
    >
      {abierto && (
        <div className={css.cuerpo}>
          <div className={css.cabecera}>
            <h2 id={idTitulo} className={css.titulo}>
              {titulo}
            </h2>
            <button type="button" onClick={alCerrar} aria-label="Cerrar" className={css.cerrar}>
              <X aria-hidden />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
