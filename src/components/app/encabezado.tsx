export function Encabezado({
  titulo,
  descripcion,
  acciones,
  volver,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  volver?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {volver && <div className="mb-3">{volver}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-titulo text-[2.5rem] leading-none font-semibold tracking-tight">{titulo}</h1>
          {descripcion && <div className="mt-2 text-tenue">{descripcion}</div>}
        </div>
        {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
      </div>
    </header>
  );
}
