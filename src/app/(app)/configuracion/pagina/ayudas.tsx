"use client";

import { useState } from "react";
import { Check, Copy, Lightbulb } from "lucide-react";

/** Copiar al portapapeles con confirmación breve ("Copiado"). Sin permiso, no hace nada: el texto sigue visible. */
export function useCopiar() {
  const [copiado, setCopiado] = useState<string | null>(null);
  const copiar = async (texto: string, cual = "general") => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado((c) => (c === cual ? null : c)), 1800);
    } catch {
      // Sin portapapeles: el texto está a la vista para copiarlo a mano.
    }
  };
  return { copiado, copiar };
}

/**
 * Cómo escribir algo que atraiga alumnos: unas pocas reglas concretas, plegables para no estorbar a
 * quien ya sabe. Abierto la primera vez (al crear la página), cerrado al editar.
 */
export function Consejo({ titulo = "Cómo escribirlo para atraer alumnos", abierto = false, children }: { titulo?: string; abierto?: boolean; children: React.ReactNode }) {
  return (
    <details open={abierto} className="group rounded-2xl bg-hueso/60 px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-grafito [&::-webkit-details-marker]:hidden">
        <Lightbulb aria-hidden className="size-4 shrink-0 text-tenue" />
        <span className="min-w-0 flex-1">{titulo}</span>
        <span aria-hidden className="text-xs text-tenue group-open:hidden">Ver</span>
        <span aria-hidden className="hidden text-xs text-tenue group-open:inline">Ocultar</span>
      </summary>
      <div className="mt-2.5 space-y-2 text-grafito [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </details>
  );
}

/** Ejemplos que se pueden tomar con un toque y luego adaptar. */
export function Ejemplos({ ejemplos, alElegir, etiqueta = "Ejemplos (tócalo para usarlo y luego adáptalo)" }: { ejemplos: readonly string[]; alElegir: (texto: string) => void; etiqueta?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-tenue">{etiqueta}</p>
      <ul className="flex flex-wrap gap-1.5">
        {ejemplos.map((e) => (
          <li key={e} className="min-w-0 max-w-full">
            <button
              type="button"
              onClick={() => alElegir(e)}
              className="max-w-full rounded-2xl border border-linea px-3 py-1.5 text-left text-xs text-grafito transition-colors hover:border-linea-fuerte hover:text-tinta"
            >
              {e}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Un texto listo para copiar y enviar (p. ej., el mensaje para pedir un testimonio). */
export function TextoCopiable({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const { copiado, copiar } = useCopiar();
  return (
    <div className="rounded-2xl border border-linea p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-tenue">{etiqueta}</p>
        <button
          type="button"
          onClick={() => copiar(texto)}
          className="tactil inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-grafito transition-colors hover:bg-hueso hover:text-tinta"
        >
          {copiado ? <Check aria-hidden className="size-3.5 text-exito" /> : <Copy aria-hidden className="size-3.5" />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
      <p className="mt-1.5 text-sm whitespace-pre-line text-grafito">{texto}</p>
      <span role="status" className="sr-only">{copiado ? "Texto copiado" : ""}</span>
    </div>
  );
}
