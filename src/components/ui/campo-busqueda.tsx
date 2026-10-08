import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./campo-busqueda.module.css";

/**
 * Campo de búsqueda con lupa y etiqueta solo para lectores de pantalla.
 * Ponlo dentro de `next/form` (action = la ruta) para que la búsqueda viva en `?q=`.
 */
export function CampoBusqueda({
  etiqueta,
  nombre = "q",
  className,
  ...props
}: {
  /** Texto de la etiqueta (oculta): "Buscar alumno". */
  etiqueta: string;
  nombre?: string;
} & Omit<ComponentProps<"input">, "name" | "type">) {
  return (
    <label className={cx(css.busqueda, className)}>
      <span className="sr-only">{etiqueta}</span>
      <Search aria-hidden className={css.icono} />
      <input type="search" name={nombre} autoComplete="off" className={css.control} {...props} />
    </label>
  );
}
