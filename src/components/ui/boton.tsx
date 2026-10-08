import Link from "next/link";
import type { ComponentProps } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-[0.95rem] font-semibold transition-[background-color,transform] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 whitespace-nowrap select-none";

const variantes: Record<Variante, string> = {
  primario: "bg-tinta text-white hover:bg-tinta/85",
  secundario: "bg-tinta/[0.07] text-tinta hover:bg-tinta/[0.11]",
  fantasma: "text-acento hover:bg-acento/10",
  peligro: "bg-peligro/10 text-peligro hover:bg-peligro/15",
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
