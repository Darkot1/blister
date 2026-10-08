"use client";

import { useId, useState } from "react";
import { cx } from "@/lib/clases";
import { Chip } from "@/components/ui/filtros";
import { ALTO_FIGURA, ANCHO_FIGURA, CABEZA, DETALLES, SILUETA, SLUGS_DIBUJADOS, TRAZOS, type Vista } from "./trazos";
import css from "./mapa-corporal.module.css";

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
  principal: css.principal,
  secundario: css.secundario,
  estabilizador: css.estabilizador,
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
  const idProfundos = useId();
  const nombre = new Map(musculos.map((m) => [m.slug, m.nombre]));
  const elegidos = new Set(seleccionados);
  const interactivo = Boolean(alAlternar);
  const profundos = musculos.filter((m) => !SLUGS_DIBUJADOS.has(m.slug));

  const relleno = (slug: string) => {
    if (elegidos.has(slug)) return css.seleccionado;
    if (resaltados?.[slug]) return RELLENO_ROL[resaltados[slug]];
    if (enfocado === slug) return css.enfocado;
    return undefined;
  };

  const mitad = (vista: Vista, reflejada: boolean) => (
    <>
      <path d={SILUETA} className={css.silueta} />
      {!reflejada && <ellipse {...CABEZA} className={css.silueta} />}
      {Object.entries(TRAZOS[vista]).map(([slug, d]) => {
        if (!nombre.has(slug)) return null;
        const etiqueta = nombre.get(slug)!;
        const accesible = interactivo && !reflejada;
        return (
          <path
            key={slug}
            d={d}
            data-musculo={slug}
            className={cx(css.musculo, relleno(slug), interactivo && css.interactivo)}
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
        <path d={DETALLES[vista]} className={css.detalles} />
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
      <p aria-live="polite" className={css.rotulo}>
        {enfocado ? nombre.get(enfocado) : <span className={css.ayuda}>{interactivo ? "Toca un músculo" : ""}</span>}
      </p>

      <svg
        viewBox={`0 0 ${anchoTotal} ${ALTO_FIGURA + ALTO_ETIQUETA}`}
        className={css.svg}
        {...(interactivo
          ? { role: "group", "aria-label": "Mapa corporal: elige músculos" }
          : { role: "img", "aria-label": resumen ? `Músculos trabajados: ${resumen}` : "Mapa corporal" })}
      >
        {VISTAS.map(({ vista, titulo }, i) => (
          <g key={vista} transform={`translate(${i * (ANCHO_UTIL + SEPARACION) - RECORTE_X} 0)`}>
            {mitad(vista, false)}
            <g transform={`translate(${ANCHO_FIGURA} 0) scale(-1 1)`}>{mitad(vista, true)}</g>
            <text x={ANCHO_FIGURA / 2} y={ALTO_FIGURA + 12} textAnchor="middle" fontSize={9} aria-hidden
              className={css.tituloVista}>
              {titulo}
            </text>
          </g>
        ))}
      </svg>

      {resaltados && (
        <ul aria-label="Leyenda" className={css.leyenda}>
          {(Object.keys(RELLENO_ROL) as RolMuscular[]).map((rol) => (
            <li key={rol} className={css.itemLeyenda}>
              <span aria-hidden className={cx(css.muestra, RELLENO_ROL[rol])} />
              {ETIQUETA_ROL[rol]}
            </li>
          ))}
        </ul>
      )}

      {interactivo && profundos.length > 0 && (
        <div role="group" aria-labelledby={idProfundos} className={css.profundos}>
          <p id={idProfundos} className={css.rotuloProfundos}>Músculos profundos</p>
          <div className={css.listaProfundos}>
            {profundos.map((m) => (
              <Chip key={m.slug} activo={elegidos.has(m.slug)} onClick={() => alAlternar!(m.slug)}>
                {m.nombre}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
