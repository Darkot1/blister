import Link from "next/link";
import css from "./pestanas.module.css";

/**
 * Navegación por pestañas basada en la URL (cada pestaña es un enlace; la actual lleva aria-current="page").
 */
export function Pestanas({
  etiqueta,
  pestanas,
}: {
  /** aria-label de la navegación: "Secciones del alumno". */
  etiqueta: string;
  pestanas: { href: string; texto: string; actual: boolean }[];
}) {
  return (
    <nav aria-label={etiqueta} className={css.pestanas}>
      <ul className={css.lista}>
        {pestanas.map((p) => (
          <li key={p.href}>
            {/* scroll={false}: cambiar de pestaña no debe saltar al inicio de la página. */}
            <Link href={p.href} scroll={false} aria-current={p.actual ? "page" : undefined} className={css.pestana}>
              {p.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
