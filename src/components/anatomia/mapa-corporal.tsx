"use client";

import { useState } from "react";
import { ALTO_FIGURA, ANCHO_FIGURA, CABEZA, DETALLES, SILUETA, SLUGS_DIBUJADOS, TRAZOS, type Vista } from "./trazos";

export type RolMuscular = "principal" | "secundario" | "estabilizador";
export type MusculoMapa = { slug: string; nombre: string };

// La figura ocupa x ∈ [42, 158] de su lienzo de 200: se recorta el aire lateral.
const RECORTE_X = 40;
const ANCHO_UTIL = 120;
const SEPARACION = 10;
const ALTO_ETIQUETA = 18;
const VISTAS: { vista: Vista; titulo: string }[] = [
  { vista: "frontal", titulo: "Frente" },
  { vista: "posterior", titulo: "Espalda" },
];

const RELLENO_ROL: Record<RolMuscular, string> = {
  principal: "fill-tinta",
  secundario: "fill-tinta/55",
  estabilizador: "fill-tinta/30",
};

export const ETIQUETA_ROL: Record<RolMuscular, string> = {
  principal: "Principal",
  secundario: "Secundario",
  estabilizador: "Estabilizador",
};

/**
 * Cuerpo humano en SVG, frente y espalda lado a lado.
 *
 * - Selección: pasa `seleccionados` + `alAlternar` (cada clic alterna un slug).
 * - Solo lectura: pasa `resaltados` (slug → rol) para mostrar qué trabaja un ejercicio.
 *
 * Cada trazo lleva `data-musculo` con el slug de public.musculos.
 */
export function MapaCorporal({
  musculos,
  seleccionados = [],
  resaltados,
  alAlternar,
  className = "",
}: {
  musculos: MusculoMapa[];
  seleccionados?: string[];
  resaltados?: Record<string, RolMuscular>;
  alAlternar?: (slug: string) => void;
  className?: string;
}) {
  const [enfocado, setEnfocado] = useState<string | null>(null);
  const nombre = new Map(musculos.map((m) => [m.slug, m.nombre]));
  const elegidos = new Set(seleccionados);
  const interactivo = Boolean(alAlternar);
  const profundos = musculos.filter((m) => !SLUGS_DIBUJADOS.has(m.slug));

  const relleno = (slug: string) => {
    if (elegidos.has(slug)) return "fill-tinta";
    if (resaltados?.[slug]) return RELLENO_ROL[resaltados[slug]];
    if (enfocado === slug) return "fill-tinta/40";
    return "fill-tinta/[0.13]";
  };

  const mitad = (vista: Vista, reflejada: boolean) => (
    <>
      <path d={SILUETA} className="fill-tinta/[0.06]" />
      {!reflejada && <ellipse {...CABEZA} className="fill-tinta/[0.06]" />}
      {Object.entries(TRAZOS[vista]).map(([slug, d]) => {
        if (!nombre.has(slug)) return null;
        const etiqueta = nombre.get(slug)!;
        const accesible = interactivo && !reflejada;
        return (
          <path
            key={slug}
            d={d}
            data-musculo={slug}
            className={`${relleno(slug)} stroke-superficie transition-colors duration-150 [stroke-linejoin:round] [stroke-width:1.2] ${
              interactivo ? "cursor-pointer outline-none focus-visible:stroke-tinta focus-visible:[stroke-width:2]" : ""
            }`}
            onPointerEnter={() => setEnfocado(slug)}
            onPointerLeave={() => setEnfocado(null)}
            onClick={alAlternar ? () => alAlternar(slug) : undefined}
            {...(accesible
              ? {
                  role: "checkbox",
                  tabIndex: 0,
                  "aria-checked": elegidos.has(slug),
                  "aria-label": etiqueta,
                  onFocus: () => setEnfocado(slug),
                  onBlur: () => setEnfocado(null),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      alAlternar!(slug);
                    }
                  },
                }
              : { "aria-hidden": true })}
          >
            {!interactivo && !reflejada && <title>{etiqueta}</title>}
          </path>
        );
      })}
      {DETALLES[vista] && (
        <path d={DETALLES[vista]} className="pointer-events-none fill-none stroke-superficie [stroke-width:1.2]" />
      )}
    </>
  );

  const anchoTotal = ANCHO_UTIL * 2 + SEPARACION;
  const resumen = resaltados
    ? Object.entries(resaltados)
        .map(([slug, rol]) => `${nombre.get(slug) ?? slug} (${ETIQUETA_ROL[rol].toLowerCase()})`)
        .join(", ")
    : "";

  return (
    <div className={className}>
      <p aria-live="polite" className="mb-2 h-6 truncate text-center text-sm font-semibold">
        {enfocado ? nombre.get(enfocado) : <span className="font-normal text-tenue">{interactivo ? "Toca un músculo" : ""}</span>}
      </p>

      <svg
        viewBox={`0 0 ${anchoTotal} ${ALTO_FIGURA + ALTO_ETIQUETA}`}
        className="mx-auto block max-h-[30rem] w-full select-none"
        {...(interactivo
          ? { role: "group", "aria-label": "Mapa corporal: elige músculos" }
          : { role: "img", "aria-label": resumen ? `Músculos trabajados: ${resumen}` : "Mapa corporal" })}
      >
        {VISTAS.map(({ vista, titulo }, i) => (
          <g key={vista} transform={`translate(${i * (ANCHO_UTIL + SEPARACION) - RECORTE_X} 0)`}>
            {mitad(vista, false)}
            <g transform={`translate(${ANCHO_FIGURA} 0) scale(-1 1)`}>{mitad(vista, true)}</g>
            <text x={ANCHO_FIGURA / 2} y={ALTO_FIGURA + 12} textAnchor="middle" aria-hidden
              className="fill-tenue text-[9px] font-semibold tracking-wider uppercase">
              {titulo}
            </text>
          </g>
        ))}
      </svg>

      {resaltados && (
        <ul aria-label="Leyenda" className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-tenue">
          {(Object.keys(RELLENO_ROL) as RolMuscular[]).map((rol) => (
            <li key={rol} className="flex items-center gap-1.5">
              <svg aria-hidden viewBox="0 0 10 10" className="size-2.5"><rect width="10" height="10" rx="2" className={RELLENO_ROL[rol]} /></svg>
              {ETIQUETA_ROL[rol]}
            </li>
          ))}
        </ul>
      )}

      {interactivo && profundos.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-tenue uppercase">Músculos profundos</p>
          <div className="flex flex-wrap gap-1.5">
            {profundos.map((m) => (
              <button
                key={m.slug}
                type="button"
                aria-pressed={elegidos.has(m.slug)}
                onClick={() => alAlternar!(m.slug)}
                className={`rounded-full border px-2.5 py-1 text-sm transition-colors ${
                  elegidos.has(m.slug)
                    ? "border-tinta bg-tinta text-white"
                    : "border-linea bg-superficie text-tinta hover:border-tinta/40"
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
