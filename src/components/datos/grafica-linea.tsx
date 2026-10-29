"use client";

import { useEffect, useId, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { fechaCorta, fechaSinAnio, numero } from "@/lib/formato";

export type Punto = { fecha: string; valor: number; nota?: string };

/**
 * Una serie en el tiempo (peso, 1RM estimado…): línea de 2 px en tinta sobre una escala de
 * fechas real (las mediciones no son regulares), ejes y cuadrícula discretos, el último punto
 * resaltado. La cruz se ajusta al punto más cercano (ratón, toque o flechas del teclado) y
 * muestra fecha y valor. Los mismos datos están en la tabla de "Ver datos".
 * Al montarse, la línea se dibuja de izquierda a derecha y luego aparecen los puntos.
 */
export function GraficaLinea({
  puntos,
  unidad,
  titulo,
  decimales = 1,
  alto = 220,
}: {
  puntos: Punto[];
  unidad: string;
  /** Nombre accesible: "Peso de Laura Gómez". */
  titulo: string;
  decimales?: number;
  alto?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(600);
  const [activo, setActivo] = useState<number | null>(null);
  const idTabla = useId();
  // pathLength no es un desplazamiento: MotionConfig no lo frena, así que se apaga aquí.
  const quieto = useReducedMotion();

  useEffect(() => {
    const caja = ref.current;
    if (!caja) return;
    const observador = new ResizeObserver(([e]) => setAncho(Math.max(240, Math.round(e.contentRect.width))));
    observador.observe(caja);
    return () => observador.disconnect();
  }, []);

  const datos = [...puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (datos.length < 2) return null;

  const margen = { arriba: 12, derecha: 16, abajo: 28, izquierda: 44 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;

  const tiempos = datos.map((p) => new Date(p.fecha).getTime());
  const t0 = tiempos[0];
  const t1 = tiempos.at(-1)!;
  const valores = datos.map((p) => p.valor);
  const [min, max] = rango(Math.min(...valores), Math.max(...valores));
  const x = (t: number) => margen.izquierda + (t1 === t0 ? anchoUtil / 2 : ((t - t0) / (t1 - t0)) * anchoUtil);
  const y = (v: number) => margen.arriba + altoUtil - ((v - min) / (max - min)) * altoUtil;
  const marcas = Array.from({ length: 4 }, (_, i) => min + ((max - min) * i) / 3);
  const xs = tiempos.map(x);
  const ruta = datos.map((p, i) => `${i ? "L" : "M"}${xs[i].toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");

  const masCercano = (px: number) => xs.reduce((mejor, xi, i) => (Math.abs(xi - px) < Math.abs(xs[mejor] - px) ? i : mejor), 0);
  const actual = activo === null ? null : datos[activo];
  const ultimo = datos.length - 1;
  // Etiquetas del eje X: primera, última y (si hay sitio) la del medio.
  const etiquetasX = ancho > 420 && datos.length > 2 ? [0, Math.floor(ultimo / 2), ultimo] : [0, ultimo];

  return (
    <figure className="m-0 min-w-0">
      {/* El SVG ocupa el ancho disponible (viewBox): nunca ensancha su columna; el ancho medido solo afina las proporciones. */}
      <div ref={ref} className="relative w-full min-w-0">
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          width="100%"
          height={alto}
          role="img"
          aria-label={`${titulo}: de ${numero(datos[0].valor, decimales)} a ${numero(datos[ultimo].valor, decimales)} ${unidad} entre el ${fechaCorta(datos[0].fecha)} y el ${fechaCorta(datos[ultimo].fecha)}`}
          aria-describedby={idTabla}
          tabIndex={0}
          className="block touch-pan-y rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2"
          onPointerMove={(e) => setActivo(masCercano(e.clientX - e.currentTarget.getBoundingClientRect().left))}
          onPointerLeave={() => setActivo(null)}
          onFocus={() => setActivo(ultimo)}
          onBlur={() => setActivo(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setActivo((a) => Math.min(ultimo, Math.max(0, (a ?? ultimo) + (e.key === "ArrowLeft" ? -1 : 1))));
            }
          }}
        >
          {/* Cuadrícula y eje Y: discretos. */}
          {marcas.map((v) => (
            <g key={v}>
              <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y(v)} y2={y(v)} className="stroke-linea" strokeWidth="1" />
              <text x={margen.izquierda - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-tenue text-[11px] tabular-nums">
                {numero(v, max - min < 10 ? 1 : 0)}
              </text>
            </g>
          ))}
          {etiquetasX.map((i) => (
            <text
              key={i}
              x={xs[i]}
              y={alto - 8}
              textAnchor={i === 0 ? "start" : i === ultimo ? "end" : "middle"}
              className="fill-tenue text-[11px] tabular-nums"
            >
              {fechaSinAnio(datos[i].fecha)}
            </text>
          ))}

          <m.path
            d={ruta}
            fill="none"
            className="stroke-tinta"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={quieto ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* Puntos pequeños solo si son pocos; el último siempre, en cobalto con anillo del fondo. */}
          <m.g initial={quieto ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.3 }}>
            {datos.length <= 24 &&
              datos.slice(0, -1).map((p, i) => <circle key={p.fecha + i} cx={xs[i]} cy={y(p.valor)} r="3" className="fill-tinta" />)}
          </m.g>
          <m.circle
            cx={xs[ultimo]}
            cy={y(datos[ultimo].valor)}
            r="5"
            className="fill-acento stroke-superficie"
            strokeWidth="2"
            style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.85, type: "spring", stiffness: 500, damping: 22 }}
          />

          {actual && activo !== null && (
            <g aria-hidden>
              <line x1={xs[activo]} x2={xs[activo]} y1={margen.arriba} y2={margen.arriba + altoUtil} className="stroke-linea-fuerte" strokeWidth="1" />
              <circle cx={xs[activo]} cy={y(actual.valor)} r="5" className="fill-tinta stroke-superficie" strokeWidth="2" />
            </g>
          )}
        </svg>

        {actual && activo !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 rounded-lg border border-linea bg-superficie px-2.5 py-1.5 text-xs shadow-suave"
            style={{ left: Math.min(Math.max(xs[activo] - 60, 0), ancho - 130), width: 120 }}
          >
            <p className="tabular-nums text-sm font-semibold text-tinta">
              {numero(actual.valor, decimales)} {unidad}
            </p>
            <p className="text-tenue">{fechaCorta(actual.fecha)}</p>
            {actual.nota && <p className="truncate text-tenue">{actual.nota}</p>}
          </div>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-tenue hover:text-tinta">Ver datos</summary>
        <table id={idTabla} className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr className="text-xs text-tenue">
              <th scope="col" className="py-1 font-medium">Fecha</th>
              <th scope="col" className="py-1 text-right font-medium">{unidad}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {[...datos].reverse().map((p, i) => (
              <tr key={p.fecha + i}>
                <td className="py-1">{fechaCorta(p.fecha)}</td>
                <td className="py-1 text-right tabular-nums">{numero(p.valor, decimales)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Margen arriba y abajo para que la línea no toque los bordes; si todo es igual, un rango mínimo. */
function rango(min: number, max: number): [number, number] {
  if (max - min < 1e-9) return [min - 1, max + 1];
  const holgura = (max - min) * 0.12;
  return [min - holgura, max + holgura];
}
