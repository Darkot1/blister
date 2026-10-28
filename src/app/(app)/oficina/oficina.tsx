"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Database, Send, TriangleAlert, Unplug } from "lucide-react";
import { motion } from "motion/react";
import { AGENTES, LIDER, agentePorId, type Agente } from "@/lib/agentes/catalogo";
import { CASOS, DURACION, guionDe, type CasoJunta, type Junta, type Paso } from "@/lib/agentes/juntas";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { APARECE } from "@/components/ui/movimiento";
import { CabeceraTarjeta, Lista, Tarjeta } from "@/components/ui/tarjeta";
import { PUESTOS, useOficinaViva } from "./movimiento";
import { Plano } from "./plano";
import { hora } from "@/lib/formato";
import { partesLocales } from "@/lib/calendario";

/* ---------- Puestos guardados en este navegador (aún no hay tabla: los agentes no están conectados) ---------- */

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

export function Oficina() {
  const puestos = usePuestos();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [eligiendoPara, setEligiendoPara] = useState<string | null>(null);
  const [junta, setJunta] = useState<Junta | null>(null);
  const [paso, setPaso] = useState(0);
  const minuto = useMinuto();
  const instante = minuto === null ? null : new Date(minuto * 60_000).toISOString();

  // La junta avanza sola, un paso a la vez.
  useEffect(() => {
    if (!junta || paso >= junta.guion.length) return;
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

  function convocar(caso: CasoJunta) {
    setSeleccionado(null);
    setJunta({ caso, guion: guionDe(caso, new Set(sentados)), asistentes: sentados });
    setPaso(1);
  }

  return (
    <div className="grid gap-4">
    <Convocar haySentados={sentados.length > 0} enCurso={Boolean(junta)} alConvocar={convocar} />
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
            alSaltar={() => setPaso(junta.guion.length)}
            alTerminar={() => {
              setJunta(null);
              setPaso(0);
            }}
          />
        ) : agente ? (
          <Detalle
            agente={agente}
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
function Convocar({ haySentados, enCurso, alConvocar }: { haySentados: boolean; enCurso: boolean; alConvocar: (caso: CasoJunta) => void }) {
  const [casoId, setCasoId] = useState(CASOS[0].id);
  const caso = CASOS.find((c) => c.id === casoId)!;
  return (
    <Tarjeta className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[13rem_minmax(0,1fr)_auto] xl:items-center">
      <div>
        <h2 className="titulo-display text-lg leading-tight">Convocar una junta</h2>
        <p className="mt-1 text-sm text-tenue">El líder reparte el caso, cada agente revisa su parte y te propone una decisión.</p>
      </div>
      <fieldset disabled={enCurso} className="min-w-0">
        <legend className="sr-only">Caso de ejemplo</legend>
        <div className="grid gap-1.5 md:grid-cols-3">
          {CASOS.map((c) => (
            <label
              key={c.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-tarjeta)] px-3 py-2.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-acento has-disabled:cursor-not-allowed has-disabled:opacity-60 ${
                c.id === casoId ? "bg-hueso" : "ring-1 ring-linea hover:bg-hueso/50"
              }`}
            >
              <input type="radio" name="caso" value={c.id} checked={c.id === casoId} onChange={() => setCasoId(c.id)} className="mt-1 accent-[var(--tinta)]" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.titulo}</span>
                <span className="line-clamp-2 block text-xs text-tenue">
                  {c.alumno}: {c.contexto}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="xl:w-44">
        <Boton className="w-full" disabled={!haySentados || enCurso} onClick={() => alConvocar(caso)}>
          {enCurso ? "Junta en curso" : "Convocar junta"}
        </Boton>
        {!haySentados && <p className="etiqueta mt-2">Sienta al menos a un agente.</p>}
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
  puesto,
  hayLibre,
  alVolver,
  alColocar,
  alRetirar,
}: {
  agente: Agente;
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
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-hueso px-2.5 text-xs font-medium">
          <Unplug aria-hidden className="size-3 text-tenue" /> Sin conectar
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

        <h3 className="etiqueta mt-5">Podrá ayudarte a</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {agente.tareas.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-tenue" />
              {t}
            </li>
          ))}
        </ul>

        {/* Vista previa de la conversación: se activa cuando el agente se conecte a Claude. */}
        <div className="mt-5 flex items-center gap-2 rounded-full border border-linea px-1.5 py-1.5 pl-4 opacity-60">
          <input
            disabled
            aria-label={`Pregúntale a ${agente.nombre}`}
            placeholder={agente.ejemplos[0]}
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-tenue disabled:cursor-not-allowed"
          />
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-hueso text-tenue">
            <Send className="size-3.5" />
          </span>
        </div>
        <p className="etiqueta mt-2">Pronto se conectará a Claude. Sus respuestas serán sugerencias: tú decides.</p>

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

        {terminada && (
          <motion.section {...APARECE} aria-labelledby="decision-junta" className="mt-5 rounded-[var(--radius-tarjeta)] bg-panel p-4 text-white">
            <p className="text-xs text-white/60">Propuesta del líder</p>
            <h3 id="decision-junta" className="titulo-display mt-1 text-lg leading-snug">
              {junta.caso.decision.titulo}
            </h3>
            <p className="mt-1 text-sm text-white/75">{junta.caso.decision.resumen}</p>
            {acciones.length > 0 && (
              <ol className="mt-3 space-y-1.5 text-sm">
                {acciones.map((a, i) => (
                  <li key={a} className="flex gap-2">
                    <span className="cifra text-white/50">{i + 1}.</span>
                    {a}
                  </li>
                ))}
              </ol>
            )}
            {sinCubrir > 0 && (
              <p className="mt-3 text-xs text-white/60">
                Faltó revisar {sinCubrir === 1 ? "una parte" : `${sinCubrir} partes`} del caso: sienta a los agentes que faltan para una decisión completa.
              </p>
            )}
            <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/60">Nada cambia en el plan del alumno hasta que tú lo apruebes.</p>
          </motion.section>
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
  if (paso.tipo === "informa") return <Linea agente={agentePorId(paso.encargo.agente)!}>{paso.encargo.hallazgo}</Linea>;
  return <Linea agente={LIDER}>Con esto sobre la mesa, esta es mi propuesta.</Linea>;
}

function Linea({ agente, children }: { agente: Agente; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 text-sm">
      <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full" style={{ background: agente.tinte, color: "#1e1e2a" }}>
        <agente.icono className="size-3" />
      </span>
      <p className="min-w-0 text-grafito">
        <span className="sr-only">{agente.nombre}: </span>
        {children}
      </p>
    </div>
  );
}
