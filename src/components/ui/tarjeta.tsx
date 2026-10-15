import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Superficie grafito un paso más clara que el lienzo (y un filo apenas visible): la celda de toda rejilla bento. */
export function Tarjeta({ className = "", children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={`rounded-[var(--radius-tarjeta)] bg-superficie ring-1 ring-linea ${className}`} {...props}>
      {children}
    </div>
  );
}

/** Cabecera de tarjeta: título breve a la izquierda, acción a la derecha. */
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
    <div className={`flex min-h-13 items-center justify-between gap-3 border-b border-linea px-5 ${className}`}>
      <h2 id={id} className="text-[0.9375rem] font-semibold text-grafito">{titulo}</h2>
      {accion}
    </div>
  );
}

/** Enlace pequeño "Ver todo ↗" para la cabecera de una tarjeta. */
export function EnlaceTarjeta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 rounded text-sm font-medium text-tenue underline-offset-4 transition-colors duration-200 hover:text-tinta hover:underline">
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
    <div className={`trama flex flex-col items-center rounded-[var(--radius-tarjeta)] border border-dashed border-linea-fuerte/50 px-6 py-14 text-center ${className}`}>
      {icono && <div className="mb-4 grid size-11 place-items-center rounded-full bg-hueso text-grafito">{icono}</div>}
      <p className="titulo-display text-xl">{titulo}</p>
      <p className="mt-1.5 max-w-sm text-sm text-tenue">{texto}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Control segmentado: opciones excluyentes como botones dentro de una cápsula. */
export const claseSegmentado = "inline-flex rounded-full bg-hueso p-1";
export const claseSegmento = (activo: boolean) =>
  `h-8 rounded-full px-3.5 text-sm transition-colors duration-200 ${activo ? "bg-tinta font-medium text-sobre-tinta" : "text-grafito hover:text-tinta"}`;
