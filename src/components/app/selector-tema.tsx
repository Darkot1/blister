"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Tema = "claro" | "oscuro" | "sistema";
const CLAVE = "tema";
const avisos = new Set<() => void>();

/** Sin preferencia guardada, el tema es el oscuro (la identidad "cumbre" nace oscura). */
function leerTema(): Tema {
  const t = document.documentElement.dataset.tema;
  return t === "claro" || t === "sistema" ? t : "oscuro";
}

function aplicarTema(tema: Tema) {
  if (tema === "oscuro") delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;
  try {
    if (tema === "oscuro") localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, tema);
  } catch {
    // Sin almacenamiento (modo privado): el tema dura hasta recargar.
  }
  avisos.forEach((avisar) => avisar());
}

/** Se ejecuta en <head> antes de pintar, para que el tema guardado no parpadee. */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CLAVE}");if(t==="claro"||t==="sistema")document.documentElement.dataset.tema=t}catch(e){}`;

const OPCIONES: { tema: Tema; texto: string; icono: typeof Sun }[] = [
  { tema: "oscuro", texto: "Oscuro", icono: Moon },
  { tema: "claro", texto: "Claro", icono: Sun },
  { tema: "sistema", texto: "Sistema", icono: Monitor },
];

export function SelectorTema() {
  // En el servidor no se conoce: ninguna opción aparece marcada hasta hidratar.
  const actual = useSyncExternalStore(
    (avisar) => {
      avisos.add(avisar);
      return () => avisos.delete(avisar);
    },
    leerTema,
    () => null,
  );
  return (
    <div role="group" aria-label="Tema de color" className="grid grid-cols-3 gap-0.5 rounded-full bg-hueso p-0.5">
      {OPCIONES.map(({ tema, texto, icono: Icono }) => (
        <button
          key={tema}
          type="button"
          aria-pressed={actual === tema}
          title={texto}
          onClick={() => aplicarTema(tema)}
          className={`flex h-7 items-center justify-center gap-1.5 rounded-full text-xs transition-colors ${
            actual === tema ? "bg-tinta font-medium text-sobre-tinta" : "text-tenue hover:text-tinta"
          }`}
        >
          <Icono aria-hidden className="size-3.5" />
          <span className="sr-only sm:not-sr-only">{texto}</span>
        </button>
      ))}
    </div>
  );
}
