/**
 * Línea de tendencia mínima (una serie, en orden cronológico). Trazo de 2 px en tinta, sin ejes:
 * acompaña a la cifra grande, no la reemplaza. Marca el último punto.
 */
export function LineaTendencia({ valores, etiqueta, className = "" }: { valores: number[]; etiqueta: string; className?: string }) {
  if (valores.length < 2) return null;
  const ancho = 120;
  const alto = 36;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = valores.map((v, i) => [
    (i / (valores.length - 1)) * (ancho - 6) + 3,
    alto - 4 - ((v - min) / rango) * (alto - 8),
  ]);
  const [ux, uy] = puntos.at(-1)!;
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={etiqueta} className={`h-9 w-28 overflow-visible ${className}`}>
      <polyline
        points={puntos.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={ux} cy={uy} r="4" fill="var(--acento)" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
