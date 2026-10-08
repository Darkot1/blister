import { useId } from "react";
import { cx } from "@/lib/clases";
import css from "./seccion.module.css";

/**
 * Sección de página: título en Big Shoulders (h2 por defecto) + contenido, enlazados con aria-labelledby.
 * Sin caja: las secciones se separan por espacio (`Pila espacio={10}`) y por su título.
 */
export function Seccion({
  titulo,
  descripcion,
  contador,
  acciones,
  nivel = 2,
  id,
  className,
  children,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Número junto al título, en texto tenue: "Notas 3". */
  contador?: number;
  /** Acciones secundarias a la derecha del título. */
  acciones?: React.ReactNode;
  nivel?: 2 | 3;
  /** @deprecated Las secciones ya no van en caja; no hace nada. Si el contenido es una superficie de trabajo, usa `Tarjeta` dentro. */
  tarjeta?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const generado = useId();
  const idTitulo = id ?? `seccion-${generado}`;
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={idTitulo} className={cx(css.seccion, className)}>
      <div className={css.cabecera}>
        <div className={css.textos}>
          <Titulo id={idTitulo} className={cx(css.titulo, nivel === 2 ? css.nivel2 : css.nivel3)}>
            {titulo}
            {contador !== undefined && <span className={css.contador}>{contador}</span>}
          </Titulo>
          {descripcion && <p className={css.descripcion}>{descripcion}</p>}
        </div>
        {acciones && <div className={css.acciones}>{acciones}</div>}
      </div>
      {children}
    </section>
  );
}
