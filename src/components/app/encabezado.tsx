import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import css from "./encabezado.module.css";

/**
 * Cabecera de página: el único h1. Título, descripción opcional, acciones (la primaria al final)
 * y enlace "volver" opcional ({ href, texto } o un nodo propio).
 */
export function Encabezado({
  titulo,
  descripcion,
  acciones,
  volver,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  volver?: { href: string; texto: string } | React.ReactNode;
}) {
  const volverEsDestino = typeof volver === "object" && volver !== null && "href" in volver && "texto" in volver;
  return (
    <header className={css.encabezado}>
      {volverEsDestino ? (
        <Link href={volver.href} className={css.volver}>
          <ChevronLeft aria-hidden />
          {volver.texto}
        </Link>
      ) : (
        volver && <div className={css.volver}>{volver}</div>
      )}
      <div className={css.fila}>
        <div className={css.textos}>
          <h1 className={css.titulo}>{titulo}</h1>
          {descripcion && <div className={css.descripcion}>{descripcion}</div>}
        </div>
        {acciones && <div className={css.acciones}>{acciones}</div>}
      </div>
    </header>
  );
}
