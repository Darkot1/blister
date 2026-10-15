import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 h-9 text-sm font-medium transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none [&_svg]:shrink-0";

const variantes: Record<Variante, string> = {
  primario: "bg-tinta text-sobre-tinta hover:bg-grafito",
  secundario: "bg-superficie text-grafito border border-linea hover:border-linea-fuerte hover:text-tinta",
  fantasma: "text-grafito hover:bg-hueso hover:text-tinta",
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
