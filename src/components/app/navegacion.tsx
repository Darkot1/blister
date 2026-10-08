"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { Dialogo } from "@/components/ui/dialogo";
import { Marca } from "./marca";
import { SelectorTema } from "./selector-tema";
import { AJUSTES, GRUPOS, esActiva, type Seccion } from "./secciones";

/** La ruta actual solo se conoce en tiempo de ejecución: mientras llega, nada se muestra resaltado. */
function ConRuta({ children }: { children: (ruta: string) => React.ReactNode }) {
  return (
    <Suspense fallback={children("")}>
      <RutaActual>{children}</RutaActual>
    </Suspense>
  );
}

function RutaActual({ children }: { children: (ruta: string) => React.ReactNode }) {
  return children(usePathname());
}

function Enlace({ s, ruta, alNavegar }: { s: Seccion; ruta: string; alNavegar?: () => void }) {
  const activa = esActiva(ruta, s.href);
  const Icono = s.icono;
  return (
    <Link
      href={s.href}
      onClick={alNavegar}
      aria-current={activa ? "page" : undefined}
      className={`group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors ${
        activa ? "bg-tinta font-medium text-sobre-tinta" : "text-tinta/75 hover:bg-tinta/[0.05] hover:text-tinta"
      }`}
    >
      <Icono aria-hidden className={`size-[17px] shrink-0 ${activa ? "text-acento" : "text-tenue group-hover:text-tinta"}`} />
      {s.texto}
    </Link>
  );
}

function MenuSecciones({ ruta, alNavegar }: { ruta: string; alNavegar?: () => void }) {
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-5">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="etiqueta mb-1.5 px-2.5">{g.titulo}</p>
          <ul className="space-y-0.5">
            {g.secciones.map((s) => (
              <li key={s.href}><Enlace s={s} ruta={ruta} alNavegar={alNavegar} /></li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-auto">
        <Enlace s={AJUSTES} ruta={ruta} alNavegar={alNavegar} />
      </div>
    </nav>
  );
}

export function Navegacion({ cuenta }: { cuenta: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* Escritorio: barra lateral fija; se desplaza sola si la pantalla es baja. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-linea bg-superficie px-3 py-4 lg:flex">
        <Link href="/inicio" className="mb-7 rounded-lg px-1.5">
          <Marca />
        </Link>
        <ConRuta>{(ruta) => <MenuSecciones ruta={ruta} />}</ConRuta>
        <div className="mt-3 space-y-3 border-t border-linea pt-3">
          <SelectorTema />
          {cuenta}
        </div>
      </aside>

      {/* Móvil: barra superior y cajón lateral. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-linea bg-fondo/90 px-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          aria-haspopup="dialog"
          className="grid size-9 place-items-center rounded-lg hover:bg-tinta/[0.06]"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <Link href="/inicio" className="rounded-lg">
          <Marca />
        </Link>
      </header>

      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Menú" lateral>
        <div className="flex min-h-full flex-col px-3 py-4">
          <ConRuta>{(ruta) => <MenuSecciones ruta={ruta} alNavegar={() => setAbierto(false)} />}</ConRuta>
          <div className="mt-3 space-y-3 border-t border-linea pt-3">
          <SelectorTema />
          {cuenta}
        </div>
        </div>
      </Dialogo>
    </>
  );
}
