import { Marca } from "@/components/app/marca";
import { SECCIONES } from "@/components/app/secciones";
import { IconoApp } from "@/components/ui/icono-app";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-3">
      {/* Panel de marca: la pantalla de inicio de la app, en miniatura. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden rounded-[2.25rem] bg-tinta p-12 text-white lg:flex">
        <Marca oscuro />

        <div aria-hidden className="mx-auto grid w-full max-w-sm grid-cols-4 gap-x-4 gap-y-6">
          {SECCIONES.map((s) => (
            <div key={s.href} className="flex flex-col items-center gap-2">
              <IconoApp icono={s.icono} tono={s.tono} tamano="lg" />
              <span className="text-xs text-white/70">{s.texto}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <span className="grid size-14 place-items-center rounded-[28%] border-2 border-dashed border-white/20 text-2xl text-white/30">+</span>
            <span className="text-xs text-white/40">Pronto</span>
          </div>
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

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[25rem]">
          <Marca className="mb-8 lg:hidden" />
          <div className="rounded-[2rem] bg-superficie p-6 shadow-[0_1px_2px_rgb(18_20_23/0.04),0_12px_40px_-12px_rgb(18_20_23/0.12)] sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
