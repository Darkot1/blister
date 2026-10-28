"use client";

import { useRef, useState, useTransition } from "react";
import { Check, CheckCheck, Minus, Plus, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { AreaTexto, Selector } from "@/components/ui/campo";
import { APARECE } from "@/components/ui/movimiento";
import { Tarjeta } from "@/components/ui/tarjeta";
import { numero } from "@/lib/formato";
import type { EjercicioDeSesion, Serie } from "@/lib/entrenamiento/sesiones";
import { agregarSerie, guardarSerie, quitarSerie, reabrirSesion, terminarSesion } from "../acciones";

type Edicion = { peso: string; repeticiones: string; completada: boolean };

/** Con coma decimal, como se escribe en Colombia ("52,5"); al guardar se aceptan coma o punto. */
const texto = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));
const aNumero = (v: string) => {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};
/** "8-12" → 8: al marcar una serie sin repeticiones se toma lo pedido. */
const repsObjetivo = (r: string | null | undefined) => {
  const n = Number.parseInt(r ?? "", 10);
  return Number.isFinite(n) ? n : null;
};

/** Curva de salida suave para alturas y anchos (entra rápido, frena al final). */
const SUAVE = [0.22, 1, 0.36, 1] as const;

/**
 * Botón "hecha" al estilo de una lista de tareas: al marcarla da un pequeño salto y el ✓ se dibuja;
 * sin marcar, el ✓ queda tenue como pista de para qué sirve.
 */
function MarcaHecha({ hecha, quieto, ...props }: { hecha: boolean; quieto: boolean } & React.ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      type="button"
      aria-pressed={hecha}
      initial={false}
      animate={{ scale: hecha && !quieto ? [1, 1.18, 1] : 1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className={`grid size-11 place-items-center justify-self-center rounded-full border transition-colors ${
        hecha ? "border-exito bg-exito text-superficie" : "border-linea-fuerte/70 text-tenue hover:border-tinta hover:text-tinta"
      }`}
      {...props}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]">
        {!hecha && <path d="M20 6 9 17l-5-5" className="opacity-60" />}
        <motion.path
          d="M20 6 9 17l-5-5"
          initial={false}
          animate={{ pathLength: hecha ? 1 : 0, opacity: hecha ? 1 : 0 }}
          transition={quieto ? { duration: 0 } : { pathLength: { duration: 0.3, ease: "easeOut", delay: 0.05 }, opacity: { duration: 0.05 } }}
        />
      </svg>
    </motion.button>
  );
}

/** "80 kg × 8 · 8 · 7" (mismas cargas) o "80×8 · 85×6" (cargas distintas). */
function resumenSeries(series: Serie[]) {
  if (!series.length) return "";
  const pesos = new Set(series.map((s) => s.peso));
  const unidad = series[0].unidad_peso;
  if (pesos.size === 1 && series[0].peso !== null) return `${numero(series[0].peso)} ${unidad} × ${series.map((s) => s.repeticiones ?? "—").join(" · ")}`;
  return series.map((s) => `${s.peso !== null ? numero(s.peso) : "—"}×${s.repeticiones ?? "—"}`).join(" · ") + ` ${unidad}`;
}

export function RegistroSesion({
  sesionId,
  completada,
  rpe,
  notas,
  ejercicios,
}: {
  sesionId: string;
  completada: boolean;
  rpe: number | null;
  notas: string | null;
  ejercicios: EjercicioDeSesion[];
}) {
  // Lo que el entrenador cambió y aún puede no estar en las props (se guarda serie a serie).
  const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});
  const [guardando, setGuardando] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const quieto = Boolean(useReducedMotion());

  const valor = (s: Serie): Edicion => ediciones[s.id] ?? { peso: texto(s.peso), repeticiones: texto(s.repeticiones), completada: s.completada };
  // Lo último que quedó guardado de cada serie: al salir de un campo solo se guarda si cambió respecto a eso.
  const guardados = useRef(new Map<string, Edicion>());
  const guardado = (s: Serie) => guardados.current.get(s.id) ?? { peso: texto(s.peso), repeticiones: texto(s.repeticiones), completada: s.completada };

  const guardar = async (s: Serie, cambio: Partial<Edicion>) => {
    const nuevo = { ...valor(s), ...cambio };
    setEdiciones((e) => ({ ...e, [s.id]: nuevo }));
    setGuardando((g) => new Set(g).add(s.id));
    const resultado = await guardarSerie(sesionId, s.id, {
      peso: aNumero(nuevo.peso),
      repeticiones: aNumero(nuevo.repeticiones) === null ? null : Math.round(aNumero(nuevo.repeticiones)!),
      rpe: s.rpe,
      completada: nuevo.completada,
    });
    setGuardando((g) => {
      const copia = new Set(g);
      copia.delete(s.id);
      return copia;
    });
    if (!resultado.error) guardados.current.set(s.id, nuevo);
    setError(resultado.error ?? null);
  };

  /** Marca o desmarca una serie. Marcarla sin anotar nada = hizo lo que pedía el plan. */
  const marcar = (s: Serie, p: EjercicioDeSesion["prescripcion"], hecha: boolean) => {
    const v = valor(s);
    const reps = hecha && v.repeticiones.trim() === "" ? texto(repsObjetivo(p?.repeticiones)) : v.repeticiones;
    const peso = hecha && v.peso.trim() === "" && p?.peso !== null && p?.peso !== undefined ? String(p.peso) : v.peso;
    return guardar(s, { completada: hecha, repeticiones: reps, peso });
  };

  /** Todo el ejercicio de una vez: las series se marcan en cascada, como tachar una lista. */
  const marcarEjercicio = (e: EjercicioDeSesion, hecha: boolean) =>
    e.series
      .filter((s) => valor(s).completada !== hecha)
      .forEach((s, k) => setTimeout(() => void marcar(s, e.prescripcion, hecha), quieto ? 0 : k * 90));

  const total = ejercicios.reduce((t, e) => t + e.series.length, 0);
  const hechas = ejercicios.reduce((t, e) => t + e.series.filter((s) => valor(s).completada).length, 0);

  return (
    <div className="space-y-4">
      <p role="status" aria-live="polite" className="flex items-center justify-between gap-3 text-sm text-tenue">
        <span className="tabular-nums">
          {hechas} de {total} series hechas
        </span>
        <span>{guardando.size ? "Guardando…" : error ? "" : "Todo guardado"}</span>
      </p>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-hueso">
        <motion.div
          className="h-full rounded-full bg-tinta"
          initial={false}
          animate={{ width: `${total ? (hechas / total) * 100 : 0}%` }}
          transition={quieto ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>
      {error && <Aviso>{error}</Aviso>}

      {ejercicios.length === 0 && (
        <p className="rounded-[var(--radius-tarjeta)] border border-dashed border-linea-fuerte/60 px-4 py-6 text-sm text-tenue">
          Esta sesión no tiene ejercicios. Se creó sin día del plan.
        </p>
      )}

      {ejercicios.map((e, i) => {
        const p = e.prescripcion;
        const objetivo = p
          ? [
              `${p.series ?? "—"} × ${p.repeticiones ?? "—"}`,
              p.peso !== null && `${numero(p.peso)} ${p.unidad}`,
              p.rir !== null && `RIR ${numero(p.rir)}`,
              p.descanso !== null && `${p.descanso} s descanso`,
            ]
              .filter(Boolean)
              .join(" · ")
          : null;
        const unidad = e.series[0]?.unidad_peso ?? p?.unidad ?? "kg";
        const ultima = e.series.at(-1);
        const completo = e.series.length > 0 && e.series.every((s) => valor(s).completada);
        return (
          <motion.div key={e.id} {...APARECE} transition={{ ...APARECE.transition, delay: Math.min(i, 8) * 0.05 }}>
          <Tarjeta className="overflow-hidden">
            <section aria-labelledby={`ej-${e.id}`}>
              <div className="border-b border-linea px-4 py-3 sm:px-5">
                <h2 id={`ej-${e.id}`} className="flex items-baseline gap-2 font-semibold">
                  <span className="tabular-nums text-xs text-tenue">{i + 1}</span>
                  {e.nombre}
                  {/* Todas sus series hechas: el ejercicio se tacha de la lista. */}
                  <AnimatePresence>
                    {completo && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="grid size-5 shrink-0 place-items-center self-center rounded-full bg-exito text-superficie"
                      >
                        <Check aria-hidden className="size-3.5" strokeWidth={3} />
                        <span className="sr-only">(todas las series hechas)</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </h2>
                {objetivo && <p className="mt-0.5 tabular-nums text-sm text-grafito">Objetivo: {objetivo}</p>}
                {e.ultimaVez && (
                  <p className="mt-0.5 tabular-nums text-xs text-tenue">
                    Última vez: {resumenSeries(e.ultimaVez.series)}
                  </p>
                )}
              </div>

              <div className="px-2 py-2 sm:px-3">
                <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_3rem] gap-2 px-2 pb-1 text-xs text-tenue" aria-hidden>
                  <span>Serie</span>
                  <span>Peso ({unidad})</span>
                  <span>Reps</span>
                  <span className="text-center">Hecha</span>
                </div>
                <ol>
                  {/* Como una lista de tareas: las series nuevas se abren paso y las quitadas se cierran. */}
                  <AnimatePresence initial={false}>
                  {e.series.map((s) => {
                    const v = valor(s);
                    const id = (campo: string) => `${s.id}-${campo}`;
                    return (
                      <motion.li
                        key={s.id}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={quieto ? { duration: 0 } : { duration: 0.25, ease: SUAVE }}
                        className="overflow-hidden"
                      >
                      <div
                        className={`grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_3rem] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-300 ${
                          v.completada ? "bg-exito/[0.07]" : ""
                        }`}
                      >
                        <span className={`tabular-nums text-sm transition-colors ${v.completada ? "text-exito" : "text-tenue"}`}>{s.numero_serie}</span>
                        <label className="sr-only" htmlFor={id("peso")}>
                          Peso de la serie {s.numero_serie}
                        </label>
                        <input
                          id={id("peso")}
                          inputMode="decimal"
                          autoComplete="off"
                          value={v.peso}
                          placeholder={p?.peso !== null && p?.peso !== undefined ? numero(p.peso) : "—"}
                          onChange={(ev) => setEdiciones((ed) => ({ ...ed, [s.id]: { ...v, peso: ev.target.value } }))}
                          onBlur={(ev) => ev.target.value !== guardado(s).peso && guardar(s, { peso: ev.target.value })}
                          className="h-11 w-full min-w-0 rounded-full border border-linea-fuerte/70 bg-superficie px-3 text-center tabular-nums text-base focus:border-acento focus:ring-[3px] focus:ring-acento/25 focus:outline-none"
                        />
                        <label className="sr-only" htmlFor={id("reps")}>
                          Repeticiones de la serie {s.numero_serie}
                        </label>
                        <input
                          id={id("reps")}
                          inputMode="numeric"
                          autoComplete="off"
                          value={v.repeticiones}
                          placeholder={p?.repeticiones ?? "—"}
                          onChange={(ev) => setEdiciones((ed) => ({ ...ed, [s.id]: { ...v, repeticiones: ev.target.value } }))}
                          onBlur={(ev) => ev.target.value !== guardado(s).repeticiones && guardar(s, { repeticiones: ev.target.value })}
                          className="h-11 w-full min-w-0 rounded-full border border-linea-fuerte/70 bg-superficie px-3 text-center tabular-nums text-base focus:border-acento focus:ring-[3px] focus:ring-acento/25 focus:outline-none"
                        />
                        <MarcaHecha
                          hecha={v.completada}
                          quieto={quieto}
                          aria-label={`Serie ${s.numero_serie} hecha`}
                          onClick={() => void marcar(s, p, !v.completada)}
                        />
                      </div>
                      </motion.li>
                    );
                  })}
                  </AnimatePresence>
                </ol>
                <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
                  {e.series.length > 1 && (
                    <Boton
                      type="button"
                      variante="fantasma"
                      className={`h-8 px-2.5 ${completo ? "text-tenue" : ""}`}
                      onClick={() => marcarEjercicio(e, !completo)}
                    >
                      <CheckCheck aria-hidden className="size-4" /> {completo ? "Desmarcar todas" : "Marcar todas"}
                    </Boton>
                  )}
                  <Boton
                    type="button"
                    variante="fantasma"
                    className="h-8 px-2.5"
                    disabled={pendiente}
                    onClick={() => iniciar(async () => setError((await agregarSerie(sesionId, e.id)).error ?? null))}
                  >
                    <Plus aria-hidden className="size-4" /> Serie
                  </Boton>
                  {ultima && !valor(ultima).completada && (
                    <Boton
                      type="button"
                      variante="fantasma"
                      className="h-8 px-2.5 text-tenue"
                      disabled={pendiente}
                      onClick={() => iniciar(async () => setError((await quitarSerie(ultima.id)).error ?? null))}
                    >
                      <Minus aria-hidden className="size-4" /> Quitar la última
                    </Boton>
                  )}
                </div>
              </div>
            </section>
          </Tarjeta>
          </motion.div>
        );
      })}

      <AnimatePresence mode="wait" initial={false}>
      {completada ? (
        <motion.div key="completada" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <Tarjeta className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <p className="text-sm">
            <span className="font-semibold">Sesión completada.</span>{" "}
            <span className="text-tenue">
              {rpe !== null ? `Esfuerzo ${numero(rpe)}/10. ` : ""}
              {notas ?? ""}
            </span>
          </p>
          <Boton
            type="button"
            variante="secundario"
            disabled={pendiente}
            onClick={() => iniciar(async () => setError((await reabrirSesion(sesionId)).error ?? null))}
          >
            <RotateCcw aria-hidden className="size-4" /> Reabrir
          </Boton>
        </Tarjeta>
        </motion.div>
      ) : (
        <motion.div key="abierta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <Tarjeta className="p-4 sm:p-5">
          <form
            action={async (datos) => {
              const resultado = await terminarSesion(sesionId, datos);
              setError(resultado.error ?? null);
            }}
            className="space-y-4"
          >
            <h2 className="titulo-display text-xl">Terminar la sesión</h2>
            <Selector
              etiqueta="¿Qué tan dura fue? (RPE de la sesión)"
              nombre="rpe_sesion"
              defaultValue=""
              opciones={[
                { valor: "", texto: "Sin anotar" },
                ...Array.from({ length: 10 }, (_, i) => ({ valor: String(i + 1), texto: `${i + 1}${i === 0 ? " · muy suave" : i === 9 ? " · máximo" : ""}` })),
              ]}
            />
            <AreaTexto etiqueta="Notas" nombre="notas" rows={2} placeholder="Opcional: cómo se sintió, molestias, qué ajustar la próxima vez…" />
            <BotonEnvio textoPendiente="Guardando…">
              <Check aria-hidden className="size-4" /> Terminar sesión
            </BotonEnvio>
            {hechas < total && <p className="text-xs text-tenue">Quedan {total - hechas} series sin marcar; se guardan como no hechas.</p>}
          </form>
        </Tarjeta>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
