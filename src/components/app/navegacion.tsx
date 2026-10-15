"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { Dialogo } from "@/components/ui/dialogo";
import { Marca } from "./marca";
import { SelectorTema } from "./selector-tema";
import { ADMIN, AJUSTES, GRUPOS, PRINCIPALES, SECCIONES, esActiva, type Seccion } from "./secciones";

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

/** Mientras carga la sección elegida: un punto que late, siempre presente para no mover el texto. */
function Cargando() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-auto size-1.5 shrink-0 rounded-full bg-acento transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`}
    />
  );
}

function Enlace({ s, ruta }: { s: Seccion; ruta: string }) {
  const activa = esActiva(ruta, s.href);
  const Icono = s.icono;
  return (
    <Link
      href={s.href}
      aria-current={activa ? "page" : undefined}
      className={`group flex h-9 items-center gap-2.5 rounded-full px-3 text-sm transition-colors duration-200 ${
        activa ? "bg-hueso font-medium text-tinta" : "text-grafito hover:bg-hueso/50 hover:text-tinta"
      }`}
    >
      <Icono aria-hidden className={`size-[17px] shrink-0 ${activa ? "text-acento" : "text-tenue group-hover:text-tinta"}`} />
      {s.texto}
      {s.pronto && <span className="rounded bg-hueso px-1.5 py-px text-[0.65rem] font-medium text-tenue">Pronto</span>}
      <Cargando />
    </Link>
  );
}

/** Enlace de la sección de administración; el servidor decide si se muestra. */
export function EnlaceAdmin() {
  return <ConRuta>{(ruta) => <Enlace s={ADMIN} ruta={ruta} />}</ConRuta>;
}

function MenuSecciones({ ruta, admin }: { ruta: string; admin: React.ReactNode }) {
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-5">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="etiqueta mb-1.5 px-2.5">{g.titulo}</p>
          <ul className="space-y-0.5">
            {g.secciones.map((s) => (
              <li key={s.href}><Enlace s={s} ruta={ruta} /></li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-auto space-y-0.5">
        {admin}
        <Enlace s={AJUSTES} ruta={ruta} />
      </div>
    </nav>
  );
}

export function Navegacion({ cuenta, admin }: { cuenta: React.ReactNode; admin: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {/* Escritorio: barra lateral fija; se desplaza sola si la pantalla es baja. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-linea bg-fondo px-3 py-5 lg:flex">
        <Link href="/inicio" className="mb-7 rounded-lg px-1.5">
          <Marca />
        </Link>
        <ConRuta>{(ruta) => <MenuSecciones ruta={ruta} admin={admin} />}</ConRuta>
        <div className="mt-3 space-y-3 border-t border-linea pt-3">
          <SelectorTema />
          {cuenta}
        </div>
      </aside>

      {/* Móvil: barra superior con la marca y barra inferior con las secciones principales. */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-linea bg-fondo/90 px-4 backdrop-blur lg:hidden">
        <Link href="/inicio" className="rounded-lg">
          <Marca />
        </Link>
      </header>

      <nav
        aria-label="Secciones principales"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-fondo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          <ConRuta>
            {(ruta) =>
              PRINCIPALES.map((href) => {
                const s = SECCIONES.find((x) => x.href === href)!;
                return (
                  <li key={href}>
                    <EnlaceInferior s={s} activa={esActiva(ruta, href)} />
                  </li>
                );
              })
            }
          </ConRuta>
          <li>
            <button
              type="button"
              onClick={() => setAbierto(true)}
              aria-expanded={abierto}
              aria-haspopup="dialog"
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-tenue"
            >
              <span className="grid h-7 w-12 place-items-center rounded-full">
                <Menu aria-hidden className="size-5" />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>

      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Menú" lateral>
        {/* Cualquier enlace del cajón lo cierra, también los que llegan del servidor (cuenta, administración). */}
        <div
          className="flex min-h-full flex-col px-3 py-4"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setAbierto(false)}
        >
          <ConRuta>{(ruta) => <MenuSecciones ruta={ruta} admin={admin} />}</ConRuta>
          <div className="mt-3 space-y-3 border-t border-linea pt-3">
            <SelectorTema />
            {cuenta}
          </div>
        </div>
      </Dialogo>
    </>
  );
}

/** Pestaña de la barra inferior: icono en una cápsula hueso cuando está activa, y el nombre debajo. */
function EnlaceInferior({ s, activa }: { s: Seccion; activa: boolean }) {
  const Icono = s.icono;
  return (
    <Link
      href={s.href}
      aria-current={activa ? "page" : undefined}
      className={`flex h-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium ${activa ? "text-tinta" : "text-tenue"}`}
    >
      <span className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors ${activa ? "bg-hueso" : ""}`}>
        <Icono aria-hidden className={`size-5 ${activa ? "text-acento" : ""}`} />
        <PuntoCargando />
      </span>
      <span className="max-w-full truncate px-1">{s.href === "/entrenamiento" ? "Rutinas" : s.texto}</span>
    </Link>
  );
}

function PuntoCargando() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`absolute top-0 right-1.5 size-1.5 rounded-full bg-acento transition-opacity ${pending ? "animate-pulse opacity-100" : "opacity-0"}`}
    />
  );
}
