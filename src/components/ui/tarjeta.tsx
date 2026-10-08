import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Tarjeta blanca muy redondeada: la unidad básica de toda pantalla. */
export function Tarjeta({
  className = "",
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={`rounded-[var(--radius-tarjeta)] bg-superficie ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Título pequeño de grupo, como en los ajustes del teléfono. */
export function TituloGrupo({ id, children, accion }: { id?: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 id={id} className="text-[1.15rem] font-bold tracking-tight">{children}</h2>
      {accion}
    </div>
  );
}

/** Enlace "Ver todo ›" para el título de un grupo. */
export function EnlaceGrupo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center text-sm font-semibold text-acento hover:underline">
      {children}
      <ChevronRight aria-hidden className="size-4" />
    </Link>
  );
}

/**
 * Lista agrupada: filas dentro de una tarjeta con separadores que no llegan al borde izquierdo.
 * `sangria` alinea el separador con el texto cuando la fila empieza con avatar o icono.
 */
export function ListaAgrupada({
  className = "",
  ordenada = false,
  sangria = "1rem",
  children,
}: { className?: string; ordenada?: boolean; sangria?: string; children: React.ReactNode }) {
  const Etiqueta = ordenada ? "ol" : "ul";
  return (
    <Etiqueta
      className={`lista-agrupada overflow-hidden rounded-[var(--radius-tarjeta)] bg-superficie ${className}`}
      style={{ "--sangria": sangria } as React.CSSProperties}
    >
      {children}
    </Etiqueta>
  );
}

/** Estado vacío: siempre explicado y, si aplica, con la siguiente acción. */
export function Vacio({
  icono,
  titulo,
  texto,
  accion,
}: {
  icono?: React.ReactNode;
  titulo: string;
  texto: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-tarjeta)] bg-superficie px-6 py-12 text-center">
      {icono && <div className="mb-4">{icono}</div>}
      <p className="text-lg font-bold tracking-tight">{titulo}</p>
      <p className="mt-1 max-w-sm text-tenue">{texto}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Control segmentado: opciones excluyentes como botones dentro de una cápsula. */
export const claseSegmentado = "inline-flex rounded-2xl bg-tinta/[0.06] p-1";
export const claseSegmento = (activo: boolean) =>
  `h-9 rounded-xl px-3.5 text-sm transition-colors ${
    activo ? "bg-superficie font-semibold text-tinta shadow-[0_1px_3px_rgb(18_20_23/0.12)]" : "text-tenue hover:text-tinta"
  }`;
