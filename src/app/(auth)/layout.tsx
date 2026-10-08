import { CalendarDays, Dumbbell, LineChart, Users } from "lucide-react";
import { Marca } from "@/components/app/marca";
import { SelectorTema } from "@/components/app/selector-tema";

/** Lo que hace la app, como una rejilla bento (decorativa). */
const FUNCIONES = [
  { icono: Users, titulo: "Fichas de alumnos", texto: "Contacto, notas y objetivos", clase: "col-span-2" },
  { icono: CalendarDays, titulo: "Agenda", texto: "Tu semana de citas", clase: "row-span-2", barras: true },
  { icono: Dumbbell, titulo: "Mapa muscular", texto: "Ejercicios por músculo", clase: "" },
  { icono: LineChart, titulo: "Mediciones", texto: "Peso y medidas en el tiempo", clase: "", destacada: true },
];

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-3">
      <aside className="hidden flex-col justify-between overflow-hidden rounded-2xl bg-panel p-10 text-white lg:flex xl:p-12">
        <Marca oscuro />

        <div aria-hidden className="mx-auto grid w-full max-w-md grid-cols-3 grid-rows-[repeat(2,7.5rem)] gap-3">
          {FUNCIONES.map(({ icono: Icono, titulo, texto, clase, barras, destacada }) => (
            <div
              key={titulo}
              className={`flex flex-col rounded-xl border p-4 ${clase} ${destacada ? "border-acento bg-acento text-sobre-acento" : "border-white/10 bg-white/[0.04]"}`}
            >
              <Icono className={`size-5 ${destacada ? "" : "text-acento"}`} />
              {barras && (
                <div className="mt-auto flex h-20 items-end gap-1.5 pt-4">
                  {[40, 70, 30, 90, 55, 20, 0].map((h, i) => (
                    <span key={i} className={`flex-1 rounded-t-[3px] ${i === 3 ? "bg-acento" : "bg-white/20"}`} style={{ height: `${Math.max(h, 4)}%` }} />
                  ))}
                </div>
              )}
              <p className={`text-sm font-semibold ${barras ? "mt-3" : "mt-auto"}`}>{titulo}</p>
              <p className={`text-xs ${destacada ? "text-sobre-acento/60" : "text-white/50"}`}>{texto}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="max-w-lg text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em]">
            El panel de control de tu entrenamiento personalizado.
          </p>
          <p className="mt-4 max-w-sm text-white/55">
            Alumnos, agenda, ejercicios y progreso en un solo lugar, listos entre sesión y sesión.
          </p>
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[24rem]">
          <div className="mb-8 flex items-center justify-between gap-3 lg:justify-end">
            <Marca className="lg:hidden" />
            <div className="w-28 sm:w-56"><SelectorTema /></div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
