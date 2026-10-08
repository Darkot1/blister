import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cx } from "@/lib/clases";
import css from "./campo.module.css";

type Base = {
  etiqueta: string;
  /** `name` e `id` del control. */
  nombre: string;
  /** Errores de Zod (`fieldErrors.x`): se muestra el primero. */
  errores?: string[];
  ayuda?: ReactNode;
  /** Muestra "(opcional)" junto a la etiqueta. */
  opcional?: boolean;
};

function Envoltorio({
  etiqueta,
  nombre,
  opcional,
  ayuda,
  idAyuda,
  idError,
  error,
  className,
  unidad,
  children,
}: {
  etiqueta: string;
  nombre: string;
  unidad?: string;
  opcional?: boolean;
  ayuda?: ReactNode;
  idAyuda?: string;
  idError?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx(css.campo, className)}>
      <label htmlFor={nombre} className={css.etiqueta}>
        {etiqueta}
        {/* La unidad se ve dentro del campo (aria-hidden); aquí se anuncia al lector de pantalla. */}
        {unidad && <span className="sr-only">, en {unidad === "%" ? "porcentaje" : unidad}</span>}
        {opcional && <span className={css.opcional}>(opcional)</span>}
      </label>
      {children}
      {ayuda && !idError && (
        <p id={idAyuda} className={css.ayuda}>
          {ayuda}
        </p>
      )}
      {idError && (
        <p id={idError} className={css.error}>
          <CircleAlert aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

const ids = (nombre: string, errores?: string[], ayuda?: ReactNode) => {
  const idError = errores?.length ? `${nombre}-error` : undefined;
  const idAyuda = ayuda && !idError ? `${nombre}-ayuda` : undefined;
  return { idError, idAyuda, describe: idError ?? idAyuda };
};

function Ayuda({ id, errores, ayuda }: { id?: string; errores?: string[]; ayuda?: string }) {
  if (id && errores?.length) return <p id={id} className="mt-1.5 px-1 text-sm text-peligro">{errores[0]}</p>;
  if (ayuda) return <p className="mt-1.5 px-1 text-sm text-tenue">{ayuda}</p>;
  return null;
}

export function Campo({
  etiqueta,
  nombre,
  errores,
  ayuda,
  opcional,
  unidad,
  className = "",
  ...props
}: Base & { /** Unidad dentro del campo, a la derecha: "kg", "cm". */ unidad?: string } & Omit<
    ComponentProps<"input">,
    "name"
  >) {
  const { idError, idAyuda, describe } = ids(nombre, errores, ayuda);
  return (
    <Envoltorio {...{ etiqueta, nombre, opcional, ayuda, idAyuda, idError, className, unidad }} error={errores?.[0]}>
      <div className={css.envoltura}>
        <input
          id={nombre}
          name={nombre}
          aria-invalid={Boolean(idError)}
          aria-describedby={describe}
          className={cx(css.control, unidad && css.conUnidad)}
          {...props}
        />
        {unidad && (
          <span aria-hidden className={css.unidad}>
            {unidad}
          </span>
        )}
      </div>
    </Envoltorio>
  );
}

export function AreaTexto({
  etiqueta,
  nombre,
  errores,
  ayuda,
  opcional,
  className = "",
  ...props
}: Base & Omit<ComponentProps<"textarea">, "name">) {
  const { idError, idAyuda, describe } = ids(nombre, errores, ayuda);
  return (
    <Envoltorio {...{ etiqueta, nombre, opcional, ayuda, idAyuda, idError, className }} error={errores?.[0]}>
      <textarea
        id={nombre}
        name={nombre}
        aria-invalid={Boolean(idError)}
        aria-describedby={describe}
        className={cx(css.control, css.area)}
        {...props}
      />
    </Envoltorio>
  );
}

export function Selector({
  etiqueta,
  nombre,
  opciones,
  errores,
  ayuda,
  opcional,
  className = "",
  ...props
}: Base & { opciones: { valor: string; texto: string }[] } & Omit<ComponentProps<"select">, "name">) {
  const { idError, idAyuda, describe } = ids(nombre, errores, ayuda);
  return (
    <Envoltorio {...{ etiqueta, nombre, opcional, ayuda, idAyuda, idError, className }} error={errores?.[0]}>
      <div className={css.envoltura}>
        <select
          id={nombre}
          name={nombre}
          aria-invalid={Boolean(idError)}
          aria-describedby={describe}
          className={cx(css.control, css.selector)}
          {...props}
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className={css.chevron} />
      </div>
    </Envoltorio>
  );
}
