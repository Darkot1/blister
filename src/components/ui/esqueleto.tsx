export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[var(--radius-tarjeta)] bg-tinta/[0.06] ${className}`} />;
}

export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-tarjeta)] bg-superficie" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div aria-hidden className="size-10 animate-pulse rounded-full bg-tinta/[0.06]" />
          <div aria-hidden className="h-4 flex-1 animate-pulse rounded-full bg-tinta/[0.06]" />
        </div>
      ))}
    </div>
  );
}
