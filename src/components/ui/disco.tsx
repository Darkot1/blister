import { cx } from "@/lib/clases";
import css from "./disco.module.css";

export type TonoDisco = "verde" | "azul" | "rojo" | "amarillo" | "vacio";

/*
  Un disco olímpico visto de frente: círculo con el agujero central de 50 mm.
  Se dibuja con un solo trazado par-impar para que el agujero sea transparente de verdad
  (deja ver el fondo, sea papel o blanco).
*/
export const TRAZO_DISCO = "M12 1a11 11 0 1 0 0 22a11 11 0 1 0 0-22ZM12 9.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6Z";

/**
 * Marca de estado de Blister. El color sigue el código de los discos de competición:
 * `verde` hecho/activo, `azul` confirmado, `rojo` falta/error, `amarillo` atención o "aquí estás",
 * `vacio` (disco blanco con contorno) pendiente/programado.
 *
 * Con `etiqueta` es una imagen con nombre (role="img"); sin ella es decorativo (aria-hidden)
 * y el texto de al lado debe decir el estado.
 */
export function Disco({
  tono,
  tamano = "normal",
  etiqueta,
  className,
}: {
  tono: TonoDisco;
  /** `pequeno` 12 px (dentro de texto pequeño), `normal` 16 px, `grande` 24 px, `marca` 28 px (logotipo). */
  tamano?: "pequeno" | "normal" | "grande" | "marca";
  /** Nombre accesible cuando el disco va solo, sin texto al lado: "Confirmada". */
  etiqueta?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx(css.disco, css[tamano], css[tono], className)}
      {...(etiqueta ? { role: "img", "aria-label": etiqueta } : { "aria-hidden": true })}
    >
      <path d={TRAZO_DISCO} fillRule="evenodd" />
    </svg>
  );
}
