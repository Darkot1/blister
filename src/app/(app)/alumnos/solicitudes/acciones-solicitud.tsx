"use client";

import { useState, useTransition } from "react";
import { ArchiveRestore, UserPlus, X } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";

type Accion = () => Promise<{ error?: string }>;

/**
 * Botones de una solicitud: agregarla como alumno, descartarla o devolverla a nuevas.
 * Las acciones llegan ya enlazadas a su solicitud desde el servidor (el id no sale del navegador).
 */
export function AccionesSolicitud({
  estado,
  principal,
  aceptar,
  descartar,
  restaurar,
}: {
  estado: "nueva" | "descartada";
  principal: boolean;
  aceptar: Accion;
  descartar: Accion;
  restaurar: Accion;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ejecutar = (accion: Accion) =>
    iniciar(async () => {
      setError(null);
      setError((await accion())?.error ?? null);
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {estado === "nueva" ? (
          <>
            <Boton variante={principal ? "primario" : "secundario"} disabled={pendiente} onClick={() => ejecutar(aceptar)}>
              <UserPlus aria-hidden className="size-4" /> Agregar como alumno
            </Boton>
            <Boton variante="fantasma" disabled={pendiente} onClick={() => ejecutar(descartar)}>
              <X aria-hidden className="size-4" /> Descartar
            </Boton>
          </>
        ) : (
          <Boton variante="secundario" disabled={pendiente} onClick={() => ejecutar(restaurar)}>
            <ArchiveRestore aria-hidden className="size-4" /> Devolver a nuevas
          </Boton>
        )}
      </div>
      {error && <Aviso>{error}</Aviso>}
    </div>
  );
}
