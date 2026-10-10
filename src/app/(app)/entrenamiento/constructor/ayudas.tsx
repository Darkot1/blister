"use client";

import { ESTRUCTURAS, ETIQUETA_BLOQUE, letraBloque, minutosPorBloque } from "@/lib/entrenamiento/prescripcion";
import type { BloqueEstado } from "./estado";

const LETRAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

/** Semana en miniatura: un cuadro por día, relleno los días que se entrena. */
function SemanaSvg({ dias }: { dias: readonly number[] }) {
  return (
    <svg aria-hidden viewBox="0 0 146 30" className="h-7 w-auto">
      {LETRAS_SEMANA.map((letra, i) => {
        const entrena = dias.includes(i);
        return (
          <g key={letra} transform={`translate(${i * 21} 0)`}>
            <rect width="18" height="18" rx="4" className={entrena ? "fill-tinta" : "fill-tinta/[0.08]"} />
            <text x="9" y="28" textAnchor="middle" className="fill-tenue font-mono text-[7px]">
              {letra}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Para una rutina nueva: elegir cómo se reparte la semana en lugar de empezar en blanco. */
export function ElegirEstructura({ alElegir }: { alElegir: (dias: readonly string[]) => void }) {
  return (
    <section aria-labelledby="titulo-estructura" className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 sm:p-5">
      <h2 id="titulo-estructura" className="font-semibold tracking-tight">
        ¿Cómo repartes la semana?
      </h2>
      <p className="mt-0.5 text-sm text-tenue">Elige una base y luego cambia lo que quieras: nombres, días y ejercicios.</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {ESTRUCTURAS.map((e) => (
          <li key={e.clave}>
            <button
              type="button"
              onClick={() => alElegir(e.dias)}
              className="flex h-full w-full flex-col items-start gap-2 rounded-lg border border-linea p-3 text-left transition-colors hover:border-tinta/40 hover:bg-fondo/60"
            >
              <SemanaSvg dias={e.semana} />
              <span>
                <span className="block text-sm font-semibold">{e.titulo}</span>
                <span className="block text-xs text-tenue">{e.detalle}</span>
              </span>
              <span className="mt-auto text-xs text-tenue">{e.dias.join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const aNumero = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
const TONOS = ["fill-tinta", "fill-tinta/55", "fill-tinta/30"];

/** Línea de tiempo del día: cuánto ocupa cada bloque en la sesión. */
export function LineaDia({ bloques }: { bloques: BloqueEstado[] }) {
  const minutos = minutosPorBloque(
    bloques.map((b) => ({
      tipo: b.tipo,
      rondas: aNumero(b.rondas),
      descanso_segundos: aNumero(b.descanso_segundos),
      ejercicios: b.ejercicios.map((e) => ({
        series: aNumero(e.series),
        repeticiones: e.repeticiones,
        descanso_segundos: aNumero(e.descanso_segundos),
      })),
    })),
  );
  const total = minutos.reduce((t, m) => t + m, 0);
  if (!total) return null;

  const inicios = minutos.map((_, i) => minutos.slice(0, i).reduce((t, m) => t + m, 0));
  const separacion = total * 0.006;
  return (
    <figure className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie px-4 py-3">
      <figcaption className="mb-2 flex items-baseline justify-between gap-3">
        <span className="etiqueta">Duración estimada</span>
        <span className="cifra text-xl font-semibold">
          ≈{total}
          <span className="ml-0.5 text-sm font-normal text-tenue">min</span>
        </span>
      </figcaption>
      <svg aria-hidden viewBox={`0 0 ${total} 8`} preserveAspectRatio="none" className="h-2.5 w-full">
        {minutos.map((m, i) =>
          m ? (
            <rect key={bloques[i].clave} x={inicios[i]} width={Math.max(m - separacion, 0.1)} height="8" rx="0.4" className={TONOS[i % TONOS.length]} />
          ) : null,
        )}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tenue">
        {bloques.map((b, i) =>
          minutos[i] ? (
            <li key={b.clave} className="flex items-center gap-1.5">
              <svg aria-hidden viewBox="0 0 8 8" className="size-2">
                <rect width="8" height="8" rx="2" className={TONOS[i % TONOS.length]} />
              </svg>
              <span className="font-mono">{letraBloque(i)}</span> {b.nombre || ETIQUETA_BLOQUE[b.tipo]} ·{" "}
              <span className="font-mono">{minutos[i]} min</span>
            </li>
          ) : null,
        )}
      </ul>
    </figure>
  );
}
