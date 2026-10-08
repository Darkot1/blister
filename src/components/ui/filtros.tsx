import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./filtros.module.css";

/**
 * Grupo de filtros (role="group"). `chips` para varias opciones que envuelven;
 * `segmentado` para 2-5 opciones excluyentes en una sola pieza.
 * Para que el filtro viva en la URL, ponlo dentro de `next/form` con `Chip type="submit" name value`.
 */
export function GrupoFiltros({
  etiqueta,
  variante = "chips",
  className,
  children,
}: {
  /** aria-label del grupo: "Filtrar por estado". */
  etiqueta: string;
  variante?: "chips" | "segmentado";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cx(variante === "segmentado" ? css.segmentado : css.grupo, className)}>
      {children}
    </div>
  );
}

/**
 * Botón de filtro. `activo` se expresa con aria-pressed (no solo color).
 * `quitable` añade una ✕ (exige `aria-label`, p. ej. "Quitar Bíceps").
 */
export function Chip({
  activo,
  quitable = false,
  type = "button",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { activo?: boolean; quitable?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={activo}
      className={cx(css.chip, quitable && css.quitable, className)}
      {...props}
    >
      {children}
      {quitable && <X aria-hidden />}
    </button>
  );
}
