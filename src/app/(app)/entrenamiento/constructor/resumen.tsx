"use client";

import { useMemo, useState } from "react";
import { MapaCorporal, type RolMuscular } from "@/components/anatomia/mapa-corporal";
import { claseSegmentado, claseSegmento } from "@/components/ui/tarjeta";
import { minutosEstimados, seriesDe } from "@/lib/entrenamiento/prescripcion";
import type { Catalogo } from "@/lib/entrenamiento/cargar";
import { numero } from "@/lib/formato";
import type { DiaEstado } from "./estado";

const aNumero = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** Series por músculo: cuenta entera si es principal y media si es secundario (criterio habitual de volumen). */
const FACTOR: Partial<Record<RolMuscular, number>> = { principal: 1, secundario: 0.5 };
const VISIBLES = 10;

export function ResumenRutina({
  dias,
  diaActual,
  catalogo,
}: {
  dias: DiaEstado[];
  diaActual: number;
  catalogo: Catalogo;
}) {
  const [alcance, setAlcance] = useState<"dia" | "rutina">("dia");
  const [todos, setTodos] = useState(false);
  const elegidos = alcance === "dia" ? [dias[diaActual]].filter(Boolean) : dias;

  const relacionesDe = useMemo(() => Map.groupBy(catalogo.relaciones, (r) => r.ejercicioId), [catalogo.relaciones]);
  const nombre = useMemo(() => new Map(catalogo.musculos.map((m) => [m.slug, m.nombre])), [catalogo.musculos]);

  const bloques = elegidos.flatMap((d) =>
    d.bloques.map((b) => ({
      tipo: b.tipo,
      rondas: aNumero(b.rondas),
      descanso_segundos: aNumero(b.descanso_segundos),
      ejercicios: b.ejercicios.map((e) => ({
        ejercicio_id: e.ejercicio_id,
        series: aNumero(e.series),
        repeticiones: e.repeticiones,
        descanso_segundos: aNumero(e.descanso_segundos),
      })),
    })),
  );

  const ejercicios = bloques.reduce((t, b) => t + b.ejercicios.length, 0);
  let series = 0;
  const volumen = new Map<string, number>();
  const resaltados: Record<string, RolMuscular> = {};
  const prioridad: Record<RolMuscular, number> = { principal: 3, secundario: 2, estabilizador: 1 };
  for (const b of bloques) {
    for (const e of b.ejercicios) {
      const n = seriesDe(b, e);
      series += n;
      for (const r of relacionesDe.get(e.ejercicio_id) ?? []) {
        const factor = FACTOR[r.rol];
        if (factor) volumen.set(r.slug, (volumen.get(r.slug) ?? 0) + n * factor);
        if (!resaltados[r.slug] || prioridad[r.rol] > prioridad[resaltados[r.slug]]) resaltados[r.slug] = r.rol;
      }
    }
  }
  const porMusculo = [...volumen].sort((a, b) => b[1] - a[1]);
  const maximo = porMusculo[0]?.[1] ?? 1;
  const minutos = alcance === "dia" ? minutosEstimados(bloques) : Math.round(minutosEstimados(bloques) / Math.max(1, elegidos.length));

  return (
    <div className="space-y-4 p-4">
      <div className={claseSegmentado} role="group" aria-label="Qué resumir">
        <button type="button" aria-pressed={alcance === "dia"} onClick={() => setAlcance("dia")} className={claseSegmento(alcance === "dia")}>
          Este día
        </button>
        <button type="button" aria-pressed={alcance === "rutina"} onClick={() => setAlcance("rutina")} className={claseSegmento(alcance === "rutina")}>
          Semana completa
        </button>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Ejercicios", String(ejercicios)],
          ["Series", String(series)],
          [alcance === "dia" ? "Duración" : "Min/día", ejercicios ? `≈${minutos}` : "—"],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-lg border border-linea px-3 py-2">
            <dt className="etiqueta">{etiqueta}</dt>
            <dd className="cifra mt-1 text-2xl font-semibold">
              {valor}
              {etiqueta !== "Ejercicios" && etiqueta !== "Series" && ejercicios > 0 && <span className="ml-0.5 text-sm font-normal text-tenue">min</span>}
            </dd>
          </div>
        ))}
      </dl>

      {ejercicios === 0 ? (
        <p className="text-sm text-tenue">Cuando añadas ejercicios verás aquí qué músculos trabaja y cuántas series recibe cada uno.</p>
      ) : (
        <>
          <MapaCorporal musculos={catalogo.musculos} resaltados={resaltados} mostrarProfundos={false} className="mx-auto max-w-64" />
          <section aria-labelledby="titulo-volumen">
            <h3 id="titulo-volumen" className="etiqueta mb-2">
              Series por músculo
            </h3>
            <p className="mb-3 text-xs text-tenue">Principal = 1 serie; secundario = ½.</p>
            <ul className="space-y-1.5">
              {porMusculo.slice(0, todos ? undefined : VISIBLES).map(([slug, n]) => (
                <li key={slug} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-sm">
                  <span className="truncate">{nombre.get(slug) ?? slug}</span>
                  <span aria-hidden className="h-2 overflow-hidden rounded-full bg-tinta/[0.08]">
                    <span className="block h-full rounded-full bg-tinta" style={{ width: `${(n / maximo) * 100}%` }} />
                  </span>
                  <span className="text-right font-mono text-xs">{numero(n, 1)}</span>
                </li>
              ))}
            </ul>
            {porMusculo.length > VISIBLES && (
              <button type="button" onClick={() => setTodos(!todos)} className="mt-2 text-sm font-medium text-tenue hover:text-tinta">
                {todos ? "Ver menos" : `Ver los ${porMusculo.length} músculos`}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
