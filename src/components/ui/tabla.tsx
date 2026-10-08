import { cx } from "@/lib/clases";
import css from "./tabla.module.css";

/**
 * Tabla simple con desplazamiento horizontal propio (nunca desborda la página).
 * Escribe <thead>/<tbody> normales; marca las columnas numéricas con `data-numero`
 * en <th> y <td> (alineadas a la derecha, números tabulares).
 */
export function Tabla({
  etiqueta,
  className,
  children,
}: {
  /** Nombre accesible de la región desplazable: "Historial de mediciones". */
  etiqueta: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // La región desplazable es enfocable para poder desplazarla con teclado.
    <div className={cx(css.contenedor, className)} role="region" aria-label={etiqueta} tabIndex={0}>
      <table className={css.tabla}>{children}</table>
    </div>
  );
}
