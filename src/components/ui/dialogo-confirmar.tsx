"use client";

import { Boton } from "./boton";
import { Dialogo } from "./dialogo";

/**
 * Confirmación antes de una acción que no se deshace fácil (cancelar una cita, eliminar una rutina).
 * Reemplaza a `window.confirm`: mismo diálogo animado que el resto de la app, texto propio y botones
 * con nombre de acción. Puede abrirse encima de otro diálogo.
 */
export function DialogoConfirmar({
  abierto,
  titulo,
  children,
  textoConfirmar,
  textoVolver = "Volver",
  pendiente = false,
  alConfirmar,
  alCerrar,
}: {
  abierto: boolean;
  titulo: string;
  /** Qué pasará si confirma: una o dos frases. */
  children: React.ReactNode;
  textoConfirmar: React.ReactNode;
  textoVolver?: string;
  /** Mientras la acción se guarda: los botones se bloquean. */
  pendiente?: boolean;
  alConfirmar: () => void;
  alCerrar: () => void;
}) {
  return (
    <Dialogo abierto={abierto} alCerrar={() => !pendiente && alCerrar()} titulo={titulo}>
      <div className="text-sm text-grafito">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Boton type="button" variante="secundario" disabled={pendiente} onClick={alCerrar} autoFocus>
          {textoVolver}
        </Boton>
        <Boton type="button" variante="peligro" disabled={pendiente} onClick={alConfirmar}>
          {pendiente ? "Guardando…" : textoConfirmar}
        </Boton>
      </div>
    </Dialogo>
  );
}
