"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Dialogo } from "@/components/ui/dialogo";
import { IconoApp } from "@/components/ui/icono-app";
import { Marca } from "./marca";
import { SECCIONES, SECCIONES_DOCK, esActiva } from "./secciones";

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

export function Navegacion({ cuenta, avatar }: { cuenta: React.ReactNode; avatar: React.ReactNode }) {
  const [menu, setMenu] = useState(false);

  return (
    <>
      {/* Escritorio: riel de iconos de app. */}
      {/* Con poca altura (p. ej. 1024×600) el riel se desplaza en lugar de esconder Ajustes y la salida. */}
      <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col items-center gap-2 overflow-y-auto py-5 [scrollbar-width:none] lg:flex">
        <Link href="/inicio" aria-label="Blister Fitness, inicio" className="mb-3 rounded-xl">
          <Marca conNombre={false} />
        </Link>
        <ConRuta>
          {(ruta) => (
            <nav aria-label="Principal" className="flex w-full flex-1 flex-col items-center gap-1 px-2">
              {SECCIONES.map((s) => {
                const activa = esActiva(ruta, s.href);
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    aria-current={activa ? "page" : undefined}
                    className={`group flex w-full flex-col items-center gap-1 rounded-2xl py-2 transition-colors ${
                      activa ? "bg-superficie shadow-[0_1px_3px_rgb(18_20_23/0.08)]" : "hover:bg-tinta/[0.04]"
                    } ${s.href === "/configuracion" ? "mt-auto" : ""}`}
                  >
                    <IconoApp
                      icono={s.icono}
                      tono={s.tono}
                      className={`transition-transform group-active:scale-90 ${activa ? "" : "opacity-90"}`}
                    />
                    <span className={`text-[0.7rem] leading-tight ${activa ? "font-semibold text-tinta" : "text-tenue"}`}>
                      {s.texto}
                    </span>
                  </Link>
                );
              })}
            </nav>
          )}
        </ConRuta>
        <div className="mt-2">{avatar}</div>
      </aside>

      {/* Móvil: dock flotante con las secciones de uso diario + menú en rejilla. */}
      <ConRuta>
        {(ruta) => (
          <nav
            aria-label="Principal"
            className="vidrio fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid h-[4.25rem] grid-cols-5 rounded-[1.75rem] border border-white/70 px-1 shadow-[0_8px_30px_-6px_rgb(18_20_23/0.25)] lg:hidden"
          >
            {SECCIONES.filter((s) => SECCIONES_DOCK.includes(s.href)).map(({ href, texto, icono: Icono, tono }) => {
              const activa = esActiva(ruta, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={activa ? "page" : undefined}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-3xl active:bg-tinta/[0.05]"
                  style={activa ? { color: tono } : undefined}
                >
                  <Icono aria-hidden className={`size-6 ${activa ? "" : "text-tinta/45"}`} strokeWidth={activa ? 2.3 : 2} />
                  <span className={`text-[0.68rem] ${activa ? "font-semibold" : "text-tenue"}`}>{texto}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-expanded={menu}
              aria-haspopup="dialog"
              className="flex flex-col items-center justify-center gap-0.5 rounded-3xl active:bg-tinta/[0.05]"
            >
              <LayoutGrid aria-hidden className="size-6 text-tinta/45" strokeWidth={2} />
              <span className="text-[0.68rem] text-tenue">Menú</span>
            </button>
          </nav>
        )}
      </ConRuta>

      <Dialogo abierto={menu} alCerrar={() => setMenu(false)} titulo="Menú">
        <div className="mb-6">{cuenta}</div>
        <nav aria-label="Todas las secciones">
          <ul className="grid grid-cols-4 gap-x-2 gap-y-5">
            {SECCIONES.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  onClick={() => setMenu(false)}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl text-center"
                >
                  <IconoApp icono={s.icono} tono={s.tono} tamano="lg" className="transition-transform group-active:scale-90" />
                  <span className="text-xs leading-tight font-medium">{s.texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Dialogo>
    </>
  );
}
