import type { ComponentProps } from "react";

/** Campos rellenos al estilo de los ajustes del teléfono: sin borde hasta que reciben el foco. */
export const claseControl =
  "w-full h-12 rounded-2xl border border-transparent bg-tinta/[0.05] px-4 text-tinta placeholder:text-tenue/70 transition-colors " +
  "hover:bg-tinta/[0.07] focus:border-acento focus:bg-superficie focus:outline-none focus:ring-4 focus:ring-acento/15 " +
  "aria-[invalid=true]:border-peligro aria-[invalid=true]:bg-peligro/[0.04]";

const claseEtiqueta = "mb-1.5 block px-1 text-sm font-medium text-tenue";

type Base = { etiqueta: string; nombre: string; errores?: string[]; ayuda?: string };

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
        className={`${claseControl} h-auto min-h-24 py-3`}
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
        className={`${claseControl} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%23676b73'%20stroke-width='2.2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='m7%2010%205%205%205-5'/%3E%3C/svg%3E")] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10`}
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
