import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-[0.95rem] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";

const variantes: Record<Variante, string> = {
  primario: "bg-acento text-white hover:bg-acento-hover",
  secundario: "bg-superficie text-tinta border border-linea hover:border-tinta/40",
  fantasma: "text-tinta hover:bg-tinta/5",
  peligro: "bg-superficie text-peligro border border-peligro/30 hover:bg-peligro/5",
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
