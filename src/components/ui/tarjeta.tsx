import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/clases";
import css from "./tarjeta.module.css";

type Opciones = {
  /** Relleno interior: `normal` (20 → 24 px), `compacto` (16 px) o `ninguno` (para contenido a sangre). */
  relleno?: "normal" | "compacto" | "ninguno";
  /**
   * `superficie` (blanca con borde, por defecto): una superficie de trabajo.
   * `hundida` (gris, sin borde): formulario abierto en línea, p. ej. registrar una medición.
   * `discontinua`: hueco por llenar ("Agregar ejercicio").
   */
  variante?: "superficie" | "hundida" | "discontinua";
};

const clases = ({ relleno = "normal", variante = "superficie" }: Opciones, extra?: string) =>
  cx(css.tarjeta, relleno !== "ninguno" && css[relleno], variante !== "superficie" && css[variante], extra);

/**
 * Superficie de trabajo: algo que el entrenador manipula (formulario abierto, panel del mapa corporal,
 * rejilla del calendario, constructor de rutinas). NO es el contenedor por defecto de una sección,
 * una lista o un grupo de cifras: eso va sobre el papel, separado por espacio y título.
 */
export function Tarjeta({
  as: Elemento = "div",
  relleno,
  variante,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"div">, "ref"> & Opciones & { as?: "div" | "section" | "article" | "aside" | "li" }) {
  return <Elemento className={clases({ relleno, variante }, className)} {...(props as object)} />;
}

/** @deprecated Tarjetas-enlace son parte del "kit de tarjetas" que Disco evita. Usa `Fila href` o un `Enlace`. */
export function TarjetaEnlace({
  relleno,
  variante,
  className,
  ...props
}: React.ComponentProps<typeof Link> & Opciones) {
  return <Link className={cx(clases({ relleno, variante }), css.enlace, className)} {...props} />;
}
