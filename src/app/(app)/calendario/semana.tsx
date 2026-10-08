"use client";

import { useActionState, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, UserPlus } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { Boton, EnlaceBoton } from "@/components/ui/boton";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { AreaTexto, Campo, Selector } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { Grupo, Pila } from "@/components/ui/disposicion";
import { Enlace } from "@/components/ui/enlace";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { Insignia } from "@/components/ui/insignia";
import { ListaFilas } from "@/components/ui/lista-filas";
import { ListaDatos } from "@/components/ui/lista-datos";
import { Texto } from "@/components/ui/texto";
import { cx } from "@/lib/clases";
import { HORA_FIN_DIA, HORA_INICIO_DIA, etiquetaDia, etiquetaDiaLarga, partesLocales } from "@/lib/calendario";
import { ETIQUETA_TIPO_CITA, hora } from "@/lib/formato";
import type { EstadoFormulario } from "@/lib/validaciones/alumno";
import { DURACIONES_CITA, type EstadoCita } from "@/lib/validaciones/cita";
import { cambiarEstadoCita, crearCita } from "./acciones";
import { ESTADOS_VISIBLES, IconoEstadoCita, InsigniaCita } from "./estado-cita";
import { FilaCita } from "./fila-cita";
import css from "./semana.module.css";

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

/** Enlaces y rótulo de la semana visible (los calcula el servidor). */
export type NavegacionSemana = {
  rango: string;
  anterior: string;
  siguiente: string;
  /** La semana visible contiene hoy. */
  enCurso: boolean;
};

type Borrador = { fecha?: string; hora?: string; alumnoId?: string };

const HORAS = Array.from({ length: HORA_FIN_DIA - HORA_INICIO_DIA }, (_, i) => HORA_INICIO_DIA + i);
const MIN_INICIO = HORA_INICIO_DIA * 60;
const MIN_FIN = HORA_FIN_DIA * 60;
/** Huecos de media hora en los que se puede hacer clic para agendar. */
const HUECOS = Array.from({ length: HORAS.length * 2 }, (_, i) => MIN_INICIO + i * 30);

const CLASE_BLOQUE: Record<string, string> = {
  programada: css.programada,
  confirmada: css.confirmada,
  completada: css.completada,
  no_asistio: css.noAsistio,
};

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
const aHora = (minutos: number) => `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;
/** "7:30" para mostrar (sin cero inicial), a partir de minutos del día. */
const horaCorta = (minutos: number) => `${Math.floor(minutos / 60)}:${pad(minutos % 60)}`;
const tipoDe = (c: CitaVista) => ETIQUETA_TIPO_CITA[c.tipo] ?? c.tipo;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
/** Posición vertical en horas desde el inicio del día visible (la rejilla la multiplica por el alto de una hora). */
const posicion = (inicio: number, duracion?: number) =>
  ({ "--inicio": (inicio - MIN_INICIO) / 60, ...(duracion !== undefined && { "--duracion": duracion / 60 }) }) as CSSProperties;

export function CalendarioSemana({
  navegacion,
  dias,
  hoy,
  citas,
  alumnos,
  alumnoInicial,
}: {
  navegacion: NavegacionSemana;
  dias: string[];
  hoy: string;
  citas: CitaVista[];
  alumnos: { id: string; nombre: string }[];
  alumnoInicial?: string;
}) {
  const [borrador, setBorrador] = useState<Borrador | null>(() =>
    alumnoInicial ? { alumnoId: alumnoInicial, fecha: dias.includes(hoy) ? hoy : dias[0] } : null,
  );
  const [idSeleccionada, setIdSeleccionada] = useState<string | null>(null);
  const seleccionada = citas.find((c) => c.id === idSeleccionada) ?? null;

  const porDia = new Map(dias.map((d) => [d, [] as CitaVista[]]));
  for (const c of citas) porDia.get(partesLocales(c.iniciaEn).fecha)?.push(c);

  const pendientes = citas.filter((c) => c.estado === "programada" || c.estado === "confirmada").length;
  const resumen =
    citas.length === 0
      ? "Semana libre"
      : `${plural(citas.length, "cita", "citas")}${pendientes ? ` · ${pendientes} por atender` : ""}`;

  return (
    <Pila espacio={5}>
      <div className={css.barra}>
        <nav aria-label="Semanas" className={css.navegacion}>
          <EnlaceBoton href={navegacion.anterior} variante="secundario" soloIcono aria-label="Semana anterior">
            <ChevronLeft aria-hidden />
          </EnlaceBoton>
          <EnlaceBoton
            href="/calendario"
            variante={navegacion.enCurso ? "fantasma" : "secundario"}
            aria-current={navegacion.enCurso ? "date" : undefined}
          >
            Hoy
          </EnlaceBoton>
          <EnlaceBoton href={navegacion.siguiente} variante="secundario" soloIcono aria-label="Semana siguiente">
            <ChevronRight aria-hidden />
          </EnlaceBoton>
        </nav>
        <div className={css.semana}>
          <h2 className={css.rango}>{navegacion.rango}</h2>
          <Texto tamano="sm" tono="tenue" role="status">
            {resumen}
          </Texto>
        </div>
        <Boton className={css.nueva} onClick={() => setBorrador({ fecha: dias.includes(hoy) ? hoy : dias[0] })}>
          <Plus aria-hidden /> Nueva cita
        </Boton>
      </div>

      <RejillaSemana dias={dias} hoy={hoy} porDia={porDia} alElegirHueco={setBorrador} alElegirCita={setIdSeleccionada} />
      <AgendaDias dias={dias} hoy={hoy} porDia={porDia} alAgendar={setBorrador} alElegirCita={setIdSeleccionada} />

      <ul aria-label="Estados de las citas" className={css.leyenda}>
        {ESTADOS_VISIBLES.map((estado) => (
          <li key={estado} className={css.itemLeyenda}>
            <span aria-hidden className={cx(css.muestra, CLASE_BLOQUE[estado])}>
              <IconoEstadoCita estado={estado} className={css.iconoBloque} />
            </span>
            {ETIQUETA_ESTADO_CITA[estado]}
          </li>
        ))}
        <li className={cx(css.itemLeyenda, css.pista)}>Haz clic en un hueco libre para agendar a esa hora.</li>
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

      <Dialogo abierto={seleccionada !== null} alCerrar={() => setIdSeleccionada(null)} titulo={seleccionada?.alumno ?? ""}>
        {seleccionada && <DetalleCita cita={seleccionada} alTerminar={() => setIdSeleccionada(null)} />}
      </Dialogo>
    </Pila>
  );
}

/** Vista de escritorio (≥ 1024 px): siete columnas con las horas de 6:00 a 22:00. */
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
    <div className={css.rejilla} style={{ "--horas": HORAS.length } as CSSProperties}>
      <div className={css.cabecera}>
        <span aria-hidden />
        {dias.map((d) => {
          const [nombre, numero] = etiquetaDia(d).split(" ");
          const total = porDia.get(d)?.length ?? 0;
          return (
            <div key={d} className={cx(css.dia, d === hoy && css.hoy)} aria-current={d === hoy ? "date" : undefined}>
              <span className={css.nombreDia}>{nombre}</span>
              <span className={css.numeroDia}>{numero}</span>
              <span className={css.totalDia}>{total ? plural(total, "cita", "citas") : "Libre"}</span>
            </div>
          );
        })}
      </div>

      <div className={css.cuerpo}>
        <div className={css.horas} aria-hidden>
          {HORAS.slice(1).map((h) => (
            <span key={h} className={css.hora} style={posicion(h * 60)}>
              {h}:00
            </span>
          ))}
        </div>

        {dias.map((d) => (
          <div
            key={d}
            className={cx(css.columna, d === hoy && css.columnaHoy, d < hoy && css.columnaPasada)}
            aria-label={etiquetaDiaLarga(d)}
            role="group"
          >
            {/* Clic en un hueco: crea una cita a esa hora. El teclado usa el botón "Nueva cita". */}
            <div className={css.huecos} aria-hidden>
              {HUECOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  tabIndex={-1}
                  className={css.hueco}
                  onClick={() => alElegirHueco({ fecha: d, hora: aHora(m) })}
                >
                  <span className={css.textoHueco}>
                    <Plus aria-hidden /> {horaCorta(m)}
                  </span>
                </button>
              ))}
            </div>

            {ahora && ahora.fecha === d && ahora.minutos >= MIN_INICIO && ahora.minutos < MIN_FIN && (
              <div aria-hidden className={css.ahora} style={posicion(ahora.minutos)} />
            )}

            {porDia.get(d)?.map((c) => {
              // Una cita fuera del horario visible se pega al borde en lugar de desaparecer.
              const inicio = Math.min(Math.max(partesLocales(c.iniciaEn).minutos, MIN_INICIO), MIN_FIN - 30);
              const finReal = partesLocales(c.terminaEn);
              const fin = finReal.fecha !== d ? MIN_FIN : Math.min(Math.max(finReal.minutos, inicio + 30), MIN_FIN);
              const corta = fin - inicio < 45;
              return (
                <button
                  key={c.id}
                  type="button"
                  data-cita={c.id}
                  onClick={() => alElegirCita(c.id)}
                  className={cx(css.bloque, CLASE_BLOQUE[c.estado] ?? css.programada, corta && css.corta)}
                  style={posicion(inicio, fin - inicio)}
                  aria-label={`${c.alumno}, ${hora(c.iniciaEn)} a ${hora(c.terminaEn)}, ${tipoDe(c)}, ${ETIQUETA_ESTADO_CITA[c.estado] ?? c.estado}`}
                >
                  <span className={css.lineaBloque}>
                    <IconoEstadoCita estado={c.estado} className={css.iconoBloque} />
                    <span className={css.alumnoBloque}>{c.alumno}</span>
                  </span>
                  <span className={css.detalleBloque}>
                    {hora(c.iniciaEn)} · {tipoDe(c)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Vista de móvil y tablet (< 1024 px): agenda día por día. */
function AgendaDias({
  dias,
  hoy,
  porDia,
  alAgendar,
  alElegirCita,
}: {
  dias: string[];
  hoy: string;
  porDia: Map<string, CitaVista[]>;
  alAgendar: (b: Borrador) => void;
  alElegirCita: (id: string) => void;
}) {
  const pasados = dias.filter((d) => d < hoy);
  const resto = dias.filter((d) => d >= hoy);
  const citasPasadas = pasados.reduce((total, d) => total + (porDia.get(d)?.length ?? 0), 0);

  const dia = (d: string) => {
    const lista = porDia.get(d) ?? [];
    const esHoy = d === hoy;
    return (
      <li key={d} className={cx(css.diaAgenda, d < hoy && css.diaPasado)}>
        <div className={css.cabeceraAgenda}>
          <div className={css.textosAgenda}>
            <h3 className={cx(css.tituloAgenda, esHoy && css.tituloHoy)} aria-current={esHoy ? "date" : undefined}>
              {etiquetaDiaLarga(d)}
            </h3>
            {esHoy && <Insignia tono="solida">Hoy</Insignia>}
            {lista.length === 0 && (
              <Texto as="span" tamano="sm" tono="tenue">
                Sin citas
              </Texto>
            )}
          </div>
          <Boton
            variante="fantasma"
            tamano="pequeno"
            onClick={() => alAgendar({ fecha: d })}
            aria-label={`Agendar el ${etiquetaDiaLarga(d).toLowerCase()}`}
          >
            <Plus aria-hidden /> Agendar
          </Boton>
        </div>
        {lista.length > 0 && (
          <ListaFilas>
            {lista.map((c) => (
              <FilaCita key={c.id} cita={c} alPulsar={() => alElegirCita(c.id)} />
            ))}
          </ListaFilas>
        )}
      </li>
    );
  };

  return (
    <div className={css.agenda}>
      {/* En la semana en curso, los días ya pasados se pliegan para que hoy quede arriba. */}
      {pasados.length > 0 && resto.length > 0 && (
        <details className={css.anteriores}>
          <summary className={css.resumenAnteriores}>
            <ChevronRight aria-hidden className={css.flechaAnteriores} />
            Días anteriores
            <Texto as="span" tamano="sm" tono="tenue">
              {citasPasadas ? plural(citasPasadas, "cita", "citas") : "sin citas"}
            </Texto>
          </summary>
          <ol className={css.listaDias}>{pasados.map(dia)}</ol>
        </details>
      )}
      <ol className={css.listaDias} aria-label="Agenda de la semana">
        {(resto.length ? resto : pasados).map(dia)}
      </ol>
    </div>
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
      <EstadoVacio
        compacto
        titulo="Aún no tienes alumnos activos"
        descripcion="Necesitas al menos un alumno activo para agendar una cita."
        accion={
          <EnlaceBoton href="/alumnos/nuevo" variante="secundario">
            <UserPlus aria-hidden /> Registrar alumno
          </EnlaceBoton>
        }
      />
    );
  }

  return (
    <form action={enviar} noValidate>
      <Pila espacio={4}>
        {estado.error && <Aviso>{estado.error}</Aviso>}
        <Selector
          etiqueta="Alumno"
          nombre="alumno_id"
          required
          defaultValue={v?.alumno_id ?? borrador.alumnoId ?? ""}
          errores={estado.errores?.alumno_id}
          opciones={[{ valor: "", texto: "Elige un alumno" }, ...alumnos.map((a) => ({ valor: a.id, texto: a.nombre }))]}
        />
        <div className={css.camposCita}>
          <Campo
            etiqueta="Fecha"
            nombre="fecha"
            type="date"
            required
            defaultValue={v?.fecha ?? borrador.fecha}
            errores={estado.errores?.fecha}
          />
          <Campo
            etiqueta="Hora"
            nombre="hora"
            type="time"
            step={900}
            required
            defaultValue={v?.hora ?? borrador.hora ?? "07:00"}
            errores={estado.errores?.hora}
          />
          <Selector
            etiqueta="Duración"
            nombre="duracion"
            defaultValue={v?.duracion ?? "60"}
            opciones={DURACIONES_CITA.map((m) => ({ valor: String(m), texto: m < 60 || m % 60 ? `${m} min` : `${m / 60} h` }))}
          />
          <Selector
            etiqueta="Tipo"
            nombre="tipo"
            defaultValue={v?.tipo ?? "entrenamiento"}
            opciones={Object.entries(ETIQUETA_TIPO_CITA).map(([valor, texto]) => ({ valor, texto }))}
          />
        </div>
        <AreaTexto
          etiqueta="Notas"
          nombre="notas"
          opcional
          rows={2}
          placeholder="Lugar, enfoque de la sesión…"
          defaultValue={v?.notas}
        />
        <Grupo className={css.accionesFormulario}>
          <BotonEnvio textoPendiente="Guardando…">
            <CalendarPlus aria-hidden /> Agendar
          </BotonEnvio>
          <Boton variante="fantasma" onClick={alGuardar}>
            Cancelar
          </Boton>
        </Grupo>
      </Pila>
    </form>
  );
}

function DetalleCita({ cita, alTerminar }: { cita: CitaVista; alTerminar: () => void }) {
  const [pendiente, iniciar] = useTransition();
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fecha = partesLocales(cita.iniciaEn).fecha;

  const cambiar = (estado: EstadoCita) =>
    iniciar(async () => {
      setError(null);
      const resultado = await cambiarEstadoCita(cita.id, estado);
      // Si falla, el diálogo sigue abierto con el error: el entrenador no debe creer que se guardó.
      if (resultado?.error) setError(resultado.error);
      else alTerminar();
    });

  return (
    <Pila espacio={6}>
      {error && <Aviso>{error}</Aviso>}
      <div className={css.cuando}>
        <Texto as="span" cifra className={css.horasDetalle}>
          {hora(cita.iniciaEn)} – {hora(cita.terminaEn)}
        </Texto>
        <Texto tono="tenue">{etiquetaDiaLarga(fecha)}</Texto>
      </div>

      <ListaDatos
        datos={[
          { termino: "Estado", valor: <InsigniaCita estado={cita.estado} /> },
          { termino: "Tipo", valor: tipoDe(cita) },
          ...(cita.notas ? [{ termino: "Notas", valor: <span className={css.notas}>{cita.notas}</span> }] : []),
        ]}
      />

      <div className={css.pie}>
        {confirmandoCancelacion ? (
          <Pila espacio={4}>
            <Aviso tipo="aviso">¿Cancelar esta cita? El horario quedará libre y la cita dejará de verse en la agenda.</Aviso>
            <Grupo espacio={2}>
              <Boton variante="peligro" disabled={pendiente} onClick={() => cambiar("cancelada")}>
                {pendiente ? "Cancelando…" : "Sí, cancelar cita"}
              </Boton>
              <Boton variante="fantasma" disabled={pendiente} onClick={() => setConfirmandoCancelacion(false)}>
                Volver
              </Boton>
            </Grupo>
          </Pila>
        ) : (
          <Grupo justificar="entre" espacio={4}>
            <Grupo espacio={2}>
              {(ACCIONES[cita.estado] ?? []).map((a) => (
                <Boton
                  key={a.estado}
                  variante={a.variante ?? "secundario"}
                  disabled={pendiente}
                  onClick={() => (a.estado === "cancelada" ? setConfirmandoCancelacion(true) : cambiar(a.estado))}
                >
                  {a.texto}
                </Boton>
              ))}
            </Grupo>
            <Enlace href={`/alumnos/${cita.alumnoId}`}>Ver ficha del alumno</Enlace>
          </Grupo>
        )}
        {pendiente && !confirmandoCancelacion && (
          <Texto tamano="sm" tono="tenue" role="status" className={css.guardando}>
            Guardando…
          </Texto>
        )}
      </div>
    </Pila>
  );
}
