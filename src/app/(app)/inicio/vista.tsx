import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarPlus, Dumbbell, UserPlus, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { BarrasSemana } from "@/components/datos/barras-semana";
import { Avatar } from "@/components/ui/avatar";
import { CabeceraTarjeta, EnlaceTarjeta, Lista, Tarjeta } from "@/components/ui/tarjeta";
import { etiquetaDiaLarga } from "@/lib/calendario";
import { ETIQUETA_TIPO_CITA, fechaSinAnio, hora } from "@/lib/formato";
import type { DiaDeSesion } from "@/lib/entrenamiento/planes";
import { FilaCita, type CitaResumen } from "../calendario/fila-cita";

export type CitaHoy = CitaResumen & {
  termina_en: string;
  /** Minutos desde medianoche (hora de Bogotá) de inicio y fin. */
  minutos: number;
  fin: number;
  rutina: DiaDeSesion | null;
  /** Nombre del plan activo del alumno, si tiene. */
  plan: string | null;
};

type Momento = "hecha" | "no_asistio" | "sin_marcar" | "en_curso" | "siguiente" | "despues";

/** Dónde está cada cita respecto a la hora actual, combinando reloj y estado. */
function momentoDe(c: CitaHoy, ahora: number, siguienteId?: string): Momento {
  if (c.estado === "completada") return "hecha";
  if (c.estado === "no_asistio") return "no_asistio";
  if (c.fin <= ahora) return "sin_marcar";
  if (c.minutos <= ahora) return "en_curso";
  return c.id === siguienteId ? "siguiente" : "despues";
}

const ETIQUETA_MOMENTO: Partial<Record<Momento, string>> = {
  hecha: "Hecha",
  no_asistio: "No asistió",
  sin_marcar: "Sin marcar",
  en_curso: "En curso",
  siguiente: "Siguiente",
};

/** Marca de la línea de tiempo: lleno = pasó, anillo = por venir, naranja = ahora. */
function MarcaMomento({ momento }: { momento: Momento }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="relative z-10 size-4 overflow-visible">
      {momento === "hecha" && (
        <>
          <circle cx="8" cy="8" r="7" className="fill-white/80" />
          <path d="M4.8 8.2 7 10.3l4.2-4.5" className="fill-none stroke-panel [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8]" />
        </>
      )}
      {momento === "no_asistio" && (
        <>
          <circle cx="8" cy="8" r="7" className="fill-white/25" />
          <path d="m5.5 5.5 5 5m0-5-5 5" className="stroke-panel [stroke-linecap:round] [stroke-width:1.8]" />
        </>
      )}
      {momento === "sin_marcar" && <circle cx="8" cy="8" r="6" className="fill-panel stroke-white/50 [stroke-dasharray:2.5_2] [stroke-width:1.5]" />}
      {momento === "en_curso" && (
        <>
          <circle cx="8" cy="8" r="7.5" className="origin-center animate-ping fill-acento/40" />
          <circle cx="8" cy="8" r="5" className="fill-acento" />
        </>
      )}
      {(momento === "siguiente" || momento === "despues") && (
        <circle cx="8" cy="8" r="5.5" className={`fill-panel [stroke-width:2] ${momento === "siguiente" ? "stroke-acento" : "stroke-white/40"}`} />
      )}
    </svg>
  );
}

/** El panel de inicio como rejilla bento; solo presenta, los datos llegan de page.tsx. */
export function VistaPanel({
  hoy,
  titulo,
  deHoy,
  ahora,
  siguienteId,
  nombre,
  semana,
  proximas,
  recientes,
  activos,
  inactivos,
  porAtender,
}: {
  hoy: string;
  titulo: string;
  deHoy: CitaHoy[];
  /** Minuto actual del día (Bogotá). */
  ahora: number;
  siguienteId?: string;
  nombre: Map<string, string>;
  semana: { fecha: string; etiqueta: string; valor: number }[];
  proximas: CitaResumen[];
  recientes: { id: string; nombres: string; apellidos: string; creado_en: string }[];
  activos: number;
  inactivos: number;
  porAtender: number;
}) {
  const totalSemana = semana.reduce((s, d) => s + d.valor, 0);
  const momentos = deHoy.map((c) => momentoDe(c, ahora, siguienteId));
  const pasadas = momentos.filter((m) => m === "hecha" || m === "no_asistio" || m === "sin_marcar").length;
  const sinMarcar = momentos.filter((m) => m === "sin_marcar").length;
  return (
    <>
      <Encabezado miga={etiquetaDiaLarga(hoy)} titulo={titulo} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Hoy: la celda protagonista, oscura. */}
        <section
          aria-labelledby="titulo-hoy"
          className="col-span-2 flex flex-col overflow-hidden rounded-[var(--radius-tarjeta)] bg-panel text-white lg:row-span-2"
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h2 id="titulo-hoy" className="etiqueta text-white/50">Agenda de hoy</h2>
              <p className="cifra mt-2 text-6xl leading-none font-semibold">
                {deHoy.length}
                <span className="ml-2 text-base font-normal tracking-normal text-white/50">{deHoy.length === 1 ? "cita" : "citas"}</span>
              </p>
            </div>
            <CalendarClock aria-hidden className="size-5 text-acento" />
          </div>

          {deHoy.length > 0 && (
            <p className="mt-2 px-5 text-xs text-white/55">
              {pasadas} de {deHoy.length} ya {pasadas === 1 ? "pasó" : "pasaron"}
              {sinMarcar > 0 && (
                <>
                  {" · "}
                  <Link href="/calendario" className="font-medium text-white underline underline-offset-2 hover:no-underline">
                    {sinMarcar} sin marcar
                  </Link>
                </>
              )}
            </p>
          )}

          {deHoy.length ? (
            <ol className="relative mt-4 flex-1 border-t border-white/10 py-1">
              {/* Línea de tiempo vertical que une las marcas. */}
              <span aria-hidden className="absolute top-0 bottom-0 left-[calc(1.25rem+0.75rem-0.5px)] w-px bg-white/15" />
              {deHoy.slice(0, 7).map((c, i) => {
                const momento = momentos[i];
                const paso = momento === "hecha" || momento === "no_asistio" || momento === "sin_marcar";
                const etiqueta = ETIQUETA_MOMENTO[momento];
                const que = c.rutina
                  ? `${c.rutina.dia} · ${c.rutina.plan}`
                  : c.tipo === "entrenamiento"
                    ? c.plan
                      ? `Entrenamiento · ${c.plan} (día sin elegir)`
                      : "Entrenamiento · sin plan asignado"
                    : (ETIQUETA_TIPO_CITA[c.tipo] ?? c.tipo);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/alumnos/${c.alumno_id}`}
                      className={`grid grid-cols-[1.5rem_5rem_minmax(0,1fr)_auto] items-center gap-x-3 px-5 py-2 hover:bg-white/[0.04] ${
                        momento === "en_curso" ? "bg-acento/[0.08]" : ""
                      }`}
                    >
                      <span className="grid place-items-center">
                        <MarcaMomento momento={momento} />
                      </span>
                      <span
                        className={`font-mono text-[0.78rem] leading-tight whitespace-nowrap ${
                          paso ? "text-white/40" : momento === "en_curso" || momento === "siguiente" ? "text-acento" : "text-white/70"
                        }`}
                      >
                        {hora(c.inicia_en)}
                        <span className="block text-[0.7rem] text-white/35">{hora(c.termina_en)}</span>
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm ${
                            momento === "no_asistio" ? "text-white/45 line-through" : paso ? "text-white/60" : "font-medium"
                          }`}
                        >
                          {nombre.get(c.alumno_id) ?? "Alumno"}
                        </span>
                        <span className={`block truncate text-xs ${paso ? "text-white/35" : "text-white/60"}`}>
                          {c.rutina && <Dumbbell aria-hidden className="mr-1 inline size-3 -translate-y-px" />}
                          {que}
                        </span>
                      </span>
                      {etiqueta ? (
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                            momento === "en_curso"
                              ? "bg-acento text-sobre-acento"
                              : momento === "siguiente"
                                ? "border border-acento/60 text-acento"
                                : momento === "sin_marcar"
                                  ? "border border-dashed border-white/40 text-white/80"
                                  : "text-white/45"
                          }`}
                        >
                          {etiqueta}
                        </span>
                      ) : (
                        <span />
                      )}
                    </Link>
                  </li>
                );
              })}
              {deHoy.length > 7 && <li className="py-2.5 pr-5 pl-[3.75rem] text-sm text-white/50">y {deHoy.length - 7} más</li>}
            </ol>
          ) : (
            <p className="mt-5 flex-1 border-t border-white/10 px-5 py-6 text-sm text-white/60">
              Sin citas para hoy. Buen momento para revisar planes o agendar la semana.
            </p>
          )}

          <Link href="/calendario" className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-sm font-medium hover:bg-white/[0.04]">
            Abrir calendario
            <ArrowRight aria-hidden className="size-4 text-acento" />
          </Link>
        </section>

        <Indicador
          href="/alumnos"
          etiqueta="Alumnos"
          valor={activos}
          icono={<Users className="size-4" />}
          detalle={`${activos === 1 ? "activo" : "activos"} · ${inactivos ? `${inactivos} en pausa` : "ninguno en pausa"}`}
        />
        <Indicador
          href="/calendario"
          etiqueta="Citas"
          valor={porAtender}
          icono={<CalendarClock className="size-4" />}
          detalle="por atender en 8 días"
        />

        <Tarjeta className="col-span-2 flex flex-col">
          <section aria-labelledby="titulo-semana" className="flex flex-1 flex-col">
            <CabeceraTarjeta
              id="titulo-semana"
              titulo="Citas esta semana"
              accion={<span className="font-mono text-xs text-tenue">{totalSemana} en total</span>}
            />
            <div className="h-40 flex-1 px-4 pt-3 pb-3">
              <BarrasSemana datos={semana} hoy={hoy} />
            </div>
          </section>
        </Tarjeta>

        <Tarjeta className="col-span-2 overflow-hidden">
          <section aria-labelledby="titulo-proximos">
            <CabeceraTarjeta id="titulo-proximos" titulo="Próximos días" accion={<EnlaceTarjeta href="/calendario">Semana</EnlaceTarjeta>} />
            {proximas.length ? (
              <Lista ordenada>
                {proximas.slice(0, 5).map((c) => <FilaCita key={c.id} cita={c} alumno={nombre.get(c.alumno_id)} conFecha />)}
              </Lista>
            ) : (
              <p className="px-4 py-6 text-sm text-tenue">Nada agendado en la próxima semana.</p>
            )}
          </section>
        </Tarjeta>

        <Tarjeta className="col-span-2 overflow-hidden sm:col-span-1">
          <section aria-labelledby="titulo-recientes">
            <CabeceraTarjeta id="titulo-recientes" titulo="Nuevos alumnos" accion={<EnlaceTarjeta href="/alumnos">Todos</EnlaceTarjeta>} />
            {recientes.length ? (
              <Lista>
                {recientes.map((a) => (
                  <li key={a.id}>
                    <Link href={`/alumnos/${a.id}`} className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-fondo/70">
                      <Avatar id={a.id} nombres={a.nombres} apellidos={a.apellidos} tamano="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.nombres} {a.apellidos}</span>
                      <span className="shrink-0 font-mono text-[0.7rem] text-tenue">{fechaSinAnio(a.creado_en)}</span>
                    </Link>
                  </li>
                ))}
              </Lista>
            ) : (
              <p className="px-4 py-6 text-sm text-tenue">Cuando registres alumnos aparecerán aquí.</p>
            )}
          </section>
        </Tarjeta>

        {/* Accesos rápidos: la única celda en naranja. */}
        <nav aria-labelledby="titulo-accesos" className="col-span-2 flex flex-col justify-between gap-4 rounded-[var(--radius-tarjeta)] bg-acento p-2 sm:col-span-1">
          <div className="px-2.5 pt-2.5">
            <h2 id="titulo-accesos" className="etiqueta text-sobre-acento/70">Accesos rápidos</h2>
            <p className="mt-2 hidden text-xl leading-tight font-semibold tracking-tight text-sobre-acento sm:block">¿Qué hacemos ahora?</p>
          </div>
          <div>
          {[
            { href: "/alumnos/nuevo", texto: "Nuevo alumno", icono: UserPlus },
            { href: "/calendario", texto: "Agendar cita", icono: CalendarPlus },
            { href: "/ejercicios", texto: "Buscar ejercicio", icono: Dumbbell },
          ].map(({ href, texto, icono: Icono }) => (
            <Link
              key={texto}
              href={href}
              className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold text-sobre-acento hover:bg-black/[0.07]"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-panel text-acento">
                <Icono aria-hidden className="size-4" />
              </span>
              <span className="flex-1">{texto}</span>
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
          </div>
        </nav>
      </div>
    </>
  );
}

function Indicador({
  href,
  etiqueta,
  valor,
  icono,
  detalle,
}: {
  href: string;
  etiqueta: string;
  valor: number;
  icono: React.ReactNode;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-4 transition-colors hover:border-tinta/25"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="etiqueta">{etiqueta}</span>
        <span aria-hidden className="grid size-7 place-items-center rounded-md border border-linea text-tenue group-hover:text-tinta">{icono}</span>
      </span>
      <span className="cifra mt-auto pt-6 text-5xl leading-none font-semibold">{valor}</span>
      <span className="mt-2 text-xs text-tenue">{detalle}</span>
    </Link>
  );
}
