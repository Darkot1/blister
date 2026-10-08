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

        <div>
          <p className="text-[3.25rem] leading-[1.02] font-bold tracking-[-0.035em]">
            Tus alumnos, sus rutinas y tu agenda.
            <span className="text-white/45"> En una sola pantalla.</span>
          </p>
          <p className="mt-5 max-w-sm text-white/60">
            Planifica, registra resultados y sigue el progreso entre sesión y sesión.
          </p>
        </div>
        <span aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full bg-[var(--app-alumnos)] opacity-25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute -bottom-48 -left-24 size-96 rounded-full bg-[var(--app-entrenamiento)] opacity-20 blur-3xl" />
      </aside>
    </div>
  );
}
