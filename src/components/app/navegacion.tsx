"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Dumbbell,
  Ellipsis,
  House,
  LineChart,
  ListChecks,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/lib/clases";
import { Marca } from "./marca";
import css from "./navegacion.module.css";

type Seccion = {
  href: string;
  texto: string;
  icono: LucideIcon;
  /** Pestaña fija en la barra inferior móvil (las de uso diario en el gimnasio). */
  diaria?: boolean;
};

const SECCIONES: Seccion[] = [
  { href: "/inicio", texto: "Inicio", icono: House, diaria: true },
  { href: "/alumnos", texto: "Alumnos", icono: Users, diaria: true },
  { href: "/entrenamiento", texto: "Entrenamiento", icono: ListChecks },
  { href: "/ejercicios", texto: "Ejercicios", icono: Dumbbell, diaria: true },
  { href: "/calendario", texto: "Calendario", icono: CalendarDays, diaria: true },
  { href: "/progreso", texto: "Progreso", icono: LineChart },
];
const CONFIGURACION: Seccion = { href: "/configuracion", texto: "Configuración", icono: Settings };
/** Orden de la barra inferior móvil: Inicio, Alumnos, Calendario, Ejercicios (+ Más). */
const PESTANAS = ["/inicio", "/alumnos", "/calendario", "/ejercicios"].map(
  (href) => SECCIONES.find((s) => s.href === href)!,
);
const EN_MAS = [...SECCIONES.filter((s) => !s.diaria), CONFIGURACION];

const esActual = (ruta: string, href: string) => ruta === href || ruta.startsWith(`${href}/`);

/**
 * La ruta actual solo se conoce en tiempo de ejecución (Cache Components): mientras llega,
 * los enlaces se pintan sin resaltar (fallback con ruta "").
 */
function ConRuta({ children }: { children: (ruta: string) => React.ReactNode }) {
  return (
    <Suspense fallback={children("")}>
      <LeerRuta>{children}</LeerRuta>
    </Suspense>
  );
}

function LeerRuta({ children }: { children: (ruta: string) => React.ReactNode }) {
  return children(usePathname());
}

/**
 * Shell de navegación.
 * - ≥ 1024 px: barra superior blanca con la marca, las secciones (la actual subrayada en amarillo),
 *   Configuración y la cuenta.
 * - < 1024 px: la misma barra, compacta (marca + cuenta), y barra de pestañas inferior al alcance del pulgar
 *   con Inicio, Alumnos, Calendario, Ejercicios y "Más" (hoja con Entrenamiento, Progreso y Configuración).
 * `cuenta` es el nodo de la cuenta del entrenador (UsuarioActual dentro de Suspense).
 */
export function Navegacion({ pie: cuenta }: { pie: React.ReactNode }) {
  return (
    <>
      <header className={css.barra}>
        <div className={css.barraInterior}>
          <Marca className={css.marca} />
          <ConRuta>
            {(ruta) => (
              <nav aria-label="Principal" className={css.secciones}>
                <ul className={css.listaSecciones}>
                  {SECCIONES.map(({ href, texto }) => (
                    <li key={href}>
                      <Link href={href} className={css.seccion} aria-current={esActual(ruta, href) ? "page" : undefined}>
                        {texto}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={CONFIGURACION.href}
                  className={cx(css.seccion, css.configuracion)}
                  aria-current={esActual(ruta, CONFIGURACION.href) ? "page" : undefined}
                >
                  {CONFIGURACION.texto}
                </Link>
              </nav>
            )}
          </ConRuta>
          <div className={css.cuenta}>{cuenta}</div>
        </div>
      </header>

      <ConRuta>{(ruta) => <PestanasMovil ruta={ruta} />}</ConRuta>
    </>
  );
}

function PestanasMovil({ ruta }: { ruta: string }) {
  const [abierta, setAbierta] = useState(false);
  const hoja = useRef<HTMLDialogElement>(null);
  const enMas = EN_MAS.some((s) => esActual(ruta, s.href));

  useEffect(() => {
    const dialogo = hoja.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  return (
    <>
      <nav aria-label="Principal" className={css.pestanas}>
        {PESTANAS.map(({ href, texto, icono: Icono }) => (
          <Link key={href} href={href} className={css.pestana} aria-current={esActual(ruta, href) ? "page" : undefined}>
            <Icono aria-hidden strokeWidth={1.75} />
            <span>{texto}</span>
          </Link>
        ))}
        <button
          type="button"
          className={cx(css.pestana, enMas && css.activa)}
          aria-haspopup="dialog"
          aria-expanded={abierta}
          onClick={() => setAbierta(true)}
        >
          <Ellipsis aria-hidden strokeWidth={1.75} />
          <span>Más</span>
        </button>
      </nav>

      <dialog
        ref={hoja}
        className={css.hoja}
        aria-labelledby="titulo-hoja-mas"
        onClose={() => setAbierta(false)}
        onClick={(e) => {
          if (e.target === hoja.current) setAbierta(false);
        }}
      >
        {abierta && (
          <>
            <div className={css.cabeceraHoja}>
              <h2 id="titulo-hoja-mas" className={css.tituloHoja}>
                Más secciones
              </h2>
              <button type="button" className={css.cerrar} onClick={() => setAbierta(false)} aria-label="Cerrar menú">
                <X aria-hidden />
              </button>
            </div>
            <nav aria-label="Más secciones">
              <ul className={css.listaHoja}>
                {EN_MAS.map(({ href, texto, icono: Icono }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={css.enlaceHoja}
                      onClick={() => setAbierta(false)}
                      aria-current={esActual(ruta, href) ? "page" : undefined}
                    >
                      <Icono aria-hidden strokeWidth={1.75} />
                      {texto}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </dialog>
    </>
  );
}
