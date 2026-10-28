import { Pulso } from "./movimiento";

export function Esqueleto({ className = "" }: { className?: string }) {
  return <Pulso className={`rounded-[var(--radius-tarjeta)] bg-hueso ${className}`} />;
}

export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-superficie" role="status" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
          <Pulso className="size-9 rounded-lg bg-hueso" />
          <Pulso className="h-3.5 flex-1 rounded bg-hueso" />
        </div>
      ))}
    </div>
  );
}
