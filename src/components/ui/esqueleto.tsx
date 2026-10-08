import { cx } from "@/lib/clases";
import css from "./esqueleto.module.css";

/**
 * Bloque gris que pulsa mientras carga. Dale la forma aproximada del contenido final
 * con `alto`/`ancho` (cualquier longitud CSS: "16rem", "100%").
 */
export function Esqueleto({
  alto,
  ancho,
  forma = "bloque",
  className = "",
}: {
  alto?: string;
  ancho?: string;
  forma?: "bloque" | "texto" | "circulo";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cx(css.esqueleto, forma !== "bloque" && css[forma], className)}
      style={{ height: alto, width: ancho ?? (forma === "circulo" ? alto : undefined) }}
    />
  );
}

/** Esqueleto con la forma de `ListaFilas`: fallback típico de `Suspense` en listas. */
export function EsqueletoLista({ filas = 6, conAvatar = false }: { filas?: number; conAvatar?: boolean }) {
  return (
    <div className={css.lista} role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={css.fila}>
          {conAvatar && <Esqueleto forma="circulo" alto="var(--alto-control)" />}
          <div className={css.lineas}>
            <Esqueleto forma="texto" ancho={`${55 - (i % 3) * 10}%`} />
            <Esqueleto forma="texto" ancho="30%" alto="var(--texto-sm)" />
          </div>
        </div>
      ))}
    </div>
  );
}
