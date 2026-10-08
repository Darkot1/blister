import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "@/lib/clases";
import css from "./enlace.module.css";

/**
 * Enlace de texto. `acento` (por defecto) para acciones dentro de un párrafo;
 * `tenue` para enlaces secundarios (teléfono, correo, "volver"); `heredado` toma el color del texto.
 * Para tel:/mailto:/externos también sirve: next/link los deja pasar.
 */
export function Enlace({
  variante = "acento",
  className,
  ...props
}: ComponentProps<typeof Link> & { variante?: "acento" | "tenue" | "heredado" }) {
  return <Link className={cx(css.enlace, css[variante], className)} {...props} />;
}
