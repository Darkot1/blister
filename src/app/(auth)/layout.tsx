import { Marca } from "@/components/app/marca";
import { BarraCargada } from "./barra-cargada";
import css from "./layout.module.css";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className={css.pantalla}>
      <header className={css.cabecera}>
        <Marca href="/ingresar" />
      </header>
      <main className={css.formulario}>{children}</main>
      <aside className={css.app} aria-labelledby="que-es-blister">
        <h2 id="que-es-blister" className={css.titulo}>
          Blister es la libreta de trabajo del entrenador personal.
        </h2>
        <p className={css.texto}>
          Aquí registras a tus alumnos y sus mediciones, armas sus rutinas y llevas la agenda de la semana. Se usa
          desde el celular en el gimnasio y desde el computador para planificar.
        </p>
        <div className={css.tarima}>
          <BarraCargada className={css.barra} />
        </div>
      </aside>
    </div>
  );
}
