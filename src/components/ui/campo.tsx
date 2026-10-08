import type { ComponentProps } from "react";

export const claseControl =
  "w-full h-10 rounded-lg border border-linea bg-superficie px-3 text-tinta placeholder:text-tenue/70 transition-[border-color,box-shadow] " +
  "hover:border-tinta/25 focus:border-tinta focus:outline-none focus:ring-[3px] focus:ring-tinta/10 " +
  "aria-[invalid=true]:border-peligro aria-[invalid=true]:ring-peligro/10";

/** Desplegable con la misma flecha en todos los navegadores; `claseSelector.replace("w-full", …)` para otro ancho. */
export const claseSelector =
  `${claseControl} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%238a94a5'%20stroke-width='2.2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='m7%2010%205%205%205-5'/%3E%3C/svg%3E")] bg-[length:1rem] bg-[right_0.7rem_center] bg-no-repeat pr-9`;

const claseEtiqueta = "mb-1.5 block text-sm font-medium";

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
        className={`${claseControl} h-auto min-h-24 py-2`}
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
