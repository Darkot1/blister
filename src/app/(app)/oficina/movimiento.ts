"use client";

import { useEffect, useRef, useState } from "react";
import { LIDER, agentePorId, type Agente } from "@/lib/agentes/catalogo";
import type { Junta, Paso } from "@/lib/agentes/juntas";

/**
 * Dónde está cada cosa en la oficina (en baldosas: c hacia abajo a la derecha, r hacia abajo a la izquierda)
 * y cómo se mueven los agentes. Todos los recorridos pasan por el pasillo central.
 */

export type Punto = { c: number; r: number };
/** Hacia dónde mira: de frente (se le ve la cara), de espaldas o caminando en un eje. */
export type Mira = "frente" | "espalda" | "c+" | "c-" | "r+" | "r-";
/** Un sitio al que se puede ir. `via`: puntos desde el pasillo hasta llegar (el primero fija la columna de entrada). */
export type Lugar = Punto & { mira: Mira; via?: Punto[]; sentado?: boolean };

/** Fila del pasillo, entre la oficina abierta y el gimnasio. */
export const PASILLO = 5.6;

/** Seis puestos en dos filas, con pasillo entre ellas. */
export const PUESTOS = [1, 3, 5]
  .flatMap((c, i) => [
    { id: `p${i + 1}`, numero: i + 1, c, r: 1 },
    { id: `p${i + 4}`, numero: i + 4, c, r: 4 },
  ])
  .sort((a, b) => a.numero - b.numero);
export type Puesto = (typeof PUESTOS)[number];

/** Centro de la mesa de un puesto. */
export const centroDe = (p: Puesto): Punto => ({ c: p.c + 0.5, r: p.r + 0.5 });
/** La silla queda detrás de la mesa (hacia el fondo de la pantalla). */
export const sillaDe = (centro: Punto, ancho = 0.72): Lugar => ({ c: centro.c - 0.5 - (ancho - 0.72) / 4, r: centro.r - 0.5, mira: "frente", sentado: true });

export const OFICINA_LIDER: Punto = { c: 4.8, r: 8.3 };
export const ANCHO_MESA_LIDER = 1.3;
export const SILLA_LIDER = sillaDe(OFICINA_LIDER, ANCHO_MESA_LIDER);
export const BASE_DATOS: Punto = { c: 2.2, r: 8.9 };

/** Sala de juntas: se entra por la puerta del vidrio frontal, junto al pasillo. */
const PUERTA: Punto = { c: 7.5, r: 4.6 };
export const MESA_JUNTAS = { c: 7.9, r: 2, dc: 3.2, dr: 1.2 };
export const SILLAS_FONDO: Lugar[] = [8.5, 9.5, 10.5].map((c) => ({ c, r: 1.6, mira: "frente", sentado: true, via: [PUERTA, { c: 7.5, r: 1.6 }] }));
export const SILLAS_FRENTE: Lugar[] = [8.5, 9.5, 10.5].map((c) => ({ c, r: 3.65, mira: "espalda", sentado: true, via: [PUERTA, { c, r: 4.6 }] }));
export const CABECERA: Lugar = { c: 11.65, r: 2.6, mira: "frente", sentado: true, via: [PUERTA, { c: 11.65, r: 4.6 }] };
const ASIENTOS = [...SILLAS_FONDO, ...SILLAS_FRENTE];

/** Adónde van cuando no hay junta, y qué dicen al llegar. */
const RATOS_LIBRES: (Lugar & { texto: string })[] = [
  { c: 2.5, r: 0.45, mira: "espalda", texto: "Linda vista" },
  { c: 0.45, r: 2.3, mira: "c-", texto: "Ideas para la pizarra" },
  { c: 10.45, r: 8.3, mira: "frente", texto: "Una serie más", via: [{ c: 9.3, r: 7.4 }, { c: 10.45, r: 7.4 }] },
  { c: 8.1, r: 8.9, mira: "frente", texto: "Estiramientos" },
  { c: 11.3, r: 9.4, mira: "frente", texto: "Peso muerto", via: [{ c: 11.9, r: 9.4 }] },
  { c: 0.95, r: 7.05, mira: "c-", texto: "Revisando servidores" },
  { c: 2.8, r: 8.4, mira: "c-", texto: "Respaldo al día" },
];

/** Recorrido de un sitio a otro pasando por el pasillo. `viaActual` es por donde se llegó al sitio de partida. */
function ruta(desde: Punto, viaActual: Punto[], hasta: Lugar): Punto[] {
  const columnaSalida = (viaActual[0] ?? desde).c;
  const columnaEntrada = (hasta.via?.[0] ?? hasta).c;
  const puntos = [...[...viaActual].reverse(), { c: columnaSalida, r: PASILLO }, { c: columnaEntrada, r: PASILLO }, ...(hasta.via ?? []), hasta];
  const limpio: Punto[] = [];
  let previo = desde;
  for (const p of puntos) {
    if (Math.abs(p.c - previo.c) < 0.01 && Math.abs(p.r - previo.r) < 0.01) continue;
    limpio.push({ c: p.c, r: p.r });
    previo = p;
  }
  return limpio;
}

/* ---------- Actores ---------- */

type Actor = {
  agente: Agente;
  casa: Lugar;
  puesto?: Puesto;
  c: number;
  r: number;
  mira: Mira;
  camino: Punto[];
  /** Por dónde llegó (o está llegando) a su sitio: el camino de salida. */
  via: Punto[];
  destino: Lugar;
  alLlegar?: () => void;
  /** Baldosas por segundo del recorrido en curso. */
  velocidad: number;
  estado: "libre" | "esperando" | "trabajando" | "listo";
  globo: string;
  globoHasta: number;
  ocioEn: number;
};

/** Lo que el plano necesita para dibujar a un agente. */
export type VistaActor = {
  agente: Agente;
  puesto?: string;
  c: number;
  r: number;
  mira: Mira;
  caminando: boolean;
  /** Para el ritmo de las piernas. */
  velocidad: number;
  sentado: boolean;
  /** Trabajando en un encargo (en la sala, consultando la base de datos). */
  trabajando: boolean;
  enCasa: boolean;
  estado: Actor["estado"];
  globo: string;
};

export type Escena = { actores: VistaActor[]; consultando: boolean; pantalla: string[]; t: number };

const PANTALLA_LIBRE = ["Sala libre"];
/** Baldosas por segundo: con prisa a una junta, sin prisa cuando pasean. */
const AGIL = 3.5;
const PASEO = 1.2;
const NORMAL = 2.2;

function nuevoActor(agente: Agente, casa: Lugar, puesto: Puesto | undefined, ahora: number, i: number): Actor {
  return {
    agente,
    casa,
    puesto,
    c: casa.c,
    r: casa.r,
    mira: casa.mira,
    camino: [],
    via: [],
    destino: casa,
    velocidad: NORMAL,
    estado: "libre",
    globo: "",
    globoHasta: 0,
    ocioEn: ahora + 6000 + i * 3500,
  };
}

function ir(a: Actor, lugar: Lugar, alLlegar?: () => void, velocidad = NORMAL) {
  a.camino = ruta(a, a.via, lugar);
  a.velocidad = velocidad;
  a.via = lugar.via ?? [];
  a.destino = lugar;
  a.alLlegar = alLlegar;
  if (!a.camino.length) {
    a.mira = lugar.mira;
    a.alLlegar = undefined;
    alLlegar?.();
  }
}

function decir(a: Actor, texto: string, ms = 2600) {
  a.globo = texto;
  a.globoHasta = performance.now() + ms;
}

const enCasa = (a: Actor) => !a.camino.length && Math.abs(a.c - a.casa.c) < 0.02 && Math.abs(a.r - a.casa.r) < 0.02;

/**
 * La oficina viva: sienta a cada agente en su puesto, lo hace pasear cuando no hay junta
 * y, durante una junta, lo lleva a la sala, a su escritorio a trabajar y de vuelta.
 */
export function useOficinaViva(sentados: { agente: Agente; puesto: Puesto }[], junta: Junta | null, paso: number) {
  const actores = useRef(new Map<string, Actor>());
  const estado = useRef({ consultando: false, pantalla: PANTALLA_LIBRE, enJunta: false, reducido: false });
  const procesado = useRef<{ junta: Junta | null; paso: number }>({ junta: null, paso: 0 });
  const [escena, setEscena] = useState<Escena>({ actores: [], consultando: false, pantalla: PANTALLA_LIBRE, t: 0 });

  // Quién está: el líder siempre; el resto, según sus puestos.
  useEffect(() => {
    const mapa = actores.current;
    const ahora = performance.now();
    if (!mapa.has(LIDER.id)) mapa.set(LIDER.id, nuevoActor(LIDER, SILLA_LIDER, undefined, ahora, 0));
    const vigentes = new Set([LIDER.id]);
    sentados.forEach(({ agente, puesto }, i) => {
      vigentes.add(agente.id);
      const casa = sillaDe(centroDe(puesto));
      const actor = mapa.get(agente.id);
      if (!actor) mapa.set(agente.id, nuevoActor(agente, casa, puesto, ahora, i + 1));
      else if (actor.puesto?.id !== puesto.id) {
        actor.casa = casa;
        actor.puesto = puesto;
        if (!estado.current.enJunta) ir(actor, casa, () => decir(actor, "Puesto nuevo", 2000));
      }
    });
    for (const id of mapa.keys()) if (!vigentes.has(id)) mapa.delete(id);
  }, [sentados]);

  // La junta: cada paso nuevo mueve a la gente. Si se salta al final, se aplican todos seguidos.
  useEffect(() => {
    const mapa = actores.current;
    const e = estado.current;
    const lider = mapa.get(LIDER.id);
    const previo = procesado.current;

    if (!junta) {
      if (previo.junta) {
        e.enJunta = false;
        e.consultando = false;
        e.pantalla = PANTALLA_LIBRE;
        const ahora = performance.now();
        for (const a of mapa.values()) {
          a.estado = "libre";
          a.ocioEn = ahora + 10000 + Math.random() * 8000;
          ir(a, a.casa);
        }
      }
      procesado.current = { junta: null, paso: 0 };
      return;
    }

    const asiento = (id: string) => (id === LIDER.id ? CABECERA : (ASIENTOS[junta.asistentes.indexOf(id)] ?? ASIENTOS[0]));
    const aplicar = (p: Paso) => {
      if (p.tipo === "convoca") {
        e.enJunta = true;
        e.pantalla = [`Caso: ${junta.caso.alumno}`];
        for (const a of mapa.values()) {
          if (a.agente.id !== LIDER.id && !junta.asistentes.includes(a.agente.id)) continue;
          a.estado = "esperando";
          a.globo = "";
          ir(a, asiento(a.agente.id), undefined, AGIL);
        }
        if (lider) decir(lider, "¡A la sala!");
      } else if (p.tipo === "delega") {
        const a = mapa.get(p.encargo.agente);
        const nombre = agentePorId(p.encargo.agente)?.nombre ?? "";
        if (p.presente && a) {
          if (lider) decir(lider, `${nombre}: ${p.encargo.titulo.toLowerCase()}`, 1500);
          decir(a, "Entendido", 1500);
          e.pantalla = [...e.pantalla, `${nombre}: ${p.encargo.titulo}`];
        } else {
          if (lider) decir(lider, `Nos falta ${nombre}`, 1500);
          e.pantalla = [...e.pantalla, `${p.encargo.titulo}: sin cubrir`];
        }
      } else if (p.tipo === "trabajan") {
        e.consultando = true;
        if (lider) decir(lider, "Consulten la base de datos", 2200);
        // Cada uno consulta desde su silla en la sala: nadie se levanta.
        for (const otro of junta.guion) {
          if (otro.tipo !== "delega" || !otro.presente) continue;
          const a = mapa.get(otro.encargo.agente);
          if (a) a.estado = "trabajando";
        }
      } else if (p.tipo === "informa") {
        const a = mapa.get(p.encargo.agente);
        if (a) {
          a.estado = "listo";
          decir(a, `Listo: ${p.encargo.titulo.toLowerCase()}`, 1800);
        }
        e.consultando = [...mapa.values()].some((x) => x.estado === "trabajando");
      } else {
        e.consultando = false;
        e.pantalla = [...e.pantalla, `Decisión: ${junta.caso.decision.titulo}`];
        if (lider) {
          lider.estado = "listo";
          decir(lider, "¡Decidido!", 5000);
        }
      }
    };

    const desde = previo.junta === junta ? previo.paso : 0;
    for (let i = desde; i < paso; i++) aplicar(junta.guion[i]);
    procesado.current = { junta, paso };
  }, [junta, paso]);

  // Bucle: avanza a cada uno y publica una foto de la escena para dibujarla.
  useEffect(() => {
    const e = estado.current;
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    e.reducido = consulta.matches;
    const alCambiar = () => (e.reducido = consulta.matches);
    consulta.addEventListener("change", alCambiar);

    const avanzar = (a: Actor, dt: number) => {
      if (!a.camino.length) return;
      if (e.reducido) {
        const fin = a.camino.at(-1)!;
        a.c = fin.c;
        a.r = fin.r;
        a.camino = [];
      } else {
        const p = a.camino[0];
        const dc = p.c - a.c;
        const dr = p.r - a.r;
        const d = Math.hypot(dc, dr);
        const paso = a.velocidad * dt;
        a.mira = Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? "c+" : "c-") : dr > 0 ? "r+" : "r-";
        if (d > paso) {
          a.c += (dc / d) * paso;
          a.r += (dr / d) * paso;
          return;
        }
        a.c = p.c;
        a.r = p.r;
        a.camino.shift();
        if (a.camino.length) return;
      }
      a.mira = a.destino.mira;
      const alLlegar = a.alLlegar;
      a.alLlegar = undefined;
      alLlegar?.();
    };

    // Sin junta, cada uno hace su vida: una serie, la ventana, los servidores o de vuelta al escritorio.
    const ocio = (a: Actor, ahora: number) => {
      if (e.enJunta || e.reducido || a.camino.length || ahora < a.ocioEn) return;
      // Sin prisa: salen de vez en cuando, caminan despacio y se quedan un rato.
      a.ocioEn = ahora + 16000 + Math.random() * 16000;
      const rato = RATOS_LIBRES[Math.floor(Math.random() * (RATOS_LIBRES.length + 3))];
      if (!rato) {
        if (!enCasa(a)) ir(a, a.casa, () => decir(a, "De vuelta al escritorio", 2000), PASEO);
        return;
      }
      // Si el sitio ya está ocupado, se queda donde está.
      const ocupado = [...actores.current.values()].some((o) => o !== a && Math.hypot(o.destino.c - rato.c, o.destino.r - rato.r) < 0.5);
      if (!ocupado) ir(a, rato, () => decir(a, rato.texto, 3000), PASEO);
    };

    let cuadro = 0;
    let anterior = performance.now();
    let publicado = 0;
    const vuelta = (ahora: number) => {
      const dt = Math.min(0.1, (ahora - anterior) / 1000);
      anterior = ahora;
      const lista = [...actores.current.values()];
      for (const a of lista) {
        avanzar(a, dt);
        ocio(a, ahora);
        if (a.globo && ahora > a.globoHasta) a.globo = "";
      }
      // ~30 cuadros por segundo bastan para el SVG.
      if (ahora - publicado > 33) {
        publicado = ahora;
        setEscena({
          t: ahora,
          consultando: e.consultando,
          pantalla: e.pantalla,
          actores: lista.map((a) => {
            const caminando = a.camino.length > 0;
            const casa = enCasa(a);
            return {
              agente: a.agente,
              puesto: a.puesto?.id,
              c: a.c,
              r: a.r,
              mira: a.mira,
              caminando,
              velocidad: a.velocidad,
              sentado: !caminando && Boolean(a.destino.sentado),
              trabajando: a.estado === "trabajando",
              enCasa: casa,
              estado: a.estado,
              globo: a.globo,
            };
          }),
        });
      }
      cuadro = requestAnimationFrame(vuelta);
    };
    cuadro = requestAnimationFrame(vuelta);
    return () => {
      cancelAnimationFrame(cuadro);
      consulta.removeEventListener("change", alCambiar);
    };
  }, []);

  /** Saludo al tocar a un agente (fuera de una junta). */
  const saludar = (id: string) => {
    const a = actores.current.get(id);
    if (a && !estado.current.enJunta && !a.globo) decir(a, `Hola, soy ${a.agente.nombre}`);
  };

  return { escena, saludar };
}
