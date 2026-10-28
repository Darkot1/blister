import type { ComponentProps } from "react";

/** Borde, foco y error comunes a todos los campos; la forma (alto, esquinas) la pone cada tipo. */
const baseCampo =
  "w-full border border-linea-fuerte/80 bg-transparent text-sm text-tinta placeholder:text-tenue/80 transition-[border-color,box-shadow] duration-200 " +
  "hover:border-linea-fuerte focus:border-acento focus:outline-none focus:ring-[3px] focus:ring-acento/25 " +
  "aria-[invalid=true]:border-peligro aria-[invalid=true]:ring-peligro/10";

/** Campo de una línea: píldora. */
export const claseControl = `${baseCampo} h-10 rounded-full px-4`;

/**
 * Área de texto: esquinas suaves (una píldora con varias líneas se ve como un óvalo) y solo
 * crece hacia abajo, para que el tirador no la ensanche fuera de su columna.
 */
export const claseAreaTexto = `${baseCampo} block min-h-20 resize-y rounded-xl px-3.5 py-2.5 leading-relaxed`;

/** Desplegable con la misma flecha en todos los navegadores; `claseSelector.replace("w-full", …)` para otro ancho. */
export const claseSelector =
  `${claseControl} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%239c9a92'%20stroke-width='2.2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='m7%2010%205%205%205-5'/%3E%3C/svg%3E")] bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10 [&>option]:bg-superficie`;

const claseEtiqueta = "mb-1.5 block text-sm font-medium text-grafito";

type Base = { etiqueta: string; nombre: string; errores?: string[]; ayuda?: string };

function Ayuda({ id, errores, ayuda }: { id?: string; errores?: string[]; ayuda?: string }) {
  if (id && errores?.length) return <p id={id} className="mt-1.5 text-sm text-peligro">{errores[0]}</p>;
  if (ayuda) return <p className="mt-1.5 text-sm text-tenue">{ayuda}</p>;
  return null;
}

export function Campo({
  etiqueta,
  nombre,
  errores,
  ayuda,
  className = "",
  ...props
}: Base & Omit<ComponentProps<"input">, "name">) {
  const idError = errores?.length ? `${nombre}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={nombre} className={claseEtiqueta}>{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        aria-invalid={Boolean(idError)}
        aria-describedby={idError}
        className={claseControl}
        {...props}
      />
      <Ayuda id={idError} errores={errores} ayuda={ayuda} />
    </div>
  );
}

export function AreaTexto({
  etiqueta,
  nombre,
  errores,
  ayuda,
  className = "",
  ...props
}: Base & Omit<ComponentProps<"textarea">, "name">) {
  const idError = errores?.length ? `${nombre}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={nombre} className={claseEtiqueta}>{etiqueta}</label>
      <textarea
        id={nombre}
        name={nombre}
        className={`${claseAreaTexto} min-h-24`}
        aria-invalid={Boolean(idError)}
        aria-describedby={idError}
        {...props}
      />
      <Ayuda id={idError} errores={errores} ayuda={ayuda} />
    </div>
  );
}

export function Selector({
  etiqueta,
  nombre,
  opciones,
  errores,
  ayuda,
  className = "",
  ...props
}: Base & { opciones: { valor: string; texto: string }[] } & Omit<ComponentProps<"select">, "name">) {
  const idError = errores?.length ? `${nombre}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={nombre} className={claseEtiqueta}>{etiqueta}</label>
      <select
        id={nombre}
        name={nombre}
        aria-invalid={Boolean(idError)}
        aria-describedby={idError}
        className={claseSelector}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <Ayuda id={idError} errores={errores} ayuda={ayuda} />
    </div>
  );
}
