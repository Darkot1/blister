export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-tinta px-6 py-5 text-white lg:px-14 lg:py-14">
        <p className="font-titulo text-2xl font-semibold tracking-tight">Blister Fitness</p>
        <div className="relative z-10 hidden lg:block">
          <p className="font-titulo text-[4.5rem] leading-[0.95] font-semibold tracking-tight text-white">
            Cada alumno,
            <br />
            cada serie,
            <br />
            en un solo lugar.
          </p>
          <p className="mt-6 max-w-sm text-white/70">
            Planifica rutinas, registra resultados y sigue el progreso de tus alumnos.
          </p>
        </div>
        {/* Discos: el único elemento decorativo, en los colores de competición. */}
        <div aria-hidden className="pointer-events-none absolute -top-28 -right-28 hidden lg:block">
          <div className="relative size-96">
            <span className="absolute inset-0 rounded-full border-[28px] border-acento" />
            <span className="absolute inset-[72px] rounded-full border-[22px] border-white/15" />
            <span className="absolute inset-[164px] rounded-full bg-white/20" />
          </div>
        </div>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
