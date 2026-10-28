"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Check, ClipboardCopy, Database, History, NotebookPen, PlugZap, Send, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { AGENTES, LIDER, agentePorId, type Agente } from "@/lib/agentes/catalogo";
import { DURACION, guionDe, textoDeJunta, type CasoJunta, type Junta, type JuntaGuardada, type Paso, type RutinaPropuesta } from "@/lib/agentes/juntas";
import { Boton, clasesBoton } from "@/components/ui/boton";
import { BuscadorOpciones } from "@/components/ui/buscador-opciones";
import { claseAreaTexto } from "@/components/ui/campo";
import { Dialogo } from "@/components/ui/dialogo";
import { DialogoConfirmar } from "@/components/ui/dialogo-confirmar";
import { claseControl } from "@/components/ui/campo";
import { APARECE, PULSO, RITMO_PULSO, useBucle } from "@/components/ui/movimiento";
import { CabeceraTarjeta, Lista, Tarjeta } from "@/components/ui/tarjeta";
import { PUESTOS, useOficinaViva } from "./movimiento";
import { Plano } from "./plano";
import { borrarJunta, consultarJunta, crearBorradorRutina, guardarNotaJunta, preguntarAgente } from "./acciones";
import { fechaCorta, hora } from "@/lib/formato";
import { partesLocales } from "@/lib/calendario";

/* ---------- Puestos guardados en este navegador (aún no hay tabla en la base de datos) ---------- */

/** puesto → agente */
type Puestos = Record<string, string>;

const CLAVE = "oficina-agentes";
const VACIO: Puestos = {};
const avisos = new Set<() => void>();
let actuales: Puestos | null = null;

function leerPuestos(): Puestos {
  if (actuales) return actuales;
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) ?? "{}");
    // Solo puestos y agentes que existen (el líder no ocupa puesto), y cada agente en un único puesto.
    const vistos = new Set<string>();
    actuales = {};
    for (const [puesto, agente] of Object.entries(crudo)) {
      if (typeof agente !== "string" || !PUESTOS.some((p) => p.id === puesto) || !AGENTES.some((a) => a.id === agente) || vistos.has(agente)) continue;
      vistos.add(agente);
      actuales[puesto] = agente;
    }
  } catch {
    actuales = {};
  }
  return actuales;
}

function guardarPuestos(puestos: Puestos) {
  actuales = puestos;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(puestos));
  } catch {
    // Sin almacenamiento (modo privado): la oficina dura hasta recargar.
  }
  avisos.forEach((avisar) => avisar());
}

function usePuestos() {
  return useSyncExternalStore(
    (avisar) => {
      avisos.add(avisar);
      return () => avisos.delete(avisar);
    },
    leerPuestos,
    () => VACIO,
  );
}

/** Coloca un agente en un puesto (si ya tenía otro, se muda) y devuelve el nuevo reparto. */
function colocar(puestos: Puestos, puesto: string, agente: string): Puestos {
  const siguiente = Object.fromEntries(Object.entries(puestos).filter(([, a]) => a !== agente));
  siguiente[puesto] = agente;
  return siguiente;
}

const puestoDe = (puestos: Puestos, agente: string) => PUESTOS.find((p) => puestos[p.id] === agente);

/** Minuto actual (se actualiza solo); null en el servidor para no romper la hidratación. */
function useMinuto() {
  return useSyncExternalStore(
    (avisar) => {
      const id = setInterval(avisar, 15_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

/* ---------- Oficina ---------- */

/** Un alumno para el buscador de la junta. */
export type AlumnoJunta = { id: string; nombre: string; detalle?: string };

export function Oficina({ alumnos, historial }: { alumnos: AlumnoJunta[]; historial: JuntaGuardada[] }) {
  const puestos = usePuestos();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [eligiendoPara, setEligiendoPara] = useState<string | null>(null);
  const [junta, setJunta] = useState<Junta | null>(null);
  const [paso, setPaso] = useState(0);
  // Cada junta lleva un número: una respuesta que llega tarde (de una junta ya cerrada) se descarta.
  const idJunta = useRef(0);
  const minuto = useMinuto();
  const instante = minuto === null ? null : new Date(minuto * 60_000).toISOString();

  // La junta avanza sola, un paso a la vez; mientras los agentes piensan, espera antes de los informes.
  useEffect(() => {
    if (!junta || paso >= junta.guion.length) return;
    const siguiente = junta.guion[paso].tipo;
    if (junta.consulta === "pendiente" && (siguiente === "informa" || siguiente === "decide")) return;
    const espera = setTimeout(() => setPaso((p) => p + 1), DURACION[junta.guion[paso - 1].tipo]);
    return () => clearTimeout(espera);
  }, [junta, paso]);

  const sentados = AGENTES.filter((a) => puestoDe(puestos, a.id)).map((a) => a.id);
  const enPuestos = useMemo(
    () => PUESTOS.flatMap((puesto) => (puestos[puesto.id] ? [{ agente: agentePorId(puestos[puesto.id])!, puesto }] : [])),
    [puestos],
  );
  const agente = seleccionado ? agentePorId(seleccionado) : undefined;
  const puestoElegido = PUESTOS.find((p) => p.id === eligiendoPara);
  const { escena, saludar } = useOficinaViva(enPuestos, junta, paso);

  function abrirPuesto(puesto: string) {
    if (puesto === LIDER.id) return setSeleccionado(LIDER.id);
    if (puestos[puesto]) setSeleccionado(puestos[puesto]);
    else setEligiendoPara(puesto);
  }

  function asignar(agenteId: string) {
    const libre = PUESTOS.find((p) => !puestos[p.id]);
    if (!libre) return;
    guardarPuestos(colocar(puestos, libre.id, agenteId));
    setSeleccionado(agenteId);
  }

  function convocar(pedido: { alumnoId: string | null; situacion: string }) {
    setSeleccionado(null);
    const presentes = new Set(sentados);
    const alumno = alumnos.find((a) => a.id === pedido.alumnoId);
    // Aún sin encargos: el guion es solo "convoca" y "decide" hasta que el líder reparta.
    const caso: CasoJunta = {
      id: "junta",
      titulo: "Junta",
      alumno: alumno?.nombre ?? "Tu caso",
      contexto: pedido.situacion.trim() || "Revisión general.",
      encargos: [],
      decision: { titulo: "", resumen: "" },
    };
    const id = ++idJunta.current;
    setJunta({ caso, guion: guionDe(caso, presentes), asistentes: sentados, consulta: "pendiente", alumnoId: pedido.alumnoId });
    setPaso(1);
    // Mientras caminan a la sala, el servidor arma el expediente y consulta al líder y a cada agente con IA.
    consultarJunta({ alumnoId: pedido.alumnoId, situacion: pedido.situacion, presentes: sentados })
      .then((r) => {
        if (idJunta.current !== id) return;
        setJunta((j) =>
          j && (r.ok
            ? { ...j, caso: r.caso, guion: guionDe(r.caso, presentes), consulta: "lista", modelos: r.modelos, juntaId: r.juntaId }
            : { ...j, consulta: "fallo", aviso: r.error }),
        );
      })
      .catch(() => {
        if (idJunta.current === id) setJunta((j) => j && { ...j, consulta: "fallo", aviso: "No se pudo consultar a los agentes." });
      });
  }

  return (
    <div className="grid gap-4">
    <Convocar alumnos={alumnos} haySentados={sentados.length > 0} enCurso={Boolean(junta)} alConvocar={convocar} />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
      <Tarjeta className="overflow-hidden">
        <CabeceraTarjeta
          titulo={junta ? "Junta en curso" : "Tu oficina"}
          accion={
            <p className="etiqueta cifra">
              {instante && <span className="text-grafito">{hora(instante)} · </span>}
              {sentados.length} de {PUESTOS.length} puestos ocupados
            </p>
          }
        />
        <div className="oficina-iso px-1 py-3 sm:px-4 sm:py-4">
          <Plano
            minuto={instante ? partesLocales(instante).minutos : null}
            escena={escena}
            puestos={puestos}
            seleccionado={seleccionado}
            enJunta={Boolean(junta)}
            alPuesto={abrirPuesto}
            alAgente={(id) => {
              saludar(id);
              setSeleccionado(id);
            }}
          />
        </div>
        <p className="border-t border-linea px-5 py-3 text-sm text-tenue">
          {junta
            ? "El líder reparte el caso en la sala de juntas; desde ahí cada agente consulta la base de datos y le devuelve su parte."
            : "Toca un escritorio libre para sentar a un agente, o a un agente para saludarlo. Acerca con los botones o pellizcando, y arrastra para moverte."}
        </p>
      </Tarjeta>

      <div className="grid gap-4 lg:sticky lg:top-8">
        {junta ? (
          <PanelJunta
            junta={junta}
            paso={paso}
            // Saltar no se salta la espera: sin respuestas, se queda justo antes de los informes.
            alSaltar={() =>
              setPaso(
                junta.consulta === "pendiente"
                  ? junta.guion.findIndex((p) => p.tipo === "informa" || p.tipo === "decide")
                  : junta.guion.length,
              )
            }
            alTerminar={() => {
              idJunta.current++;
              setJunta(null);
              setPaso(0);
            }}
          />
        ) : agente ? (
          <Detalle
            agente={agente}
            alumnos={alumnos}
            puesto={puestoDe(puestos, agente.id)?.numero}
            hayLibre={sentados.length < PUESTOS.length}
            alVolver={() => setSeleccionado(null)}
            alColocar={() => asignar(agente.id)}
            alRetirar={() => guardarPuestos(Object.fromEntries(Object.entries(puestos).filter(([, a]) => a !== agente.id)))}
          />
        ) : (
          <Equipo puestos={puestos} alElegir={setSeleccionado} />
        )}
      </div>
    </div>

      <Dialogo abierto={Boolean(puestoElegido)} alCerrar={() => setEligiendoPara(null)} titulo={puestoElegido ? `Puesto ${puestoElegido.numero}` : ""}>
        <p className="text-sm text-tenue">¿Quién se sienta aquí?</p>
        <ul className="mt-4 grid gap-2">
          {AGENTES.map((a) => {
            const actual = puestoDe(puestos, a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!eligiendoPara) return;
                    guardarPuestos(colocar(puestos, eligiendoPara, a.id));
                    setEligiendoPara(null);
                    setSeleccionado(a.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-[var(--radius-tarjeta)] bg-hueso/50 px-3 py-2.5 text-left transition-colors hover:bg-hueso"
                >
                  <IconoAgente agente={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{a.nombre}</span>
                    <span className="block truncate text-sm text-tenue">{a.habilidades.join(" · ")}</span>
                  </span>
                  {actual && <span className="etiqueta shrink-0">Se muda del {actual.numero}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Dialogo>
      <HistorialJuntas juntas={historial} alumnos={alumnos} />
    </div>
  );
}

/* ---------- Panel lateral ---------- */

function IconoAgente({ agente, grande = false }: { agente: Agente; grande?: boolean }) {
  const Icono = agente.icono;
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${grande ? "size-12" : "size-9"}`}
      // Tinte claro con trazo oscuro fijo, como el avatar: se lee igual en los dos temas.
      style={{ background: agente.tinte, color: "#1e1e2a" }}
    >
      <Icono className={grande ? "size-5" : "size-4"} />
    </span>
  );
}

/** Franja superior: elegir un caso y convocar. Queda arriba para que el panel lateral sea del equipo y de la propuesta. */
function Convocar({
  alumnos,
  haySentados,
  enCurso,
  alConvocar,
}: {
  alumnos: AlumnoJunta[];
  haySentados: boolean;
  enCurso: boolean;
  alConvocar: (pedido: { alumnoId: string | null; situacion: string }) => void;
}) {
  const [alumnoId, setAlumnoId] = useState("");
  const [situacion, setSituacion] = useState("");
  // Con alumno basta (revisión general); sin alumno, hay que contar el caso.
  const hayCaso = Boolean(alumnoId) || situacion.trim().length >= 10;
  const listo = haySentados && !enCurso && hayCaso;
  return (
    <Tarjeta className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[13rem_minmax(0,1fr)_auto] xl:items-start">
      <div>
        <h2 className="titulo-display text-lg leading-tight">Convocar una junta</h2>
        <p className="mt-1 text-sm text-tenue">Elige un alumno o cuenta un caso: el líder lo reparte y cada agente lo revisa con IA.</p>
      </div>
      <fieldset disabled={enCurso} className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <legend className="sr-only">Caso de la junta</legend>
        <div>
          <BuscadorOpciones
            etiqueta="Alumno"
            nombre="alumno"
            valor={alumnoId}
            alCambiar={setAlumnoId}
            marcador="Busca por nombre"
            vacio={alumnos.length ? "Ningún alumno activo con ese nombre." : "Aún no tienes alumnos activos."}
            opciones={alumnos.map((a) => ({ valor: a.id, texto: a.nombre, detalle: a.detalle }))}
          />
          <p className="mt-1.5 text-xs text-tenue">Opcional. Los agentes leen sus datos de la app.</p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-grafito">{alumnoId ? "Qué quieres revisar (opcional)" : "El caso"}</span>
          <textarea
            value={situacion}
            onChange={(e) => setSituacion(e.target.value)}
            maxLength={600}
            rows={2}
            placeholder={alumnoId ? "Ej.: No sube de peso en sentadilla y le molesta la rodilla. Vacío = revisión general." : "Ej.: Un alumno lleva 3 semanas sin subir de peso en sentadilla y le duele la rodilla al bajar."}
            className={claseAreaTexto}
          />
          <span className="mt-1.5 block text-xs text-tenue">
            {alumnoId
              ? "A los agentes les llegan sus datos sin nombre ni contacto. Las notas van tal cual: evita nombres en ellas."
              : "Sin alumno, los agentes solo saben lo que escribas aquí."}{" "}
            {situacion.length}/600
          </span>
        </label>
      </fieldset>
      <div className="xl:w-44">
        <Boton className="w-full" disabled={!listo} onClick={() => alConvocar({ alumnoId: alumnoId || null, situacion })}>
          {enCurso ? "Junta en curso" : "Convocar junta"}
        </Boton>
        {!haySentados && <p className="etiqueta mt-2">Sienta al menos a un agente.</p>}
        {haySentados && !hayCaso && <p className="etiqueta mt-2">Elige un alumno o cuenta el caso.</p>}
      </div>
    </Tarjeta>
  );
}

function Equipo({ puestos, alElegir }: { puestos: Puestos; alElegir: (agente: string) => void }) {
  return (
    <Tarjeta>
      <CabeceraTarjeta titulo="Equipo" />
      <Lista>
        {[LIDER, ...AGENTES].map((a) => {
          const puesto = puestoDe(puestos, a.id);
          return (
            <li key={a.id}>
              <button type="button" onClick={() => alElegir(a.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hueso/40">
                <IconoAgente agente={a} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{a.nombre}</span>
                  <span className="block truncate text-sm text-tenue">{a.rol}</span>
                </span>
                <span className="etiqueta shrink-0">{a.id === LIDER.id ? "Su oficina" : puesto ? `Puesto ${puesto.numero}` : "Sin puesto"}</span>
              </button>
            </li>
          );
        })}
      </Lista>
    </Tarjeta>
  );
}

function Detalle({
  agente,
  alumnos,
  puesto,
  hayLibre,
  alVolver,
  alColocar,
  alRetirar,
}: {
  agente: Agente;
  alumnos: AlumnoJunta[];
  puesto?: number;
  hayLibre: boolean;
  alVolver: () => void;
  alColocar: () => void;
  alRetirar: () => void;
}) {
  const esLider = agente.id === LIDER.id;
  return (
    <Tarjeta>
      <div className="flex items-center justify-between gap-3 border-b border-linea px-3 py-2">
        <button type="button" onClick={alVolver} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-tenue hover:bg-hueso hover:text-tinta">
          <ArrowLeft aria-hidden className="size-4" /> Equipo
        </button>
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-exito/10 px-2.5 text-xs font-medium text-exito">
          <PlugZap aria-hidden className="size-3" /> Conectado
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3">
          <IconoAgente agente={agente} grande />
          <div className="min-w-0">
            <h2 className="titulo-display text-xl leading-tight">{agente.nombre}</h2>
            <p className="text-sm text-tenue">{esLider ? "En su oficina" : puesto ? `Puesto ${puesto}` : "Sin puesto"} · {agente.cualidad}</p>
          </div>
        </div>
        <p className="mt-4 text-grafito">{agente.descripcion}</p>

        <h3 className="etiqueta mt-5">Habilidades</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {agente.habilidades.map((h) => (
            <span key={h} className="rounded-full bg-hueso px-3 py-1 text-sm text-grafito">
              {h}
            </span>
          ))}
        </div>

        <h3 className="etiqueta mt-5">Puede ayudarte a</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {agente.tareas.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-tenue" />
              {t}
            </li>
          ))}
        </ul>

        <Pregunta key={agente.id} agente={agente} alumnos={alumnos} />

        {!esLider && (
          <div className="mt-5 flex flex-wrap gap-2">
            {puesto ? (
              <Boton variante="secundario" onClick={alRetirar}>
                Retirar del puesto
              </Boton>
            ) : (
              <Boton variante="secundario" onClick={alColocar} disabled={!hayLibre}>
                {hayLibre ? "Sentar en un puesto libre" : "No hay puestos libres"}
              </Boton>
            )}
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

function PanelJunta({ junta, paso, alSaltar, alTerminar }: { junta: Junta; paso: number; alSaltar: () => void; alTerminar: () => void }) {
  const bucle = useBucle();
  const vistos = junta.guion.slice(0, paso);
  const terminada = paso >= junta.guion.length;
  const acciones = vistos.flatMap((p) => (p.tipo === "informa" ? [p.encargo.accion] : []));
  const sinCubrir = junta.guion.filter((p) => p.tipo === "delega" && !p.presente).length;

  return (
    <Tarjeta>
      <CabeceraTarjeta
        titulo={`Junta · ${junta.caso.titulo}`}
        accion={
          !terminada && (
            <button type="button" onClick={alSaltar} className="rounded-full px-2 text-sm text-tenue hover:text-tinta">
              Saltar al final
            </button>
          )
        }
      />
      <div className="p-5">
        <p className="etiqueta">{junta.caso.alumno}</p>
        <p className="mt-0.5 text-grafito">{junta.caso.contexto}</p>
        {junta.consulta === "fallo" && (
          <p role="status" className="mt-3 flex gap-2 rounded-lg bg-aviso/10 px-3 py-2 text-sm text-aviso">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {junta.aviso} Vuelve a convocar la junta cuando quieras.
            </span>
          </p>
        )}

        {terminada && junta.caso.decision.titulo && <DecisionLider caso={junta.caso} modelos={junta.modelos} acciones={acciones} sinCubrir={sinCubrir} />}

        {terminada && junta.caso.rutina && <PropuestaRutina rutina={junta.caso.rutina} alumno={junta.caso.alumno} />}
        {terminada && junta.consulta === "lista" && junta.caso.decision.titulo && (
          <AccionesJunta caso={junta.caso} alumnoId={junta.alumnoId ?? null} juntaId={junta.juntaId ?? null} />
        )}

        {terminada && (
          <Boton variante="secundario" className="mt-4 w-full" onClick={alTerminar}>
            Volver a los puestos
          </Boton>
        )}
        {terminada && <h3 className="etiqueta mt-5">Cómo se llegó</h3>}
        <ol aria-live="polite" className={`space-y-3 border-l border-linea pl-4 ${terminada ? "mt-2 max-h-72 overflow-y-auto pr-1" : "mt-4"}`}>
          {vistos.map((p, i) => (
            <motion.li key={i} {...APARECE}>
              <Evento paso={p} alumno={junta.caso.alumno} />
            </motion.li>
          ))}
          {junta.consulta === "pendiente" && (vistos.at(-1)?.tipo === "trabajan" || vistos.at(-1)?.tipo === "convoca") && (
            <motion.li {...APARECE} className="flex items-center gap-2 text-sm text-tenue">
              <motion.span aria-hidden animate={bucle ? PULSO : undefined} transition={RITMO_PULSO} className="shrink-0 text-acento">
                <Sparkles className="size-4" />
              </motion.span>
              {vistos.at(-1)?.tipo === "convoca" && !junta.caso.encargos.length ? "El líder está leyendo el caso y repartiéndolo…" : "Los agentes están pensando con IA…"}
            </motion.li>
          )}
        </ol>
      </div>
    </Tarjeta>
  );
}

function Evento({ paso, alumno }: { paso: Paso; alumno: string }) {
  if (paso.tipo === "convoca")
    return (
      <Linea agente={LIDER}>
        Convoco a la junta por <span className="text-tinta">{alumno}</span>. Reparto el caso.
      </Linea>
    );
  if (paso.tipo === "delega") {
    const a = agentePorId(paso.encargo.agente)!;
    if (!paso.presente)
      return (
        <p className="flex gap-2 text-sm text-aviso">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Nadie cubre «{a.rol.toLowerCase()}». Sienta a {a.nombre} en un puesto para revisarlo.
          </span>
        </p>
      );
    return (
      <Linea agente={LIDER}>
        <span className="text-tinta">{a.nombre}</span>, {paso.encargo.tarea.charAt(0).toLowerCase() + paso.encargo.tarea.slice(1)}
      </Linea>
    );
  }
  if (paso.tipo === "trabajan")
    return (
      <p className="flex items-center gap-2 text-sm text-tenue">
        <Database aria-hidden className="size-4 shrink-0" /> El equipo consulta la base de datos…
      </p>
    );
  if (paso.tipo === "informa")
    return (
      <Linea agente={agentePorId(paso.encargo.agente)!}>
        {paso.encargo.hallazgo}
        {(paso.encargo.detalle || paso.encargo.accion) && (
          <details className="group mt-1">
            <summary className="cursor-pointer text-xs font-medium text-tenue hover:text-tinta">Ver respuesta completa</summary>
            {paso.encargo.detalle && <span className="mt-1.5 block whitespace-pre-line">{paso.encargo.detalle}</span>}
            {paso.encargo.accion && (
              <span className="mt-1.5 block">
                <span className="font-medium text-tinta">Propone:</span> {paso.encargo.accion}
              </span>
            )}
          </details>
        )}
      </Linea>
    );
  return <Linea agente={LIDER}>Con esto sobre la mesa, esta es mi propuesta.</Linea>;
}

function Linea({ agente, children }: { agente: Agente; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 text-sm">
      <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full" style={{ background: agente.tinte, color: "#1e1e2a" }}>
        <agente.icono className="size-3" />
      </span>
      {/* div y no p: la respuesta completa (details) va dentro, y un párrafo no puede contenerla. */}
      <div className="min-w-0 text-grafito">
        <span className="sr-only">{agente.nombre}: </span>
        {children}
      </div>
    </div>
  );
}

/**
 * Pregunta directa a un agente: una consulta con IA desde su especialidad. Con un alumno elegido, el
 * agente lee sus datos de la app (sin nombre ni contacto). Solo se muestra la última respuesta.
 */
function Pregunta({ agente, alumnos }: { agente: Agente; alumnos: AlumnoJunta[] }) {
  const [alumnoId, setAlumnoId] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<{ texto: string; modelo?: string; error?: boolean } | null>(null);
  const [pensando, setPensando] = useState(false);
  const bucle = useBucle();

  const enviar = async () => {
    const texto = pregunta.trim();
    if (!texto || pensando) return;
    setPensando(true);
    setRespuesta(null);
    try {
      const r = await preguntarAgente(agente.id, texto, alumnoId || null);
      setRespuesta(r.ok ? { texto: r.texto, modelo: r.modelo } : { texto: r.error, error: true });
    } catch {
      setRespuesta({ texto: "No se pudo consultar al agente.", error: true });
    } finally {
      setPensando(false);
    }
  };

  const alumno = alumnos.find((a) => a.id === alumnoId);
  return (
    <div className="mt-5 space-y-2">
      <BuscadorOpciones
        etiqueta="Sobre qué alumno (opcional)"
        nombre={`alumno-${agente.id}`}
        valor={alumnoId}
        alCambiar={(id) => {
          setAlumnoId(id);
          setRespuesta(null);
        }}
        marcador="Busca por nombre"
        vacio={alumnos.length ? "Ningún alumno activo con ese nombre." : "Aún no tienes alumnos activos."}
        opciones={alumnos.map((a) => ({ valor: a.id, texto: a.nombre, detalle: a.detalle }))}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        className="flex items-center gap-2 rounded-full border border-linea px-1.5 py-1.5 pl-4 focus-within:border-acento"
      >
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          maxLength={600}
          aria-label={`Pregúntale a ${agente.nombre}`}
          placeholder={alumno ? `¿Qué le recomiendas a ${alumno.nombre.split(" ")[0]}?` : agente.ejemplos[0]}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-tenue"
        />
        <button
          type="submit"
          disabled={!pregunta.trim() || pensando}
          aria-label="Enviar pregunta"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-sobre-acento transition-opacity disabled:opacity-40"
        >
          <Send aria-hidden className="size-3.5" />
        </button>
      </form>
      <div aria-live="polite">
        {pensando && (
          <p className="mt-3 flex items-center gap-2 text-sm text-tenue">
            <motion.span aria-hidden animate={bucle ? PULSO : undefined} transition={RITMO_PULSO} className="text-acento">
              <Sparkles className="size-4" />
            </motion.span>
            {agente.nombre} está pensando…
          </p>
        )}
        {respuesta && (
          <motion.div {...APARECE} className={`mt-3 rounded-2xl px-4 py-3 text-sm ${respuesta.error ? "bg-aviso/10 text-aviso" : "bg-hueso text-grafito"}`}>
            <p className="whitespace-pre-line">{respuesta.texto}</p>
            {respuesta.modelo && (
              <p className="mt-2 text-xs text-tenue">
                Con IA ({respuesta.modelo}){alumno ? `, con los datos de ${alumno.nombre.split(" ")[0]}` : ""}: es una sugerencia, tú decides.
              </p>
            )}
          </motion.div>
        )}
      </div>
      {!respuesta && !pensando && (
        <p className="etiqueta">
          {alumno
            ? "Le llegan los datos del alumno sin nombre ni contacto. Las notas van tal cual: evita nombres en ellas."
            : "Responde con IA (modelos gratuitos de OpenRouter). Elige un alumno para que use sus datos."}
        </p>
      )}
    </div>
  );
}

const CUANDO: { clave: "hoy" | "semana" | "despues"; texto: string }[] = [
  { clave: "hoy", texto: "Hoy" },
  { clave: "semana", texto: "Esta semana" },
  { clave: "despues", texto: "En 2–3 semanas" },
];

/** El plan del líder agrupado en el tiempo: qué hacer hoy, esta semana y después. */
function PlanPorTiempo({ pasos }: { pasos: { cuando: "hoy" | "semana" | "despues"; texto: string }[] }) {
  return (
    <div className="mt-3 space-y-3">
      {CUANDO.map(({ clave, texto }) => {
        const suyos = pasos.filter((p) => p.cuando === clave);
        if (!suyos.length) return null;
        return (
          <div key={clave}>
            <p className="text-xs font-medium tracking-wide text-white/55 uppercase">{texto}</p>
            <ul className="mt-1 space-y-1.5 text-sm">
              {suyos.map((p) => (
                <li key={p.texto} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-white/50" />
                  {p.texto}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * La rutina que armó el agente de Rutinas: días y ejercicios de tu biblioteca, con un botón para
 * crearla como borrador en el constructor (no se asigna a nadie hasta que tú lo hagas).
 */
function PropuestaRutina({ rutina, alumno }: { rutina: RutinaPropuesta; alumno: string }) {
  const [creando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <motion.section {...APARECE} aria-labelledby="rutina-propuesta" className="mt-4 rounded-[var(--radius-tarjeta)] border border-linea">
      <div className="border-b border-linea px-4 py-3">
        <p className="etiqueta text-acento">Rutina propuesta</p>
        <h3 id="rutina-propuesta" className="titulo-display mt-0.5 text-lg leading-snug">
          {rutina.nombre}
        </h3>
        {rutina.descripcion && <p className="mt-0.5 text-sm text-tenue">{rutina.descripcion}</p>}
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
        {rutina.dias.map((d) => (
          <div key={d.nombre}>
            <p className="text-sm font-semibold">{d.nombre}</p>
            <ul className="mt-1 divide-y divide-linea text-sm">
              {d.ejercicios.map((e, i) => (
                <li key={`${e.ejercicioId}-${i}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-1.5">
                  <span className="truncate">{e.nombre}</span>
                  <span className="tabular-nums text-tenue">
                    {[e.series && e.repeticiones ? `${e.series}×${e.repeticiones}` : e.series ? `${e.series} series` : null, e.rir !== null ? `RIR ${e.rir}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {rutina.descartados.length > 0 && (
          <p className="text-xs text-tenue">No están en tu biblioteca y no se incluyen: {rutina.descartados.join(", ")}.</p>
        )}
      </div>
      <div className="space-y-2 border-t border-linea p-3">
        {error && <p className="text-sm text-peligro">{error}</p>}
        <Boton
          className="w-full"
          disabled={creando}
          onClick={() =>
            iniciar(async () => {
              setError(null);
              // Si sale bien, la acción abre el borrador en el constructor; aquí solo vuelve un error.
              const r = await crearBorradorRutina(rutina, alumno);
              setError(r?.error ?? null);
            })
          }
        >
          {creando ? "Creando borrador…" : "Crear borrador de rutina"}
        </Boton>
        <p className="text-center text-xs text-tenue">Se abre en el constructor para que la ajustes. No se asigna a nadie hasta que tú lo hagas.</p>
      </div>
    </motion.section>
  );
}

/** La propuesta del líder: decisión, plan en el tiempo y preguntas. La usan la junta en curso y el historial. */
function DecisionLider({ caso, modelos, acciones = [], sinCubrir = 0 }: { caso: CasoJunta; modelos?: string[]; acciones?: string[]; sinCubrir?: number }) {
  return (
    <motion.section {...APARECE} aria-labelledby="decision-junta" className="mt-5 rounded-[var(--radius-tarjeta)] bg-panel p-4 text-white">
      <p className="text-xs text-white/60">Propuesta del líder</p>
      <h3 id="decision-junta" className="titulo-display mt-1 text-lg leading-snug">
        {caso.decision.titulo}
      </h3>
      <p className="mt-1 text-sm text-white/75">{caso.decision.resumen}</p>
      {caso.decision.pasos?.length ? (
        <PlanPorTiempo pasos={caso.decision.pasos} />
      ) : (
        acciones.length > 0 && (
          <ol className="mt-3 space-y-1.5 text-sm">
            {acciones.map((a, i) => (
              <li key={a} className="flex gap-2">
                <span className="cifra text-white/50">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ol>
        )
      )}
      {caso.decision.preguntas?.length ? (
        <div className="mt-4 rounded-lg bg-white/[0.06] px-3 py-2.5">
          <p className="text-xs font-medium text-white/70">Antes de aplicarlo, necesito saber</p>
          <ul className="mt-1.5 space-y-1 text-sm text-white/85">
            {caso.decision.preguntas.map((q) => (
              <li key={q} className="flex gap-2">
                <span aria-hidden className="text-white/40">?</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {sinCubrir > 0 && (
        <p className="mt-3 text-xs text-white/60">
          Faltó revisar {sinCubrir === 1 ? "una parte" : `${sinCubrir} partes`} del caso: sienta a los agentes que faltan para una decisión completa.
        </p>
      )}
      <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">
        {modelos?.length ? `Generado con IA (${modelos.join(", ")}): puede equivocarse. ` : ""}
        Nada cambia en el plan del alumno hasta que tú lo apruebes.
      </p>
    </motion.section>
  );
}

/**
 * Lo que se puede hacer con el resultado: guardarlo en las notas del alumno, agendarle una cita o
 * copiar el plan (para mandarlo por WhatsApp, por ejemplo). La rutina tiene su propio botón.
 */
function AccionesJunta({ caso, alumnoId, juntaId, fecha }: { caso: CasoJunta; alumnoId: string | null; juntaId: string | null; fecha?: string }) {
  const [guardando, iniciar] = useTransition();
  const [nota, setNota] = useState<{ ok?: boolean; error?: string }>({});
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoDeJunta(caso, fecha));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      // Sin permiso de portapapeles: no se copia, pero nada se rompe.
    }
  };
  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {alumnoId && juntaId && (
          <Boton
            variante="secundario"
            disabled={guardando || nota.ok}
            onClick={() => iniciar(async () => setNota(await guardarNotaJunta(juntaId)))}
          >
            {nota.ok ? <Check aria-hidden className="size-4 text-exito" /> : <NotebookPen aria-hidden className="size-4" />}
            {nota.ok ? "Guardado en sus notas" : guardando ? "Guardando…" : "Guardar en notas del alumno"}
          </Boton>
        )}
        {alumnoId && (
          <Link href={`/calendario?alumno=${alumnoId}`} className={clasesBoton("secundario")}>
            <CalendarPlus aria-hidden className="size-4" /> Agendar cita
          </Link>
        )}
        <Boton variante="secundario" onClick={copiar}>
          {copiado ? <Check aria-hidden className="size-4 text-exito" /> : <ClipboardCopy aria-hidden className="size-4" />}
          {copiado ? "Copiado" : "Copiar plan"}
        </Boton>
      </div>
      {nota.error && <p className="text-sm text-peligro">{nota.error}</p>}
      {!juntaId && alumnoId && <p className="text-xs text-tenue">Esta junta no se guardó en el historial, así que no se puede pasar a sus notas. Copia el plan.</p>}
    </div>
  );
}

/** Las juntas anteriores: para releer el resultado completo y aplicar sus propuestas cuando quieras. */
function HistorialJuntas({ juntas, alumnos }: { juntas: JuntaGuardada[]; alumnos: AlumnoJunta[] }) {
  const [filtro, setFiltro] = useState("");
  const [abierta, setAbierta] = useState<JuntaGuardada | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const normalizar = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const visibles = juntas.filter((j) => !filtro.trim() || normalizar(`${j.caso.alumno} ${j.caso.contexto} ${j.caso.decision.titulo}`).includes(normalizar(filtro.trim())));
  const nombreDe = (j: JuntaGuardada) => alumnos.find((a) => a.id === j.alumnoId)?.nombre ?? j.caso.alumno;

  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby="historial-juntas">
        <CabeceraTarjeta
          id="historial-juntas"
          titulo={
            <span className="inline-flex items-center gap-2">
              <History aria-hidden className="size-4 text-tenue" /> Juntas anteriores
            </span>
          }
          accion={<span className="tabular-nums text-xs text-tenue">{juntas.length}</span>}
        />
        {juntas.length ? (
          <>
            <div className="border-b border-linea p-3">
              <label>
                <span className="sr-only">Filtrar por alumno o tema</span>
                <input value={filtro} onChange={(e) => setFiltro(e.target.value)} type="search" placeholder="Filtrar por alumno o tema" className={claseControl} />
              </label>
            </div>
            <ul className="max-h-96 divide-y divide-linea overflow-y-auto">
              {visibles.map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => setAbierta(j)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3 text-left transition-colors hover:bg-hueso/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{j.caso.decision.titulo || j.caso.titulo}</span>
                      <span className="block truncate text-xs text-tenue">
                        {nombreDe(j)} · {j.caso.contexto}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-tenue">{fechaCorta(j.creadoEn)}</span>
                  </button>
                </li>
              ))}
              {!visibles.length && <li className="px-4 py-4 text-sm text-tenue">Ninguna junta coincide.</li>}
            </ul>
          </>
        ) : (
          <p className="p-4 text-sm text-tenue">Cuando convoques una junta, su resultado quedará aquí para volver a leerlo y aplicarlo después.</p>
        )}
      </section>

      <Dialogo abierto={abierta !== null} alCerrar={() => setAbierta(null)} titulo={abierta ? `Junta · ${nombreDe(abierta)}` : "Junta"} amplio>
        {abierta && (
          <div>
            <p className="text-xs text-tenue">{fechaCorta(abierta.creadoEn)}</p>
            <p className="mt-0.5 text-grafito">{abierta.caso.contexto}</p>
            <DecisionLider caso={abierta.caso} modelos={abierta.modelos} />
            {abierta.caso.rutina && <PropuestaRutina rutina={abierta.caso.rutina} alumno={nombreDe(abierta)} />}
            <AccionesJunta caso={abierta.caso} alumnoId={abierta.alumnoId} juntaId={abierta.id} fecha={fechaCorta(abierta.creadoEn)} />
            <h3 className="etiqueta mt-5">Lo que respondió cada agente</h3>
            <ul className="mt-2 space-y-3 border-l border-linea pl-4">
              {abierta.caso.encargos.map((e, i) => (
                <li key={i}>
                  <Evento paso={{ tipo: "informa", encargo: e }} alumno={abierta.caso.alumno} />
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-linea pt-4">
              <Boton variante="peligro" onClick={() => setBorrando(true)}>
                <Trash2 aria-hidden className="size-4" /> Borrar del historial
              </Boton>
            </div>
          </div>
        )}
      </Dialogo>
      <DialogoConfirmar
        abierto={borrando}
        titulo="¿Borrar esta junta?"
        textoConfirmar={<><Trash2 aria-hidden className="size-4" /> Borrar</>}
        pendiente={pendiente}
        alCerrar={() => setBorrando(false)}
        alConfirmar={() =>
          iniciar(async () => {
            if (abierta) await borrarJunta(abierta.id);
            setBorrando(false);
            setAbierta(null);
          })
        }
      >
        <p>Se quita del historial. Las notas o rutinas que creaste a partir de ella se quedan.</p>
      </DialogoConfirmar>
    </Tarjeta>
  );
}
