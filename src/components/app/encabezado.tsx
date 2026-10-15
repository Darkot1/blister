import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Encabezado de pantalla: miga (o "volver"), título, descripción y acciones. Un solo h1 por página. */
export function Encabezado({
  titulo,
  miga,
  descripcion,
  acciones,
  volver,
  figura,
}: {
  titulo: React.ReactNode;
  /** Grupo del menú, como rótulo sobre el título ("Gestión"). */
  miga?: string;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  volver?: { href: string; texto: string };
  /** Avatar u otra imagen a la izquierda del título. */
  figura?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {volver ? (
          <Link href={volver.href} className="etiqueta mb-2 inline-flex max-w-full items-center gap-1.5 rounded hover:text-tinta">
            <ArrowLeft aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{volver.texto}</span>
          </Link>
        ) : (
          miga && <p className="etiqueta mb-2">{miga}</p>
        )}
        <div className="flex items-center gap-4">
          {figura}
          <div className="min-w-0">
            <h1 className="titulo-display text-[1.75rem] leading-[1.2] sm:text-[1.875rem]">{titulo}</h1>
            {descripcion && <div className="mt-2 max-w-2xl text-tenue">{descripcion}</div>}
          </div>
        </div>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}
