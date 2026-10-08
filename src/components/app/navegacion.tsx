"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import {
  CalendarDays,
  Dumbbell,
  House,
  LineChart,
  ListChecks,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

const SECCIONES = [
  { href: "/inicio", texto: "Inicio", icono: House },
  { href: "/alumnos", texto: "Alumnos", icono: Users },
  { href: "/entrenamiento", texto: "Entrenamiento", icono: ListChecks },
  { href: "/ejercicios", texto: "Ejercicios", icono: Dumbbell },
  { href: "/calendario", texto: "Calendario", icono: CalendarDays },
  { href: "/progreso", texto: "Progreso", icono: LineChart },
];

/** La ruta actual solo se conoce en tiempo de ejecución: mientras llega, los enlaces se muestran sin resaltar. */
function Enlaces({ alNavegar }: { alNavegar?: () => void }) {
  return (
    <Suspense fallback={<ListaEnlaces ruta="" alNavegar={alNavegar} />}>
      <EnlacesConRuta alNavegar={alNavegar} />
    </Suspense>
  );
}

function EnlacesConRuta({ alNavegar }: { alNavegar?: () => void }) {
  return <ListaEnlaces ruta={usePathname()} alNavegar={alNavegar} />;
}

function ListaEnlaces({ ruta, alNavegar }: { ruta: string; alNavegar?: () => void }) {
  const clase = (href: string) => {
    const activo = ruta === href || ruta.startsWith(`${href}/`);
    return `flex items-center gap-3 rounded-md px-3 h-10 text-[0.95rem] transition-colors ${
      activo ? "bg-white/10 text-white font-semibold" : "text-white/70 hover:text-white hover:bg-white/5"
    }`;
  };
  return (
    <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
      {SECCIONES.map(({ href, texto, icono: Icono }) => (
        <Link key={href} href={href} className={clase(href)} onClick={alNavegar}
          aria-current={ruta === href || ruta.startsWith(`${href}/`) ? "page" : undefined}>
          <Icono aria-hidden className="size-[18px]" strokeWidth={1.75} />
          {texto}
        </Link>
      ))}
      <div className="mt-auto border-t border-white/10 pt-3">
        <Link href="/configuracion" className={clase("/configuracion")} onClick={alNavegar}>
          <Settings aria-hidden className="size-[18px]" strokeWidth={1.75} />
          Configuración
        </Link>
      </div>
    </nav>
  );
}

export function Navegacion({ pie }: { pie: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {/* Escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-tinta px-3 py-5 lg:flex">
        <Link href="/inicio" className="mb-6 px-3 font-titulo text-xl font-semibold tracking-tight text-white">
          Blister Fitness
        </Link>
        <Enlaces />
        <div className="mt-3">{pie}</div>
      </aside>

      {/* Móvil */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-tinta px-4 lg:hidden">
        <Link href="/inicio" className="font-titulo text-lg font-semibold text-white">Blister Fitness</Link>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-md p-2 text-white hover:bg-white/10"
          aria-label="Abrir menú"
          aria-expanded={abierto}
        >
          <Menu className="size-5" />
        </button>
      </header>
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-tinta/50"
            onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-tinta px-3 py-4">
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="font-titulo text-lg font-semibold text-white">Blister Fitness</span>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar menú"
                className="rounded-md p-2 text-white hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <Enlaces alNavegar={() => setAbierto(false)} />
            <div className="mt-3">{pie}</div>
          </div>
        </div>
      )}
    </>
  );
}
