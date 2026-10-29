"use client";

import { useState, useTransition } from "react";
import { Boton } from "./boton";
import { DialogoConfirmar } from "./dialogo-confirmar";

type Resultado = { error?: string } | void;

/**
 * Botón para una Server Action sin formulario (activar, archivar, duplicar, desconectar…): se bloquea y
 * dice qué está pasando mientras guarda (un doble clic no la repite), puede pedir confirmación antes, y si
 * la acción devuelve un error lo muestra al lado en vez de tumbar la página.
 */
export function BotonAccion({
  accion,
  children,
  textoPendiente = "Guardando…",
  confirmacion,
  variante = "secundario",
  className = "",
}: {
  accion: () => Promise<Resultado>;
  children: React.ReactNode;
  textoPendiente?: string;
  /** Si se da, el cambio se confirma antes en un diálogo. */
  confirmacion?: { titulo: string; texto: string; textoConfirmar?: string };
  variante?: "primario" | "secundario" | "peligro";
  className?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = () =>
    iniciar(async () => {
      setError(null);
      const resultado = await accion();
      setConfirmando(false);
      if (resultado?.error) setError(resultado.error);
    });

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Boton variante={variante} className={className} disabled={pendiente} onClick={() => (confirmacion ? setConfirmando(true) : ejecutar())}>
        {pendiente && !confirmacion ? textoPendiente : children}
      </Boton>
      {error && (
        <span role="alert" className="text-sm text-peligro">
          {error}
        </span>
      )}
      {confirmacion && (
        <DialogoConfirmar
          abierto={confirmando}
          titulo={confirmacion.titulo}
          textoConfirmar={pendiente ? textoPendiente : (confirmacion.textoConfirmar ?? children)}
          pendiente={pendiente}
          alCerrar={() => setConfirmando(false)}
          alConfirmar={ejecutar}
        >
          <p>{confirmacion.texto}</p>
        </DialogoConfirmar>
      )}
    </span>
  );
}
