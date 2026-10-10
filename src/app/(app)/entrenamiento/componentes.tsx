import { Tarjeta } from "@/components/ui/tarjeta";
import type { DiaArbol } from "@/lib/entrenamiento/cargar";
import { ETIQUETA_BLOQUE, esPorRondas, letraBloque, minutosEstimados, seriesDe, type TipoBloque } from "@/lib/entrenamiento/prescripcion";
import { numero } from "@/lib/formato";

export const ETIQUETA_ESTADO_PLAN: Record<string, string> = {
  borrador: "Sin activar",
  activo: "Activo",
  completado: "Completado",
  archivado: "Archivado",
};

const PUNTO_PLAN: Record<string, string> = {
  borrador: "bg-aviso",
  activo: "bg-exito",
  completado: "bg-tenue/60",
  archivado: "bg-tenue/60",
};

export function InsigniaPlan({ estado }: { estado: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${PUNTO_PLAN[estado] ?? PUNTO_PLAN.archivado}`} />
      {ETIQUETA_ESTADO_PLAN[estado] ?? estado}
    </span>
  );
}

/** "3 × 8-12", "4 × —" o "5 min". */
function prescripcion(series: number, repeticiones: string | null) {
  return `${series} × ${repeticiones ?? "—"}`;
}

/** Rutina en solo lectura: un bloque por tarjeta, como la verá quien la ejecute. */
export function VistaRutina({ dias, nombreDe }: { dias: DiaArbol[]; nombreDe: Map<string, string> }) {
  if (!dias.length) return <p className="text-sm text-tenue">Este plan no tiene días.</p>;
  return (
    <div className="space-y-6">
      {dias.map((dia, d) => {
        const minutos = minutosEstimados(dia.bloques);
        const ejercicios = dia.bloques.reduce((t, b) => t + b.ejercicios.length, 0);
        return (
          <section key={dia.id} aria-labelledby={`dia-${dia.id}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`dia-${dia.id}`} className="text-lg font-semibold tracking-tight">
                <span className="etiqueta mr-2">Día {d + 1}</span>
                {dia.nombre}
              </h2>
              <p className="font-mono text-xs text-tenue">
                {ejercicios} ejercicios{ejercicios > 0 && ` · ≈${minutos} min`}
              </p>
            </div>
            {dia.bloques.length === 0 ? (
              <p className="rounded-[var(--radius-tarjeta)] border border-dashed border-linea px-4 py-5 text-sm text-tenue">Día sin ejercicios.</p>
            ) : (
              <Tarjeta className="overflow-hidden">
                {dia.bloques.map((bloque, b) => (
                  <div key={bloque.id} className="border-t border-linea first:border-t-0">
                    <div className="flex flex-wrap items-center gap-2 bg-fondo/60 px-4 py-2">
                      <span className="grid size-6 place-items-center rounded-md bg-tinta font-mono text-[0.7rem] font-semibold text-sobre-tinta">
                        {letraBloque(b)}
                      </span>
                      <span className="text-sm font-semibold">{bloque.nombre}</span>
                      <span className="text-xs text-tenue">
                        {ETIQUETA_BLOQUE[bloque.tipo as TipoBloque] ?? bloque.tipo}
                        {esPorRondas(bloque.tipo) &&
                          ` · ${bloque.rondas ?? 1} rondas${bloque.descanso_segundos ? ` · ${bloque.descanso_segundos} s entre rondas` : ""}`}
                      </span>
                    </div>
                    <ol className="divide-y divide-linea">
                      {bloque.ejercicios.map((e, i) => (
                        <li key={e.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 px-4 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_7rem_5rem_5rem_3.5rem] sm:items-center">
                          <span className="font-mono text-xs font-semibold text-tenue">
                            {letraBloque(b)}
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{nombreDe.get(e.ejercicio_id) ?? "Ejercicio no disponible"}</p>
                            {(e.notas || e.tempo || e.rpe !== null) && (
                              <p className="truncate text-xs text-tenue">
                                {[e.tempo && `Tempo ${e.tempo}`, e.rpe !== null && `RPE ${numero(e.rpe)}`, e.notas].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          <p className="col-start-2 font-mono text-sm sm:col-start-auto">
                            {prescripcion(seriesDe(bloque, e), e.repeticiones)}
                            <span className="text-tenue sm:hidden">
                              {e.peso !== null && ` · ${numero(e.peso)} ${e.unidad_peso}`}
                              {e.descanso_segundos !== null && ` · ${e.descanso_segundos} s`}
                              {e.rir !== null && ` · RIR ${numero(e.rir)}`}
                            </span>
                          </p>
                          <p className="hidden font-mono text-sm sm:block">{e.peso !== null ? `${numero(e.peso)} ${e.unidad_peso}` : "—"}</p>
                          <p className="hidden font-mono text-sm sm:block">{e.descanso_segundos !== null ? `${e.descanso_segundos} s` : "—"}</p>
                          <p className="hidden font-mono text-sm sm:block">{e.rir !== null ? `RIR ${numero(e.rir)}` : "—"}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </Tarjeta>
            )}
          </section>
        );
      })}
    </div>
  );
}
