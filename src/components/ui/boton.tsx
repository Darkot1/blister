import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "acento" | "secundario" | "fantasma" | "peligro";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 h-9 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none [&_svg]:shrink-0";

const variantes: Record<Variante, string> = {
  primario: "bg-tinta text-white hover:bg-tinta/85",
  acento: "bg-acento text-tinta hover:bg-acento-hover",
  secundario: "bg-superficie text-tinta border border-linea hover:border-tinta/30 hover:bg-fondo/60",
  fantasma: "text-tinta hover:bg-tinta/[0.06]",
  peligro: "bg-superficie text-peligro border border-peligro/30 hover:bg-peligro/[0.06]",
};

export function clasesBoton(variante: Variante = "primario", extra = "") {
  return `${base} ${variantes[variante]} ${extra}`;
}

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={clasesBoton(variante, className)} {...props} />;
}

export function EnlaceBoton({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={clasesBoton(variante, className)} {...props} />;
}
