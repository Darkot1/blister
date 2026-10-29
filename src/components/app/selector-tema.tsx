"use client";

import { Moon, Sun } from "lucide-react";
import { CLAVE_TEMA as CLAVE } from "./scripts-iniciales";

/** Sin preferencia guardada, el tema es el oscuro (la identidad "cumbre" nace oscura). */
function esClaro(): boolean {
  const t = document.documentElement.dataset.tema;
  // "sistema" ya no se ofrece, pero puede seguir guardado de antes: se resuelve con el dispositivo.
  return t === "claro" || (t === "sistema" && matchMedia("(prefers-color-scheme: light)").matches);
}

function alternar() {
  const claro = !esClaro();
  if (claro) document.documentElement.dataset.tema = "claro";
  else delete document.documentElement.dataset.tema;
  try {
    if (claro) localStorage.setItem(CLAVE, "claro");
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento (modo privado): el tema dura hasta recargar.
  }
}

/**
 * Un solo botón: muestra el sol en oscuro (pasar a claro) y la luna en claro (pasar a oscuro).
 * `className`: tamaño y fondo al pasar el ratón (dentro de una cápsula hueso, el hover va en superficie).
 */
export function SelectorTema({ className = "size-8 hover:bg-hueso" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar tema"
      className={`grid shrink-0 place-items-center rounded-full text-tenue transition-colors hover:text-tinta ${className}`}
    >
      {/* Los dos iconos van en el HTML y el atributo decide cuál se ve: así coincide desde el primer pintado. */}
      <Sun
        aria-hidden
        className="size-[18px] in-data-[tema=claro]:hidden in-data-[tema=sistema]:[@media(prefers-color-scheme:light)]:hidden"
      />
      <Moon
        aria-hidden
        className="hidden size-[18px] in-data-[tema=claro]:block in-data-[tema=sistema]:[@media(prefers-color-scheme:light)]:block"
      />
    </button>
  );
}
