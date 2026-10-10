import Link from "next/link";
import { ListChecks } from "lucide-react";
import { etiquetaDia, partesLocales } from "@/lib/calendario";
import type { CitaVista } from "./semana";

/**
 * Qué rutina entrena cada alumno esta semana: días del plan agendados y quién no tiene plan.
 * Solo cuenta citas de entrenamiento que siguen en pie.
 */
export function RutinasSemana({ citas, dias }: { citas: CitaVista[]; dias: string[] }) {
  const entrenos = citas.filter((c) => c.tipo === "entrenamiento" && c.estado !== "no_asistio");
  if (!entrenos.length) return null;

  const porAlumno = Map.groupBy(entrenos, (c) => c.alumnoId);
  const filas = [...porAlumno.values()]
    .map((lista) => ({ alumnoId: lista[0].alumnoId, alumno: lista[0].alumno, plan: lista[0].plan, citas: lista }))
    .sort((a, b) => Number(Boolean(a.plan)) - Number(Boolean(b.plan)) || a.alumno.localeCompare(b.alumno, "es"));
  const sinPlan = filas.filter((f) => !f.plan).length;

  return (
    <details open={sinPlan > 0} className="group mb-4 rounded-[var(--radius-tarjeta)] border border-linea bg-superficie">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <ListChecks aria-hidden className="size-4 shrink-0 text-tenue" />
        <span className="etiqueta">Rutinas de la semana</span>
        <span className="text-sm text-tenue">
          {filas.length} {filas.length === 1 ? "alumno entrena" : "alumnos entrenan"}
          {sinPlan > 0 && (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1.5 font-medium text-tinta">
                <span aria-hidden className="size-1.5 rounded-full bg-aviso" />
                {sinPlan} sin plan
              </span>
            </>
          )}
        </span>
        <span aria-hidden className="ml-auto text-xs text-tenue group-open:hidden">Ver</span>
        <span aria-hidden className="ml-auto hidden text-xs text-tenue group-open:inline">Ocultar</span>
      </summary>
      <ul className="divide-y divide-linea border-t border-linea">
        {filas.map((f) => {
          const conDia = f.citas.filter((c) => c.rutina).length;
          return (
            <li key={f.alumnoId} className="grid gap-x-4 gap-y-1.5 px-4 py-2.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center">
              <div className="min-w-0">
                <Link href={`/alumnos/${f.alumnoId}`} className="block truncate text-sm font-medium hover:underline">
                  {f.alumno}
                </Link>
                {f.plan ? (
                  <Link href={`/entrenamiento/planes/${f.plan.id}`} className="block truncate text-xs text-tenue hover:text-tinta">
                    {f.plan.nombre} · {conDia} de {f.plan.dias.length} {f.plan.dias.length === 1 ? "día" : "días"} agendados
                  </Link>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs">
                    <span aria-hidden className="size-1.5 rounded-full bg-aviso" />
                    Sin plan activo ·{" "}
                    <Link href="/entrenamiento" className="font-medium underline underline-offset-2 hover:no-underline">
                      Asignar rutina
                    </Link>
                  </p>
                )}
              </div>
              <ul aria-label={`Sesiones de ${f.alumno}`} className="flex flex-wrap gap-1.5">
                {f.citas.map((c) => {
                  const fecha = partesLocales(c.iniciaEn).fecha;
                  return (
                    <li
                      key={c.id}
                      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs ${
                        c.rutina ? "border-linea bg-fondo/60" : "border-dashed border-linea text-tenue"
                      }`}
                    >
                      <span className="font-mono capitalize">{dias.includes(fecha) ? etiquetaDia(fecha) : fecha}</span>
                      <span className={c.rutina ? "font-medium" : ""}>{c.rutina?.dia ?? (f.plan ? "Día sin elegir" : "Sin rutina")}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
