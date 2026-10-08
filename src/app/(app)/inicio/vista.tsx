import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarPlus, Dumbbell, UserPlus, Users } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { BarrasSemana } from "@/components/datos/barras-semana";
import { Avatar } from "@/components/ui/avatar";
import { CabeceraTarjeta, EnlaceTarjeta, Lista, Tarjeta } from "@/components/ui/tarjeta";
import { etiquetaDiaLarga } from "@/lib/calendario";
import { ETIQUETA_TIPO_CITA, fechaSinAnio, hora } from "@/lib/formato";
import { FilaCita, type CitaResumen } from "../calendario/fila-cita";

/** El panel de inicio como rejilla bento; solo presenta, los datos llegan de page.tsx. */
export function VistaPanel({
  hoy,
  titulo,
  deHoy,
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
  deHoy: CitaResumen[];
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

          {deHoy.length ? (
            <ol className="mt-5 flex-1 divide-y divide-white/10 border-t border-white/10">
              {deHoy.slice(0, 6).map((c) => {
                const esSiguiente = c.id === siguienteId;
                return (
                  <li key={c.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5">
                    <span className={`font-mono text-[0.8rem] whitespace-nowrap ${esSiguiente ? "text-acento" : "text-white/55"}`}>{hora(c.inicia_en)}</span>
                    <span className="min-w-0">
                      <span className={`block truncate text-sm ${c.estado === "no_asistio" ? "text-white/45 line-through" : "font-medium"}`}>
                        {nombre.get(c.alumno_id) ?? "Alumno"}
                      </span>
                      <span className="block truncate text-xs text-white/50">{ETIQUETA_TIPO_CITA[c.tipo] ?? c.tipo}</span>
                    </span>
                    {esSiguiente && <span className="rounded-md bg-acento px-2 py-0.5 text-xs font-semibold text-sobre-acento">Siguiente</span>}
                  </li>
                );
              })}
              {deHoy.length > 6 && <li className="px-5 py-2.5 text-sm text-white/50">y {deHoy.length - 6} más</li>}
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
