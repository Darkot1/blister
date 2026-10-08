"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore, useTransition } from "react";
import { Plus } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { AreaTexto, Campo, Selector } from "@/components/ui/campo";
import { Aviso } from "@/components/ui/aviso";
import { Dialogo } from "@/components/ui/dialogo";
import { HORA_FIN_DIA, HORA_INICIO_DIA, etiquetaDia, etiquetaDiaLarga, partesLocales } from "@/lib/calendario";
import { ETIQUETA_TIPO_CITA, hora } from "@/lib/formato";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { DURACIONES_CITA, type EstadoCita } from "@/lib/validaciones/cita";
import { cambiarEstadoCita, crearCita } from "./acciones";
import { ESTADOS_VISIBLES, IconoEstadoCita, InsigniaCita, puntoEstadoCita, tonoEstadoCita } from "./estado-cita";

export type CitaVista = {
  id: string;
  alumnoId: string;
  alumno: string;
  tipo: string;
  estado: string;
  notas: string | null;
  iniciaEn: string;
  terminaEn: string;
};

type Borrador = { fecha?: string; hora?: string; alumnoId?: string };

const PX_HORA = 56;
const HORAS = Array.from({ length: HORA_FIN_DIA - HORA_INICIO_DIA }, (_, i) => HORA_INICIO_DIA + i);
const MIN_INICIO = HORA_INICIO_DIA * 60;
const MIN_FIN = HORA_FIN_DIA * 60;

const ACCIONES: Record<string, { estado: EstadoCita; texto: string; variante?: "primario" | "secundario" | "peligro" }[]> = {
  programada: [
    { estado: "confirmada", texto: "Confirmar", variante: "primario" },
    { estado: "completada", texto: "Marcar completada" },
    { estado: "no_asistio", texto: "No asistió" },
    { estado: "cancelada", texto: "Cancelar cita", variante: "peligro" },
  ],
  confirmada: [
    { estado: "completada", texto: "Marcar completada", variante: "primario" },
    { estado: "no_asistio", texto: "No asistió" },
    { estado: "cancelada", texto: "Cancelar cita", variante: "peligro" },
  ],
  completada: [{ estado: "programada", texto: "Deshacer" }],
  no_asistio: [{ estado: "programada", texto: "Deshacer" }],
};

/** Minuto actual en Bogotá; null en el servidor para no desajustar la hidratación. */
function useAhora() {
  return useSyncExternalStore(
    (avisar) => {
      const id = setInterval(avisar, 30_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

export function CalendarioSemana({
  dias,
  hoy,
  citas,
  alumnos,
  alumnoInicial,
  barra,
}: {
  barra?: React.ReactNode;
  dias: string[];
  hoy: string;
  citas: CitaVista[];
  alumnos: { id: string; nombre: string }[];
  alumnoInicial?: string;
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(alumnoInicial ? { alumnoId: alumnoInicial } : null);
  const [idSeleccionada, setIdSeleccionada] = useState<string | null>(null);
  const seleccionada = citas.find((c) => c.id === idSeleccionada) ?? null;

  const porDia = new Map(dias.map((d) => [d, [] as CitaVista[]]));
  for (const c of citas) porDia.get(partesLocales(c.iniciaEn).fecha)?.push(c);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {barra}
        <Boton onClick={() => setBorrador({ fecha: dias.includes(hoy) ? hoy : dias[0] })}>
          <Plus aria-hidden className="size-4" /> Nueva cita
        </Boton>
      </div>

      <RejillaSemana dias={dias} hoy={hoy} porDia={porDia} alElegirHueco={setBorrador} alElegirCita={setIdSeleccionada} />
      <AgendaMovil dias={dias} hoy={hoy} porDia={porDia} alElegirCita={setIdSeleccionada} />

      <ul aria-label="Leyenda" className="mt-4 flex flex-wrap gap-2 text-sm">
        {ESTADOS_VISIBLES.map((estado) => (
          <li key={estado}><InsigniaCita estado={estado} /></li>
        ))}
      </ul>

      <Dialogo abierto={borrador !== null} alCerrar={() => setBorrador(null)} titulo="Nueva cita">
        {borrador && (
          <FormularioCita
            key={JSON.stringify(borrador)}
            borrador={borrador}
            alumnos={alumnos}
            alGuardar={() => setBorrador(null)}
          />
        )}
      </Dialogo>

      <Dialogo
        abierto={seleccionada !== null}
        alCerrar={() => setIdSeleccionada(null)}
        titulo={seleccionada?.alumno ?? ""}
      >
        {seleccionada && <DetalleCita cita={seleccionada} alTerminar={() => setIdSeleccionada(null)} />}
      </Dialogo>
    </>
  );
}

function RejillaSemana({
  dias,
  hoy,
  porDia,
  alElegirHueco,
  alElegirCita,
}: {
  dias: string[];
  hoy: string;
  porDia: Map<string, CitaVista[]>;
  alElegirHueco: (b: Borrador) => void;
  alElegirCita: (id: string) => void;
}) {
  const minuto = useAhora();
  const ahora = minuto === null ? null : partesLocales(new Date(minuto * 60_000).toISOString());

  return (
    <div className="hidden overflow-x-auto rounded-[var(--radius-tarjeta)] border border-linea bg-superficie md:block">
      <div className="grid min-w-[46rem] grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        {/* Encabezado de días */}
        <div className="border-b border-linea" />
        {dias.map((d) => (
          <div
            key={d}
            className="border-b border-l border-linea px-2 py-2.5 text-center text-sm capitalize"
          >
            <span className={`inline-flex h-7 items-center rounded-full px-2.5 ${
              d === hoy ? "bg-acento font-semibold text-sobre-acento" : "text-tenue"
            }`}>
              {etiquetaDia(d)}
            </span>
          </div>
        ))}

        {/* Horas */}
        <div className="relative" style={{ height: HORAS.length * PX_HORA }}>
          {HORAS.map((h, i) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-[0.7rem] text-tenue" style={{ top: i * PX_HORA }}>
              {i === 0 ? "" : `${h}:00`}
            </span>
          ))}
        </div>

        {dias.map((d) => (
          <div key={d} className={`relative border-l border-linea ${d === hoy ? "bg-acento/[0.08]" : ""}`}>
            {/* Clic en un hueco: crea una cita en esa media hora. El teclado usa el botón "Nueva cita". */}
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="absolute inset-0 cursor-cell"
              onClick={(e) => {
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                const minutos = MIN_INICIO + Math.floor(y / (PX_HORA / 2)) * 30;
                alElegirHueco({ fecha: d, hora: `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}` });
              }}
            />
            {HORAS.slice(1).map((h, i) => (
              <div key={h} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-linea/70"
                style={{ top: (i + 1) * PX_HORA }} />
            ))}

            {ahora && ahora.fecha === d && ahora.minutos >= MIN_INICIO && ahora.minutos < MIN_FIN && (
              <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-peligro"
                style={{ top: ((ahora.minutos - MIN_INICIO) / 60) * PX_HORA }}>
                <span className="absolute -top-[5px] -left-[5px] size-2 rounded-full bg-peligro" />
              </div>
            )}

            {porDia.get(d)?.map((c) => {
              // Una cita fuera del horario visible se pega al borde en lugar de desaparecer.
              const inicio = Math.min(Math.max(partesLocales(c.iniciaEn).minutos, MIN_INICIO), MIN_FIN - 30);
              const finReal = partesLocales(c.terminaEn);
              const fin = finReal.fecha !== d ? MIN_FIN : Math.min(Math.max(finReal.minutos, inicio + 30), MIN_FIN);
              const alto = Math.max(((fin - inicio) / 60) * PX_HORA - 2, 22);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => alElegirCita(c.id)}
                  className={`absolute inset-x-1 z-20 overflow-hidden rounded-md px-2 py-1 text-left text-xs leading-tight transition-[filter] hover:brightness-95 ${tonoEstadoCita(c.estado)}`}
                  style={{ top: ((inicio - MIN_INICIO) / 60) * PX_HORA + 1, height: alto }}
                >
                  <span className="flex items-center gap-1 truncate font-semibold">
                    <IconoEstadoCita estado={c.estado} className="size-3 shrink-0" />
                    <span className="truncate">{c.alumno}</span>
                  </span>
                  {alto > 36 && (
                    <span className="block truncate opacity-80">
                      {hora(c.iniciaEn)} · {ETIQUETA_TIPO_CITA[c.tipo] ?? c.tipo}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaMovil({
  dias,
  hoy,
  porDia,
  alElegirCita,
}: {
  dias: string[];
  hoy: string;
  porDia: Map<string, CitaVista[]>;
  alElegirCita: (id: string) => void;
}) {
  return (
    <ol className="space-y-6 md:hidden">
      {dias.map((d) => {
        const lista = porDia.get(d) ?? [];
        return (
          <li key={d}>
            <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold">
              <span>{etiquetaDiaLarga(d)}</span>
              {d === hoy && <span className="rounded-md bg-acento px-1.5 py-0.5 text-xs font-semibold text-sobre-acento">Hoy</span>}
            </h3>
            {lista.length === 0 ? (
              <p className="px-1 text-sm text-tenue">Sin citas</p>
            ) : (
              <ul className="divide-y divide-linea overflow-hidden rounded-[var(--radius-tarjeta)] border border-linea bg-superficie">
                {lista.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => alElegirCita(c.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-fondo/70">
                      <span aria-hidden className={`h-9 w-1 shrink-0 rounded-full ${puntoEstadoCita(c.estado)}`} />
                      <span className="w-[5.5rem] shrink-0 font-mono text-[0.8rem] whitespace-nowrap">{hora(c.iniciaEn)}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate ${c.estado === "no_asistio" ? "text-tenue line-through" : "font-semibold"}`}>{c.alumno}</span>
                        <span className="block text-sm text-tenue">{ETIQUETA_TIPO_CITA[c.tipo] ?? c.tipo}</span>
                      </span>
                      <IconoEstadoCita estado={c.estado} className="size-[18px] shrink-0 text-tenue" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function FormularioCita({
  borrador,
  alumnos,
  alGuardar,
}: {
  borrador: Borrador;
  alumnos: { id: string; nombre: string }[];
  alGuardar: () => void;
}) {
  const [estado, enviar] = useActionState(async (previo: EstadoFormulario, datos: FormData) => {
    const resultado = await crearCita(previo, datos);
    if (resultado.ok) alGuardar();
    return resultado;
  }, {});
  const v = estado.valores;

  if (!alumnos.length) {
    return (
      <p className="text-tenue">
        Necesitas al menos un alumno activo para agendar.{" "}
        <Link href="/alumnos/nuevo" className="font-medium text-tinta underline underline-offset-2 hover:no-underline">Registrar alumno</Link>
      </p>
    );
  }

  return (
    <form action={enviar} className="space-y-4" noValidate>
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Selector
        etiqueta="Alumno"
        nombre="alumno_id"
        required
        defaultValue={v?.alumno_id ?? borrador.alumnoId ?? ""}
        errores={estado.errores?.alumno_id}
        opciones={[{ valor: "", texto: "Elige un alumno" }, ...alumnos.map((a) => ({ valor: a.id, texto: a.nombre }))]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha" nombre="fecha" type="date" required
          defaultValue={v?.fecha ?? borrador.fecha} errores={estado.errores?.fecha} />
        <Campo etiqueta="Hora" nombre="hora" type="time" step={900} required
          defaultValue={v?.hora ?? borrador.hora ?? "07:00"} errores={estado.errores?.hora} />
        <Selector etiqueta="Duración" nombre="duracion" defaultValue={v?.duracion ?? "60"}
          opciones={DURACIONES_CITA.map((m) => ({ valor: String(m), texto: m < 60 || m % 60 ? `${m} min` : `${m / 60} h` }))} />
        <Selector etiqueta="Tipo" nombre="tipo" defaultValue={v?.tipo ?? "entrenamiento"}
          opciones={Object.entries(ETIQUETA_TIPO_CITA).map(([valor, texto]) => ({ valor, texto }))} />
      </div>
      <AreaTexto etiqueta="Notas" nombre="notas" rows={2} placeholder="Opcional: lugar, enfoque de la sesión…"
        defaultValue={v?.notas} />
      <div className="flex gap-3 pt-1">
        <BotonEnvio textoPendiente="Guardando…">Agendar</BotonEnvio>
        <Boton type="button" variante="fantasma" onClick={alGuardar}>Cancelar</Boton>
      </div>
    </form>
  );
}

function DetalleCita({ cita, alTerminar }: { cita: CitaVista; alTerminar: () => void }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fecha = partesLocales(cita.iniciaEn).fecha;

  return (
    <div className="space-y-5">
      {error && <Aviso>{error}</Aviso>}
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 rounded-lg border border-linea bg-fondo/60 p-4 text-sm">
        <dt className="text-tenue">Cuándo</dt>
        <dd>
          {etiquetaDiaLarga(fecha)}
          <span className="ml-2 font-mono text-[0.8rem]">{hora(cita.iniciaEn)} – {hora(cita.terminaEn)}</span>
        </dd>
        <dt className="text-tenue">Tipo</dt>
        <dd>{ETIQUETA_TIPO_CITA[cita.tipo] ?? cita.tipo}</dd>
        <dt className="text-tenue">Estado</dt>
        <dd><InsigniaCita estado={cita.estado} /></dd>
        {cita.notas && (
          <>
            <dt className="text-tenue">Notas</dt>
            <dd className="whitespace-pre-line">{cita.notas}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-linea pt-5">
        {(ACCIONES[cita.estado] ?? []).map((a) => (
          <Boton
            key={a.estado}
            variante={a.variante ?? "secundario"}
            disabled={pendiente}
            onClick={() => {
              if (a.estado === "cancelada" && !window.confirm("¿Cancelar esta cita? El horario quedará libre.")) return;
              setError(null);
              iniciar(async () => {
                const resultado = await cambiarEstadoCita(cita.id, a.estado);
                // Si falla, el diálogo sigue abierto con el error: el entrenador no debe creer que se guardó.
                if (resultado.error) setError(resultado.error);
                else alTerminar();
              });
            }}
          >
            {a.texto}
          </Boton>
        ))}
        <Link href={`/alumnos/${cita.alumnoId}`} className="ml-auto self-center text-sm font-medium text-tinta underline underline-offset-2 hover:no-underline">
          Ver alumno
        </Link>
      </div>
    </div>
  );
}
