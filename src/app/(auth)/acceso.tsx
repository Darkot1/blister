import css from "./acceso.module.css";

/** Título (único h1) y bajada de una pantalla de acceso. */
export function CabeceraAcceso({ titulo, descripcion }: { titulo: string; descripcion: React.ReactNode }) {
  return (
    <header className={css.cabecera}>
      <h1 className={css.titulo}>{titulo}</h1>
      <p className={css.descripcion}>{descripcion}</p>
    </header>
  );
}

/** Pie con el enlace a la pantalla hermana: "¿Aún no tienes cuenta? Crea una". */
export function PieAcceso({ children }: { children: React.ReactNode }) {
  return <p className={css.pie}>{children}</p>;
}
