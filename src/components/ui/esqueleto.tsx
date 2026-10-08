export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-tinta/[0.06] ${className}`} />;
}

export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
