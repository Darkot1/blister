import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/lib/clases";
import css from "./texto.module.css";

/**
 * Texto con las variaciones más repetidas del sistema, para no escribir CSS por una línea tenue.
 * Ej.: <Texto tamano="sm" tono="tenue">Medido el 8 oct 2026</Texto>
 *      <Texto as="span" cifra tamano="lg">7:00</Texto>
 */
export function Texto({
  as: Elemento = "p",
  tamano,
  tono,
  peso,
  rotulo = false,
  cifra = false,
  truncar = false,
  tachado = false,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"p">, "ref"> & {
  as?: "p" | "span" | "div" | "strong" | "time";
  tamano?: "xs" | "sm" | "base" | "lg" | "xl";
  tono?: "tinta" | "tenue" | "acento" | "exito" | "aviso" | "peligro";
  peso?: "normal" | "medio" | "semi";
  /**
   * @deprecated Disco no usa rótulos en mayúsculas. Se mantiene por compatibilidad y
   * se pinta como `tamano="sm" peso="semi"`. Usa eso, o mejor un título de `Seccion`.
   */
  rotulo?: boolean;
  /** Big Shoulders + números tabulares (horas, cargas). */
  cifra?: boolean;
  truncar?: boolean;
  tachado?: boolean;
}) {
  return (
    <Elemento
      className={cx(
        css.texto,
        tamano && css[tamano],
        tono && css[tono],
        peso && css[peso],
        rotulo && css.rotulo,
        cifra && css.cifra,
        truncar && css.truncar,
        tachado && css.tachado,
        className,
      )}
      {...(props as object)}
    />
  );
}
