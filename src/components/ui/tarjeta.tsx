import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Tarjeta blanca con borde fino: la celda de toda rejilla bento. */
export function Tarjeta({ className = "", children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`rounded-[var(--radius-tarjeta)] border border-linea bg-superficie ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Cabecera de tarjeta: etiqueta monoespaciada a la izquierda, acción a la derecha. */
export function CabeceraTarjeta({
  id,
  titulo,
  accion,
  className = "",
}: {
  id?: string;
  titulo: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-12 items-center justify-between gap-3 border-b border-linea px-4 ${className}`}>
      <h2 id={id} className="etiqueta">{titulo}</h2>
      {accion}
    </div>
  );
}

/** Enlace pequeño "Ver todo ↗" para la cabecera de una tarjeta. */
export function EnlaceTarjeta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 rounded text-sm font-medium text-tenue hover:text-tinta">
      {children}
      <ArrowUpRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Lista con separadores dentro de una tarjeta. */
export function Lista({
  className = "",
  ordenada = false,
  children,
}: {
  className?: string;
  ordenada?: boolean;
  children: React.ReactNode;
}) {
  const Etiqueta = ordenada ? "ol" : "ul";
  return <Etiqueta className={`divide-y divide-linea ${className}`}>{children}</Etiqueta>;
}

/** Estado vacío: siempre explicado y, si aplica, con la siguiente acción. */
export function Vacio({
  icono,
  titulo,
  texto,
  accion,
  className = "",
}: {
  icono?: React.ReactNode;
  titulo: string;
  texto: string;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`trama flex flex-col items-center rounded-[var(--radius-tarjeta)] border border-dashed border-linea px-6 py-12 text-center ${className}`}>
      {icono && <div className="mb-3 grid size-11 place-items-center rounded-xl border border-linea bg-superficie text-tenue">{icono}</div>}
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm text-tenue">{texto}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Control segmentado: opciones excluyentes como botones dentro de una cápsula. */
export const claseSegmentado = "inline-flex rounded-lg border border-linea bg-superficie p-0.5";
export const claseSegmento = (activo: boolean) =>
  `h-8 rounded-md px-3 text-sm transition-colors ${activo ? "bg-tinta font-medium text-sobre-tinta" : "text-tenue hover:text-tinta"}`;
