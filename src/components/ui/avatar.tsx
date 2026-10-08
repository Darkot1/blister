import { cx } from "@/lib/clases";
import css from "./avatar.module.css";

/** Círculo con iniciales (usa `iniciales()` de lib/formato). Decorativo: el nombre va al lado en texto. */
export function Avatar({
  iniciales,
  tamano = "normal",
  tono = "neutro",
  className,
}: {
  iniciales: string;
  tamano?: "pequeno" | "normal" | "grande";
  /** `acento`: la cuenta del propio entrenador (tinta sólida). */
  tono?: "neutro" | "acento";
  className?: string;
}) {
  return (
    <span aria-hidden className={cx(css.avatar, tamano !== "normal" && css[tamano], tono === "acento" && css.acento, className)}>
      {iniciales}
    </span>
  );
}
