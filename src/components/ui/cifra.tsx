import Link from "next/link";
import { cx } from "@/lib/clases";
import css from "./cifra.module.css";

/**
 * Una cifra clave dentro de `GrupoCifras`: valor en Big Shoulders con su unidad y, debajo,
 * la etiqueta en texto normal (sentence case). Se marca como par <dt>/<dd>, así que va
 * SIEMPRE dentro de `GrupoCifras`. Solo para cifras que ayudan a decidir algo hoy (máximo 4).
 */
export function Cifra({
  etiqueta,
  valor,
  unidad,
  detalle,
  tonoDetalle,
  tamano = "normal",
  href,
  className,
}: {
  etiqueta: React.ReactNode;
  valor: React.ReactNode;
  /** "kg", "años", "%". */
  unidad?: string;
  detalle?: React.ReactNode;
  /** Colorea el detalle cuando expresa una tendencia (acompáñalo de texto: "+2 kg"). */
  tonoDetalle?: "exito" | "aviso" | "peligro";
  /**
   * `normal` (39 px, el estándar), `compacta` (25 px, para textos como fechas u objetivos).
   * `grande` (49 px) existe por compatibilidad: no lo uses como patrón.
   */
  tamano?: "grande" | "normal" | "compacta";
  /** El valor enlaza a su detalle. */
  href?: string;
  className?: string;
}) {
  const valorConUnidad = (
    <>
      {valor}
      {unidad && <span className={css.unidad}>{unidad}</span>}
    </>
  );
  return (
    <div className={cx(css.cifra, css[tamano], className)}>
      <dt className={css.etiqueta}>{etiqueta}</dt>
      <dd className={css.valor}>
        {href ? (
          <Link href={href} className={css.enlace}>
            {valorConUnidad}
          </Link>
        ) : (
          valorConUnidad
        )}
      </dd>
      {detalle && <dd className={cx(css.detalle, tonoDetalle && css[tonoDetalle])}>{detalle}</dd>}
    </div>
  );
}

/**
 * Fila de cifras clave (<dl>): definiciones en línea separadas por espacio, sin cajas.
 * En móvil van de dos en dos. `columnas` solo limita cuántas caben por fila en escritorio.
 */
export function GrupoCifras({
  etiqueta = "Resumen",
  columnas = 4,
  className,
  children,
}: {
  /** Nombre accesible de la lista: "Datos clave". */
  etiqueta?: string;
  columnas?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <dl aria-label={etiqueta} className={cx(css.grupo, columnas === 1 && css.unaColumna, className)}>
      {children}
    </dl>
  );
}
