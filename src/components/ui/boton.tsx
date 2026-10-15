import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 h-10 text-sm font-medium transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none [&_svg]:shrink-0";

const variantes: Record<Variante, string> = {
  // Cobalto: la única acción con color, una por vista.
  primario: "bg-acento text-sobre-acento hover:bg-acento-hover",
  // Píldora de contorno marfil, como en la navegación.
  secundario: "bg-transparent text-tinta border border-linea-fuerte hover:border-tinta hover:bg-hueso/60",
  fantasma: "text-grafito hover:bg-hueso hover:text-tinta",
  peligro: "bg-transparent text-peligro border border-peligro/40 hover:bg-peligro/[0.08]",
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
