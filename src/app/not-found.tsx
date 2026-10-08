import { Marca } from "@/components/app/marca";
import { EnlaceBoton } from "@/components/ui/boton";
import css from "./not-found.module.css";

export default function NoEncontrado() {
  return (
    <div className={css.pantalla}>
      <header>
        <Marca />
      </header>
      <main className={css.contenido}>
        <h1 className={css.titulo}>No encontramos esta página</h1>
        <p className={css.texto}>
          El enlace puede estar mal escrito, o el alumno o la cita que buscas ya no existe. Desde el inicio puedes
          volver a tu agenda de hoy.
        </p>
        <EnlaceBoton href="/inicio">Ir al inicio</EnlaceBoton>
      </main>
    </div>
  );
}
