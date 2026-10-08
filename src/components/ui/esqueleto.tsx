export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-[var(--radius-tarjeta)] bg-tinta/[0.06] ${className}`} />;
}

export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-superficie" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
          <div aria-hidden className="size-9 animate-pulse rounded-lg bg-tinta/[0.06]" />
          <div aria-hidden className="h-3.5 flex-1 animate-pulse rounded bg-tinta/[0.06]" />
        </div>
      ))}
    </div>
  );
}
