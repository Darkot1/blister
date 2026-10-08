import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cx } from "@/lib/clases";
import css from "./disposicion.module.css";

/** Pasos de la escala de espaciado (tokens --espacio-N). */
export type Espacio = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;
type Etiqueta = "div" | "section" | "ul" | "ol" | "li" | "header" | "footer" | "nav" | "form" | "fieldset";

const hueco = (espacio: Espacio | undefined, style?: CSSProperties) =>
  espacio === undefined ? style : ({ ...style, "--hueco": espacio === 0 ? "0" : `var(--espacio-${espacio})` } as CSSProperties);

type Comun = Omit<ComponentPropsWithoutRef<"div">, "ref"> & { as?: Etiqueta; espacio?: Espacio };

/** Apila hijos en vertical con un espacio uniforme. Por defecto `espacio={4}` (16 px). */
export function Pila({ as: Elemento = "div", espacio, className, style, ...props }: Comun) {
  return <Elemento className={cx(css.pila, className)} style={hueco(espacio, style)} {...(props as object)} />;
}

const ALINEAR = { inicio: css.alinearInicio, centro: undefined, fin: css.alinearFin, base: css.alinearBase, estirar: css.alinearEstirar };
const JUSTIFICAR = { inicio: undefined, entre: css.justificarEntre, fin: css.justificarFin, centro: css.justificarCentro };

/** Hijos en fila (barras de acciones, filtros, metadatos). Envuelve por defecto para no desbordar en móvil. */
export function Grupo({
  as: Elemento = "div",
  espacio,
  alinear = "centro",
  justificar = "inicio",
  envolver = true,
  className,
  style,
  ...props
}: Comun & {
  alinear?: keyof typeof ALINEAR;
  justificar?: keyof typeof JUSTIFICAR;
  envolver?: boolean;
}) {
  return (
    <Elemento
      className={cx(css.grupo, ALINEAR[alinear], JUSTIFICAR[justificar], envolver && css.envolver, className)}
      style={hueco(espacio, style)}
      {...(props as object)}
    />
  );
}

const COLUMNAS = {
  /** 1 → 2 columnas desde 640 px. */
  2: css.dos,
  /** 1 → 2 (640 px) → 3 (1024 px). */
  3: css.tres,
  /** 1 → 2 (640 px) → 4 (1024 px). */
  4: css.cuatro,
  /** Principal 2/3 + secundaria 1/3 desde 1024 px. */
  principal: css.principal,
  /** Panel fijo de 20rem a la izquierda + contenido, desde 1024 px. */
  lateral: css.lateral,
  /** Tantas columnas de ≥ 16rem como quepan. */
  auto: css.auto,
};

/** Rejilla responsive. Siempre una sola columna en móvil. Por defecto `espacio={6}`. */
export function Rejilla({
  as: Elemento = "div",
  columnas = 2,
  espacio,
  estirar = false,
  className,
  style,
  ...props
}: Comun & { columnas?: keyof typeof COLUMNAS; /** Igualar la altura de las celdas. */ estirar?: boolean }) {
  return (
    <Elemento
      className={cx(css.rejilla, COLUMNAS[columnas], estirar && css.alinearEstirar, className)}
      style={hueco(espacio, style)}
      {...(props as object)}
    />
  );
}
