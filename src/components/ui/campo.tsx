import type { ComponentProps } from "react";

const claseControl =
  "w-full h-10 rounded-md border border-linea bg-superficie px-3 text-tinta placeholder:text-tenue/70 " +
  "focus:border-acento focus:outline-none focus:ring-2 focus:ring-acento/20 aria-[invalid=true]:border-peligro";

type Base = { etiqueta: string; nombre: string; errores?: string[]; ayuda?: string };

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
      <label htmlFor={nombre} className="mb-1.5 block text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      <input
        id={nombre}
        name={nombre}
        aria-invalid={Boolean(idError)}
        aria-describedby={idError}
        className={claseControl}
        {...props}
      />
      {ayuda && !idError && <p className="mt-1 text-sm text-tenue">{ayuda}</p>}
      {idError && (
        <p id={idError} className="mt-1 text-sm text-peligro">
          {errores![0]}
        </p>
      )}
    </div>
  );
}

export function AreaTexto({
  etiqueta,
  nombre,
  errores,
  className = "",
  ...props
}: Base & Omit<ComponentProps<"textarea">, "name">) {
  return (
    <div className={className}>
      <label htmlFor={nombre} className="mb-1.5 block text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      <textarea
        id={nombre}
        name={nombre}
        className={`${claseControl} h-auto min-h-24 py-2`}
        aria-invalid={Boolean(errores?.length)}
        {...props}
      />
      {errores?.length ? <p className="mt-1 text-sm text-peligro">{errores[0]}</p> : null}
    </div>
  );
}

export function Selector({
  etiqueta,
  nombre,
  opciones,
  errores,
  className = "",
  ...props
}: Base & { opciones: { valor: string; texto: string }[] } & Omit<ComponentProps<"select">, "name">) {
  const idError = errores?.length ? `${nombre}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={nombre} className="mb-1.5 block text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      <select
        id={nombre}
        name={nombre}
        aria-invalid={Boolean(idError)}
        aria-describedby={idError}
        className={claseControl}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {idError && (
        <p id={idError} className="mt-1 text-sm text-peligro">
          {errores![0]}
        </p>
      )}
    </div>
  );
}
