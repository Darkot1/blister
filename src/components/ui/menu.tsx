"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, MoreHorizontal, type LucideIcon } from "lucide-react";
import { clasesBoton } from "./boton";

/**
 * Menú de acciones "⋯": guarda las acciones secundarias de una fila (mover, duplicar, quitar…)
 * para que la pantalla muestre solo lo que se edita. Teclado: flechas, Inicio/Fin, Escape y Tab cierran.
 * Se abre hacia arriba si no cabe debajo.
 */
const opcionesDe = (menu: HTMLElement | null) => [...(menu?.querySelectorAll<HTMLButtonElement>("[role^=menuitem]:not(:disabled)") ?? [])];

export function MenuAcciones({
  etiqueta,
  texto,
  children,
  className = "",
}: {
  /** Nombre accesible del menú (y del botón "⋯"): "Acciones de Press de banca". */
  etiqueta: string;
  /** Con texto, el disparador es un botón secundario ("+ Añadir bloque") en lugar de "⋯". */
  texto?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [arriba, setArriba] = useState(false);
  const refBoton = useRef<HTMLButtonElement>(null);
  const refMenu = useRef<HTMLDivElement>(null);
  const idMenu = useId();


  const cerrar = (devolverFoco = true) => {
    setAbierto(false);
    if (devolverFoco) refBoton.current?.focus();
  };

  useEffect(() => {
    if (!abierto) return;
    opcionesDe(refMenu.current)[0]?.focus();
    const fuera = (e: PointerEvent) => {
      if (!refMenu.current?.contains(e.target as Node) && !refBoton.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  const alTeclear = (e: React.KeyboardEvent) => {
    const lista = opcionesDe(refMenu.current);
    const actual = lista.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (i: number) => {
      e.preventDefault();
      lista[(i + lista.length) % lista.length]?.focus();
    };
    if (e.key === "ArrowDown") ir(actual + 1);
    else if (e.key === "ArrowUp") ir(actual - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(lista.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    } else if (e.key === "Tab") cerrar(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={refBoton}
        type="button"
        aria-label={texto ? undefined : etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        onClick={() => {
          const caja = refBoton.current?.getBoundingClientRect();
          setArriba(Boolean(caja && caja.bottom + 300 > window.innerHeight && caja.top > 300));
          setAbierto(!abierto);
        }}
        className={
          texto
            ? clasesBoton("secundario", abierto ? "border-linea-fuerte text-tinta" : "")
            : `grid size-8 shrink-0 place-items-center rounded-lg text-tenue transition-colors hover:bg-hueso hover:text-tinta ${abierto ? "bg-hueso text-tinta" : ""}`
        }
      >
        {texto ?? <MoreHorizontal aria-hidden className="size-4" />}
      </button>
      {abierto && (
        <div
          ref={refMenu}
          id={idMenu}
          role="menu"
          aria-label={etiqueta}
          onKeyDown={alTeclear}
          // Cualquier opción elegida cierra el menú.
          onClick={(e) => (e.target as HTMLElement).closest("[role^=menuitem]") && cerrar()}
          className={`absolute ${texto ? "left-0" : "right-0"} z-40 min-w-52 rounded-xl border border-linea bg-superficie p-1 text-sm shadow-flotante ${
            arriba ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** Opción del menú. `marcada` la vuelve una opción de elección única (p. ej. el tipo de bloque). */
export function OpcionMenu({
  icono: Icono,
  children,
  alElegir,
  disabled = false,
  peligro = false,
  marcada,
}: {
  icono?: LucideIcon;
  children: React.ReactNode;
  alElegir: () => void;
  disabled?: boolean;
  peligro?: boolean;
  marcada?: boolean;
}) {
  const esRadio = marcada !== undefined;
  return (
    <button
      type="button"
      role={esRadio ? "menuitemradio" : "menuitem"}
      aria-checked={esRadio ? marcada : undefined}
      tabIndex={-1}
      disabled={disabled}
      onClick={alElegir}
      className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left outline-none transition-colors disabled:pointer-events-none disabled:opacity-35 ${
        peligro ? "text-peligro hover:bg-peligro/[0.07] focus:bg-peligro/[0.07]" : "text-grafito hover:bg-hueso hover:text-tinta focus:bg-hueso focus:text-tinta"
      }`}
    >
      {Icono && <Icono aria-hidden className="size-4 shrink-0" />}
      <span className="flex-1">{children}</span>
      {marcada && <Check aria-hidden className="size-4 shrink-0" />}
    </button>
  );
}

/** Separador y título de grupo dentro del menú. */
export function GrupoMenu({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={titulo} className="border-t border-linea pt-1 mt-1 first:mt-0 first:border-t-0 first:pt-0">
      {titulo && <p className="etiqueta px-2.5 pt-1.5 pb-1">{titulo}</p>}
      {children}
    </div>
  );
}
