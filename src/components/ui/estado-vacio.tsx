import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./estado-vacio.module.css";

/**
 * Estado vacío o sin resultados: qué pasa y qué hacer ahora. Alineado a la izquierda, sin caja ni ilustración.
 * Distingue "aún no hay nada" (con acción para crear) de "ningún resultado con estos filtros".
 */
export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  compacto = false,
  className,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Botón o enlace con la siguiente acción. */
  accion?: React.ReactNode;
  /** @deprecated Disco no ilustra los vacíos; el icono ya no se muestra. */
  icono?: LucideIcon;
  /** Menos aire arriba y abajo (dentro de una superficie de trabajo o una sección corta). */
  compacto?: boolean;
  className?: string;
}) {
  return (
    <div className={cx(css.vacio, compacto && css.compacto, className)}>
      <p className={css.titulo}>{titulo}</p>
      {descripcion && <p className={css.descripcion}>{descripcion}</p>}
      {accion && <div className={css.accion}>{accion}</div>}
    </div>
  );
}
