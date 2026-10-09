"use client";

import { useActionState, useState } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Dialogo } from "@/components/ui/dialogo";
import { AreaTexto } from "@/components/ui/campo";
import { cambiarEstadoEspacio } from "../../acciones";

/** Suspender (con motivo obligatorio) o reactivar un espacio, con confirmación. */
export function CambioEstado({ id, nombre, estado, esPropio }: { id: string; nombre: string; estado: string; esPropio: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [resultado, enviar] = useActionState(async (previo: Parameters<typeof cambiarEstadoEspacio>[0], datos: FormData) => {
    const r = await cambiarEstadoEspacio(previo, datos);
    if (r.ok) setAbierto(false);
    return r;
  }, {});

  if (estado === "archivado") return null;
  const suspender = estado === "activo";

  if (esPropio && suspender) {
    return <p className="text-sm text-tenue">Es tu propio espacio: no puedes suspenderlo.</p>;
  }

  return (
    <>
      <Boton variante={suspender ? "peligro" : "acento"} onClick={() => setAbierto(true)}>
        {suspender ? <PauseCircle aria-hidden className="size-4" /> : <PlayCircle aria-hidden className="size-4" />}
        {suspender ? "Suspender espacio" : "Reactivar espacio"}
      </Boton>
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo={suspender ? "Suspender espacio" : "Reactivar espacio"}>
        <form action={enviar} className="space-y-4 p-5">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="estado" value={suspender ? "suspendido" : "activo"} />
          <p className="text-sm text-tenue">
            {suspender ? (
              <>
                Los miembros de <strong className="text-tinta">{nombre}</strong> dejarán de ver sus datos hasta que lo
                reactives. No se borra nada.
              </>
            ) : (
              <>Los miembros de <strong className="text-tinta">{nombre}</strong> recuperarán el acceso de inmediato.</>
            )}
          </p>
          <AreaTexto
            etiqueta={suspender ? "Motivo" : "Motivo (opcional)"}
            nombre="motivo"
            rows={3}
            maxLength={500}
            required={suspender}
            placeholder={suspender ? "Ej.: pago pendiente, uso indebido…" : undefined}
            ayuda="Queda en la bitácora de accesos."
          />
          {resultado.error && <Aviso>{resultado.error}</Aviso>}
          <div className="flex justify-end gap-2">
            <Boton type="button" variante="fantasma" onClick={() => setAbierto(false)}>Cancelar</Boton>
            <BotonEnvio textoPendiente="Guardando…">{suspender ? "Suspender" : "Reactivar"}</BotonEnvio>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
