import Link from "next/link";
import { Tarjeta } from "@/components/ui/tarjeta";
import type { DiaArbol } from "@/lib/entrenamiento/cargar";
import { esPorRondas, letraBloque, minutosEstimados, seriesDe } from "@/lib/entrenamiento/prescripcion";
import { fechaSinAnio, hora, numero } from "@/lib/formato";

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
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-hueso px-2.5 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${PUNTO_PLAN[estado] ?? PUNTO_PLAN.archivado}`} />
      {ETIQUETA_ESTADO_PLAN[estado] ?? estado}
    </span>
  );
}

/** Lo secundario de una prescripción, solo lo que está escrito: "60 kg · 90 s · RIR 2". */
function detallesPrescripcion(e: DiaArbol["bloques"][number]["ejercicios"][number], porRondas: boolean) {
  return [
    e.peso !== null && `${numero(e.peso)} ${e.unidad_peso}`,
    !porRondas && e.descanso_segundos !== null && `${e.descanso_segundos} s descanso`,
    e.rir !== null && `RIR ${numero(e.rir)}`,
    e.rpe !== null && `RPE ${numero(e.rpe)}`,
    e.tempo && `Tempo ${e.tempo}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Un día del plan, como hoja de entrenamiento: cada ejercicio en una línea con lo que importa
 * ("3 × 8-12") y debajo solo los detalles que existen. Sin columnas vacías.
 */
export function HojaDia({ dia, nombreDe }: { dia: DiaArbol; nombreDe: Map<string, string> }) {
  if (dia.bloques.length === 0 || dia.bloques.every((b) => b.ejercicios.length === 0)) {
    return <p className="rounded-[var(--radius-tarjeta)] border border-dashed border-linea-fuerte/60 px-4 py-6 text-sm text-tenue">Día sin ejercicios.</p>;
  }
  return (
    <Tarjeta className="overflow-hidden">
      {dia.bloques.map((bloque, b) => {
        const porRondas = esPorRondas(bloque.tipo);
        return (
          <section key={bloque.id} aria-label={`Bloque ${letraBloque(b)}: ${bloque.nombre}`} className="border-t border-linea first:border-t-0">
            <p className="flex flex-wrap items-baseline gap-x-2 px-4 pt-3.5 pb-1 sm:px-5">
              <span className="text-sm font-semibold text-grafito">
                {letraBloque(b)} · {bloque.nombre}
              </span>
              {porRondas && (
                <span className="text-xs text-tenue">
                  {bloque.rondas ?? 1} {bloque.rondas === 1 ? "ronda" : "rondas"} seguidas
                  {bloque.descanso_segundos ? `, ${bloque.descanso_segundos} s al final` : ""}
                </span>
              )}
            </p>
            <ol className={porRondas ? "ml-4 border-l-2 border-tinta/15 sm:ml-5" : ""}>
              {bloque.ejercicios.map((e, i) => {
                const detalles = detallesPrescripcion(e, porRondas);
                return (
                  <li
                    key={e.id}
                    className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-2 py-2 pr-4 sm:pr-5 ${porRondas ? "pl-3" : "pl-4 sm:pl-5"}`}
                  >
                    <span className="tabular-nums text-xs text-tenue">
                      {letraBloque(b)}
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] leading-snug">{nombreDe.get(e.ejercicio_id) ?? "Ejercicio no disponible"}</p>
                      {detalles && <p className="mt-0.5 tabular-nums text-xs text-tenue">{detalles}</p>}
                      {e.notas && <p className="mt-0.5 text-xs text-grafito italic">{e.notas}</p>}
                    </div>
                    <p className="tabular-nums text-[0.9375rem] font-semibold whitespace-nowrap">
                      {porRondas ? "" : `${seriesDe(bloque, e)} × `}
                      {e.repeticiones ?? "—"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <div className="h-2" />
    </Tarjeta>
  );
}

/** Ejercicios y minutos estimados de un día. */
export function resumenDia(dia: DiaArbol) {
  const ejercicios = dia.bloques.reduce((t, b) => t + b.ejercicios.length, 0);
  return { ejercicios, minutos: ejercicios ? minutosEstimados(dia.bloques) : 0 };
}

/** Por dónde va el alumno en el plan: qué día le toca, su próxima cita y cuántas sesiones lleva. */
export function PorDondeVa({
  enCurso,
  siguiente,
  posicion,
  ultimo,
  proxima,
  completadas,
  ultimaCompletada,
}: {
  /** Plan activo: se muestra el día que le toca; si no, el último que entrenó. */
  enCurso: boolean;
  siguiente: string | null;
  /** "Día 2 de 4". */
  posicion: string;
  /** Nombre del día de la última sesión agendada o hecha. */
  ultimo: string | null;
  proxima: { inicia_en: string; dia: string | null } | null;
  completadas: number;
  ultimaCompletada: string | null;
}) {
  const claseCifra = "mt-3 text-[1.75rem] leading-[1.15]";
  return (
    <section aria-label="Por dónde va" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="col-span-2 flex flex-col rounded-[var(--radius-tarjeta)] bg-panel p-5 text-white sm:col-span-1">
        <p className="etiqueta text-white/55">{enCurso ? "Le toca" : "Último día entrenado"}</p>
        <p className={`titulo-display ${claseCifra}`}>{(enCurso ? siguiente : ultimo) ?? "Ninguno"}</p>
        {enCurso && (
          <p className="mt-auto pt-3 text-xs text-white/60">
            {posicion}
            {ultimo ? ` · después de ${ultimo}` : " · para empezar"}
          </p>
        )}
      </div>

      <div className="flex flex-col rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-5">
        <p className="etiqueta">Próxima cita</p>
        {proxima ? (
          <>
            <p className={`cifra-display ${claseCifra}`}>{fechaSinAnio(proxima.inicia_en)}</p>
            <p className="mt-auto pt-3 text-xs text-tenue">
              {hora(proxima.inicia_en)}
              {proxima.dia ? ` · ${proxima.dia}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className={`titulo-display ${claseCifra} text-tenue`}>Sin agendar</p>
            <Link href="/calendario" className="mt-auto pt-3 text-xs font-medium text-grafito underline underline-offset-2 hover:text-tinta">
              Agendar en el calendario
            </Link>
          </>
        )}
      </div>

      <div className="flex flex-col rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-5">
        <p className="etiqueta">Sesiones hechas</p>
        <p className={`cifra-display ${claseCifra}`}>{completadas}</p>
        <p className="mt-auto pt-3 text-xs text-tenue">{ultimaCompletada ? `Última: ${fechaSinAnio(ultimaCompletada)}` : "Aún ninguna"}</p>
      </div>
    </section>
  );
}
