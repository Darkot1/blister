"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar";
import { eliminarRutina } from "../../acciones";

/** "Eliminar" con confirmación en diálogo: borrar no se deshace (archivar sí). */
export function EliminarRutina({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Boton type="button" variante="peligro" onClick={() => setAbierto(true)}>
        <Trash2 aria-hidden className="size-4" /> Eliminar
      </Boton>
      <DialogoConfirmar
        abierto={abierto}
        titulo="¿Eliminar esta rutina?"
        textoConfirmar={<><Trash2 aria-hidden className="size-4" /> Eliminar rutina</>}
        pendiente={pendiente}
        alCerrar={() => setAbierto(false)}
        alConfirmar={() =>
          iniciar(async () => {
            // Si sale bien, la acción redirige a la lista; aquí solo llega un error.
            const resultado = await eliminarRutina(id);
            setError(resultado?.error ?? null);
          })
        }
      >
        {error && <div className="mb-3"><Aviso>{error}</Aviso></div>}
        <p>
          <span className="font-medium text-tinta">«{nombre}»</span> se borrará con todos sus días y ejercicios. No se puede deshacer.
        </p>
        <p className="mt-2 text-tenue">Los planes que ya asignaste con ella se conservan tal cual. Si solo quieres sacarla de la lista, archívala.</p>
      </DialogoConfirmar>
    </>
  );
}
