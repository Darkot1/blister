import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./lista-filas.module.css";

/**
 * Lista de filas sobre el papel, con una regla fina entre filas (sin caja). Cada hijo debe ser un `Fila`.
 */
export function ListaFilas({
  as: Elemento = "ul",
  etiqueta,
  className,
  children,
}: {
  as?: "ul" | "ol";
  /** aria-label si la lista no tiene un título visible que la nombre. */
  etiqueta?: string;
  /** @deprecated Las listas ya no tienen caja; no hace nada. */
  plana?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Elemento aria-label={etiqueta} className={cx(css.lista, className)}>
      {children}
    </Elemento>
  );
}

/**
 * Fila de lista. Con `href` es un enlace en toda la fila; con `alPulsar` es un botón
 * (solo desde componentes cliente). Sin ninguno, es estática.
 * Usa las ranuras (`inicio`, `titulo`, `detalle`, `meta`, `fin`) o, para algo especial, `children`.
 */
export function Fila({
  href,
  alPulsar,
  inicio,
  titulo,
  detalle,
  meta,
  fin,
  chevron,
  actual = false,
  atenuada = false,
  etiqueta,
  className,
  children,
}: {
  href?: string;
  alPulsar?: () => void;
  /** Avatar, hora o icono a la izquierda. */
  inicio?: React.ReactNode;
  titulo?: React.ReactNode;
  /** Segunda línea, tenue. */
  detalle?: React.ReactNode;
  /** Columna intermedia que solo se ve desde 640 px. */
  meta?: React.ReactNode;
  /** Estado, cifra o acción a la derecha. */
  fin?: React.ReactNode;
  /** Muestra ">" al final. Por defecto, en filas con `href`. */
  chevron?: boolean;
  /** Fila seleccionada/actual (aria-current). */
  actual?: boolean;
  /** Tachada y tenue (p. ej. cita a la que no asistió). */
  atenuada?: boolean;
  /** aria-label del enlace/botón cuando el contenido visible no basta. */
  etiqueta?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const interior = children ?? (
    <>
      {inicio && <span className={css.inicio}>{inicio}</span>}
      <span className={css.principal}>
        {titulo && <span className={css.titulo}>{titulo}</span>}
        {detalle && <span className={css.detalle}>{detalle}</span>}
      </span>
      {meta && <span className={css.meta}>{meta}</span>}
      {fin && <span className={css.fin}>{fin}</span>}
      {(chevron ?? Boolean(href)) && <ChevronRight aria-hidden className={css.chevron} />}
    </>
  );
  const clase = cx(css.contenido, (href || alPulsar) && css.interactiva, actual && css.actual);
  return (
    <li className={cx(css.fila, atenuada && css.atenuada, className)}>
      {href ? (
        <Link href={href} className={clase} aria-current={actual ? "page" : undefined} aria-label={etiqueta}>
          {interior}
        </Link>
      ) : alPulsar ? (
        <button type="button" onClick={alPulsar} className={clase} aria-pressed={actual || undefined} aria-label={etiqueta}>
          {interior}
        </button>
      ) : (
        <div className={clase}>{interior}</div>
      )}
    </li>
  );
}
