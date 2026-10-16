"use client";

import { useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { CLAVE_MENU as CLAVE } from "./scripts-iniciales";

/*
  Menú lateral plegado (solo escritorio): <html data-menu="plegado"> lo reduce a iconos.
  Los estilos cuelgan de ese atributo (variante `in-data-[menu=plegado]:`), así que el script
  de <head> (`scripts-iniciales.ts`) lo aplica antes de pintar y no hay parpadeo al recargar.
*/
const avisos = new Set<() => void>();

const estaPlegado = () => document.documentElement.dataset.menu === "plegado";

function alternar() {
  const plegar = !estaPlegado();
  if (plegar) document.documentElement.dataset.menu = "plegado";
  else delete document.documentElement.dataset.menu;
  try {
    if (plegar) localStorage.setItem(CLAVE, "plegado");
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento (modo privado): dura hasta recargar.
  }
  avisos.forEach((avisar) => avisar());
}

export function BotonPlegarMenu() {
  // En el servidor no se conoce: hasta hidratar no se anuncia el estado.
  const plegado = useSyncExternalStore(
    (avisar) => {
      avisos.add(avisar);
      return () => avisos.delete(avisar);
    },
    estaPlegado,
    () => null,
  );
  return (
    <button
      type="button"
      onClick={alternar}
      aria-expanded={plegado === null ? undefined : !plegado}
      aria-label={plegado ? "Desplegar el menú" : "Plegar el menú"}
      title={plegado ? "Desplegar el menú" : "Plegar el menú"}
      className="grid size-8 shrink-0 place-items-center rounded-full text-tenue transition-colors hover:bg-hueso hover:text-tinta"
    >
      {/* Los dos iconos van en el HTML y el atributo decide cuál se ve: así coincide desde el primer pintado. */}
      <PanelLeftClose aria-hidden className="size-[18px] in-data-[menu=plegado]:hidden" />
      <PanelLeftOpen aria-hidden className="hidden size-[18px] in-data-[menu=plegado]:block" />
    </button>
  );
}
