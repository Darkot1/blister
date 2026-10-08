import { cx } from "@/lib/clases";
import { Disco, type TonoDisco } from "./disco";
import css from "./insignia.module.css";

/**
 * Tonos aceptados. Los nombres de disco (`verde`, `azul`, `rojo`, `amarillo`, `vacio`) son los preferidos;
 * los semánticos se mantienen por compatibilidad y se traducen así:
 * `exito` → verde, `acento` → azul, `peligro` → rojo, `aviso` → amarillo, `solida` → amarillo ("aquí estás", p. ej. Hoy),
 * `neutro` → sin disco (o `vacio` si se pide `punto`).
 */
export type TonoInsignia = TonoDisco | "neutro" | "acento" | "exito" | "aviso" | "peligro" | "solida";

const DISCO: Record<TonoInsignia, TonoDisco | null> = {
  verde: "verde",
  azul: "azul",
  rojo: "rojo",
  amarillo: "amarillo",
  vacio: "vacio",
  exito: "verde",
  acento: "azul",
  peligro: "rojo",
  aviso: "amarillo",
  solida: "amarillo",
  neutro: null,
};

/**
 * Estado o categoría corta: un disco de color + el texto, sin pastilla de fondo.
 * El texto siempre dice el estado; el disco lo refuerza.
 * `neutro` sin `punto` es una etiqueta de categoría en texto tenue, sin disco.
 */
export function Insignia({
  tono = "neutro",
  punto = false,
  className,
  children,
}: {
  tono?: TonoInsignia;
  /** Solo afecta a `neutro`: muestra un disco vacío. Los demás tonos siempre llevan disco. */
  punto?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const disco = DISCO[tono] ?? (punto ? "vacio" : null);
  return (
    <span className={cx(css.insignia, !disco && css.categoria, className)}>
      {disco && <Disco tono={disco} tamano="pequeno" />}
      {children}
    </span>
  );
}
