import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./aviso.module.css";

type TipoAviso = "error" | "exito" | "aviso" | "info";

const ICONO = { error: CircleAlert, exito: CircleCheck, aviso: TriangleAlert, info: Info };
const CLASE: Record<TipoAviso, string> = { error: css.error, exito: css.exito, aviso: css.advertencia, info: css.info };

/**
 * Mensaje de formulario o de página. `error` se anuncia con role="alert";
 * el resto con role="status".
 */
export function Aviso({
  tipo = "error",
  className,
  children,
}: {
  tipo?: TipoAviso;
  className?: string;
  children: React.ReactNode;
}) {
  const Icono = ICONO[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={cx(css.aviso, CLASE[tipo], className)}>
      <Icono aria-hidden />
      <div className={css.contenido}>{children}</div>
    </div>
  );
}
