import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "@/lib/clases";
import css from "./boton.module.css";

export type Variante = "primario" | "secundario" | "fantasma" | "peligro";
export type TamanoBoton = "pequeno" | "normal" | "grande";

type Opciones = {
  /** `primario`: una sola acción principal por vista. */
  variante?: Variante;
  tamano?: TamanoBoton;
  /** Botón cuadrado con solo un icono. Exige `aria-label`. */
  soloIcono?: boolean;
  /** Ocupa todo el ancho disponible. */
  bloque?: boolean;
};

/** Clases de botón para elementos que no son <button> ni <Link> (p. ej. un <label> o un <a> externo). */
export function clasesBoton(
  variante: Variante = "primario",
  extra = "",
  { tamano = "normal", soloIcono = false, bloque = false }: Omit<Opciones, "variante"> = {},
) {
  return cx(
    css.boton,
    css[variante],
    tamano !== "normal" && css[tamano],
    soloIcono && css.soloIcono,
    bloque && css.bloque,
    extra,
  );
}

export function Boton({
  variante = "primario",
  tamano,
  soloIcono,
  bloque,
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & Opciones) {
  return <button type={type} className={clasesBoton(variante, className, { tamano, soloIcono, bloque })} {...props} />;
}

export function EnlaceBoton({
  variante = "primario",
  tamano,
  soloIcono,
  bloque,
  className = "",
  ...props
}: ComponentProps<typeof Link> & Opciones) {
  return <Link className={clasesBoton(variante, className, { tamano, soloIcono, bloque })} {...props} />;
}
