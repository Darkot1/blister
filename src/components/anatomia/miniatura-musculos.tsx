import { ALTO_FIGURA, ANCHO_FIGURA, CABEZA, SILUETA, TRAZOS, type Vista } from "./trazos";
import type { RolMuscular } from "./mapa-corporal";

const RELLENO: Record<RolMuscular, string> = {
  principal: "fill-tinta",
  secundario: "fill-tinta/50",
  estabilizador: "fill-tinta/25",
};
const PESO: Record<RolMuscular, number> = { principal: 3, secundario: 1, estabilizador: 0 };
const MARGEN = 16;
const ALTO_MINIMO = 110;

/** Rectángulo que contiene los trazos dados (solo hay coordenadas absolutas en TRAZOS). */
function caja(trazos: string[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const d of trazos) {
    const numeros = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < numeros.length; i += 2) {
      minX = Math.min(minX, numeros[i]);
      minY = Math.min(minY, numeros[i + 1]);
      maxY = Math.max(maxY, numeros[i + 1]);
    }
  }
  return { minX, minY, maxY };
}

/**
 * Miniatura del cuerpo enfocada en lo que trabaja un ejercicio: elige la vista (frente o espalda)
 * con más músculos implicados y se acerca a esa zona. Decorativa: los músculos van también en texto.
 */
export function MiniaturaMusculos({
  resaltados,
  className = "h-12 w-9",
}: {
  resaltados: Record<string, RolMuscular>;
  className?: string;
}) {
  const puntaje = (vista: Vista) =>
    Object.keys(TRAZOS[vista]).reduce((t, slug) => t + (resaltados[slug] ? PESO[resaltados[slug]] + 0.1 : 0), 0);
  const vista: Vista = puntaje("posterior") > puntaje("frontal") ? "posterior" : "frontal";
  const principales = Object.keys(TRAZOS[vista]).filter((s) => resaltados[s] && resaltados[s] !== "estabilizador");

  // Sin músculos: el cuerpo entero, tenue.
  let vb = { x: 40, y: 0, ancho: 120, alto: ALTO_FIGURA };
  if (principales.length) {
    const { minX, minY, maxY } = caja(principales.map((s) => TRAZOS[vista][s]));
    const x = Math.max(0, minX - MARGEN);
    const centro = (minY + maxY) / 2;
    const alto = Math.max(maxY - minY + MARGEN * 2, ALTO_MINIMO, (ANCHO_FIGURA - 2 * x) * 1.25);
    vb = { x, y: Math.min(Math.max(0, centro - alto / 2), ALTO_FIGURA - alto), ancho: ANCHO_FIGURA - 2 * x, alto };
  }

  const mitad = (
    <>
      <path d={SILUETA} className="fill-tinta/[0.12]" />
      <ellipse {...CABEZA} className="fill-tinta/[0.12]" />
      {Object.entries(TRAZOS[vista]).map(([slug, d]) =>
        resaltados[slug] ? <path key={slug} d={d} className={`${RELLENO[resaltados[slug]]} stroke-superficie [stroke-width:1]`} /> : null,
      )}
    </>
  );

  return (
    <svg aria-hidden viewBox={`${vb.x} ${vb.y} ${vb.ancho} ${vb.alto}`} preserveAspectRatio="xMidYMid meet" className={`shrink-0 rounded-md bg-tinta/[0.03] ${className}`}>
      {mitad}
      <g transform={`translate(${ANCHO_FIGURA} 0) scale(-1 1)`}>{mitad}</g>
    </svg>
  );
}
