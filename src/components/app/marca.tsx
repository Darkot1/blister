import Link from "next/link";
import { cx } from "@/lib/clases";
import { TRAZO_DISCO } from "@/components/ui/disco";
import css from "./marca.module.css";

/**
 * Logotipo: un disco de caucho negro visto de frente + "Blister".
 * El disco de la marca es tinta (no lleva color de estado: los colores de disco significan algo).
 */
export function Marca({
  href = "/inicio",
  conNombre = true,
  className,
}: {
  href?: string;
  /** @deprecated El shell ya no es oscuro; se ignora. */
  fondo?: "grafito" | "claro";
  conNombre?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cx(css.marca, className)} aria-label="Blister, inicio">
      <svg viewBox="0 0 24 24" aria-hidden className={css.simbolo}>
        <path d={TRAZO_DISCO} fillRule="evenodd" className={css.disco} />
        <circle cx="12" cy="12" r="6.4" className={css.aro} />
      </svg>
      {conNombre && (
        <span className={css.nombre} aria-hidden>
          Blister
        </span>
      )}
    </Link>
  );
}
