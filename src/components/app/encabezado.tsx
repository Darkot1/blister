import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Título grande de pantalla, como en las apps del teléfono. Un solo h1 por página. */
export function Encabezado({
  titulo,
  descripcion,
  acciones,
  volver,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  volver?: { href: string; texto: string };
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {volver && (
        <Link
          href={volver.href}
          className="-ml-1.5 mb-2 inline-flex max-w-full items-center gap-0.5 rounded-full py-1 pr-2 text-[0.95rem] font-medium text-acento hover:bg-acento/10"
        >
          <ChevronLeft aria-hidden className="size-5 shrink-0" strokeWidth={2.4} />
          <span className="truncate">{volver.texto}</span>
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[2.125rem] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[2.6rem]">{titulo}</h1>
          {descripcion && <div className="mt-2 text-tenue">{descripcion}</div>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </header>
  );
}
