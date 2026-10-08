import { Fragment } from "react";
import { cx } from "@/lib/clases";
import css from "./lista-datos.module.css";

/** Pares término → valor (<dl>). `lado` pone el término a la izquierda desde 640 px; `apilado`, siempre encima. */
export function ListaDatos({
  datos,
  disposicion = "lado",
  className,
}: {
  datos: { termino: React.ReactNode; valor: React.ReactNode }[];
  disposicion?: "lado" | "apilado";
  className?: string;
}) {
  return (
    <dl className={cx(css.lista, disposicion === "lado" && css.lado, className)}>
      {datos.map((d, i) => (
        <Fragment key={i}>
          <dt className={css.termino}>{d.termino}</dt>
          <dd className={css.valor}>{d.valor}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
