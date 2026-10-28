"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { APARECE, useBucle } from "@/components/ui/movimiento";
import { Maximize, Plus, ZoomIn, ZoomOut } from "lucide-react";
import { LIDER, type Agente } from "@/lib/agentes/catalogo";
import {
  ANCHO_MESA_LIDER,
  BASE_DATOS,
  CABECERA,
  MESA_JUNTAS,
  OFICINA_LIDER,
  PUESTOS,
  SILLAS_FONDO,
  SILLAS_FRENTE,
  SILLA_LIDER,
  centroDe,
  sillaDe,
  type Escena,
  type Punto,
  type VistaActor,
} from "./movimiento";

/* ---------- Geometría isométrica ---------- */

const ANCHO = 96; // ancho de una baldosa en pantalla
const ALTO = 48; // alto (2:1)
const COLUMNAS = 12;
const FILAS = 10;
const ALTO_MURO = 100;

type Pantalla = { x: number; y: number };

/** Punto (c, r) del piso en coordenadas de pantalla. */
const iso = (c: number, r: number): Pantalla => ({ x: ((c - r) * ANCHO) / 2, y: ((c + r) * ALTO) / 2 });
const puntos = (...ps: Pantalla[]) => ps.map((p) => `${p.x},${p.y}`).join(" ");
const subir = (p: Pantalla, h: number): Pantalla => ({ x: p.x, y: p.y - h });
const rombo = (c: number, r: number, dc: number, dr: number) => puntos(iso(c, r), iso(c + dc, r), iso(c + dc, r + dr), iso(c, r + dr));

type EstadoMonitor = "apagado" | "libre" | "trabajando" | "listo";

/** Marco completo del plano (zoom 1). */
const MARCO = (() => {
  const x = iso(0, FILAS).x - 16;
  const y = iso(0, 0).y - ALTO_MURO - 24;
  return { x, y, w: iso(COLUMNAS, 0).x - x + 16, h: iso(COLUMNAS, FILAS).y - y + 30 };
})();
const ZOOM_MAX = 3.5;
type Vista = { z: number; cx: number; cy: number };
const VISTA_INICIAL: Vista = { z: 1, cx: MARCO.x + MARCO.w / 2, cy: MARCO.y + MARCO.h / 2 };
const CENTRO_SALA = subir(iso(9.5, 2.6), 30);

/** Mantiene el encuadre dentro del plano. */
function limitar(v: Vista): Vista {
  const z = Math.min(ZOOM_MAX, Math.max(1, v.z));
  const medioW = MARCO.w / (2 * z);
  const medioH = MARCO.h / (2 * z);
  return {
    z,
    cx: Math.min(MARCO.x + MARCO.w - medioW, Math.max(MARCO.x + medioW, v.cx)),
    cy: Math.min(MARCO.y + MARCO.h - medioH, Math.max(MARCO.y + medioH, v.cy)),
  };
}
const encuadre = (v: Vista) => ({ x: v.cx - MARCO.w / (2 * v.z), y: v.cy - MARCO.h / (2 * v.z), w: MARCO.w / v.z, h: MARCO.h / v.z });

/** Acerca o aleja manteniendo fijo el punto `foco` (por defecto, el centro). */
function escalar(v: Vista, factor: number, foco?: Pantalla): Vista {
  const z = Math.min(ZOOM_MAX, Math.max(1, v.z * factor));
  if (!foco) return limitar({ ...v, z });
  return limitar({ z, cx: foco.x - ((foco.x - v.cx) * v.z) / z, cy: foco.y - ((foco.y - v.cy) * v.z) / z });
}

/* ---------- Plano ---------- */

export function Plano({
  escena,
  puestos,
  seleccionado,
  enJunta,
  minuto,
  alPuesto,
  alAgente,
}: {
  escena: Escena;
  /** Minutos desde la medianoche (hora local), o null antes de hidratar. */
  minuto: number | null;
  /** puesto → agente */
  puestos: Record<string, string>;
  seleccionado: string | null;
  enJunta: boolean;
  /** Puesto tocado (o "lider" para su oficina). */
  alPuesto: (puesto: string) => void;
  alAgente: (id: string) => void;
}) {
  const [a, b, c, d] = [iso(0, 0), iso(COLUMNAS, 0), iso(COLUMNAS, FILAS), iso(0, FILAS)];
  const { actores, t } = escena;
  const svg = useRef<SVGSVGElement>(null);
  const [vista, setVista] = useState(VISTA_INICIAL);
  const arrastre = useRef<{ x: number; y: number; cx: number; cy: number; movido: boolean } | null>(null);
  const tragarClic = useRef(false);

  // Al empezar una junta con el plano ampliado, se lleva la vista a la sala.
  const [juntaPrevia, setJuntaPrevia] = useState(enJunta);
  if (enJunta !== juntaPrevia) {
    setJuntaPrevia(enJunta);
    if (enJunta && vista.z > 1) setVista(limitar({ z: vista.z, cx: CENTRO_SALA.x, cy: CENTRO_SALA.y }));
  }

  // Pellizco del trackpad (o Ctrl + rueda): acerca hacia el puntero. Sin Ctrl, la rueda desplaza la página.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const alRodar = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const caja = el.getBoundingClientRect();
      setVista((v) => {
        const vb = encuadre(v);
        const foco = { x: vb.x + ((e.clientX - caja.left) / caja.width) * vb.w, y: vb.y + ((e.clientY - caja.top) / caja.height) * vb.h };
        return escalar(v, Math.exp(-e.deltaY * 0.01), foco);
      });
    };
    el.addEventListener("wheel", alRodar, { passive: false });
    return () => el.removeEventListener("wheel", alRodar);
  }, []);

  const vb = encuadre(vista);
  const deAgente = (id?: string) => actores.find((v) => v.agente.id === id);
  const monitor = (v?: VistaActor): EstadoMonitor =>
    !v ? "apagado" : v.enCasa ? (v.trabajando ? "trabajando" : "libre") : v.estado === "listo" ? "listo" : "apagado";

  // Todo lo que tiene altura se ordena por profundidad (c + r): lo cercano tapa lo lejano.
  const objetos: { clave: number; nodo: ReactNode }[] = [];
  const poner = (clave: number, nodo: ReactNode) => objetos.push({ clave, nodo });

  for (const p of PUESTOS) {
    const centro = centroDe(p);
    const silla = sillaDe(centro);
    const ocupante = deAgente(puestos[p.id]);
    poner(silla.c + silla.r - 0.05, <Silla key={`s${p.id}`} punto={silla} />);
    poner(
      centro.c + centro.r,
      <Escritorio
        key={p.id}
        centro={centro}
        silla={silla}
        etiqueta={ocupante ? `Puesto ${p.numero}: ${ocupante.agente.nombre}` : `Puesto ${p.numero} libre: sentar a un agente`}
        ocupado={Boolean(puestos[p.id])}
        monitor={monitor(ocupante)}
        deshabilitado={enJunta}
        alAbrir={() => alPuesto(p.id)}
      />,
    );
  }
  poner(SILLA_LIDER.c + SILLA_LIDER.r - 0.05, <Silla key="slider" punto={SILLA_LIDER} />);
  poner(
    OFICINA_LIDER.c + OFICINA_LIDER.r,
    <Escritorio
      key="lider"
      centro={OFICINA_LIDER}
      silla={SILLA_LIDER}
      ancho={ANCHO_MESA_LIDER}
      etiqueta="Oficina del líder"
      ocupado
      monitor={monitor(deAgente(LIDER.id))}
      deshabilitado={enJunta}
      alAbrir={() => alPuesto(LIDER.id)}
      dosPantallas
    />,
  );

  // Sala de juntas: sillas del fondo, mesa, respaldos de las sillas del frente y la cabecera.
  for (const s of SILLAS_FONDO) poner(s.c + s.r - 0.05, <Silla key={`f${s.c}`} punto={s} />);
  poner(MESA_JUNTAS.c + MESA_JUNTAS.dc / 2 + MESA_JUNTAS.r + MESA_JUNTAS.dr / 2 + 0.02, <MesaJuntas key="mesa" conPapeles={enJunta} />);
  for (const s of SILLAS_FRENTE) poner(s.c + s.r + 0.05, <Respaldo key={`r${s.c}`} punto={s} />);
  poner(CABECERA.c + CABECERA.r - 0.05, <Silla key="cabecera" punto={CABECERA} />);
  poner(14.3, <Vidrio key="vidrio" desde={iso(8, 5)} hasta={iso(12, 5)} />);

  // Servidores y base de datos
  [7.15, 8.05, 8.95].forEach((r, i) => poner(0.47 + r + 0.4, <Rack key={`rack${r}`} r={r} activo={escena.consultando} desfase={i} />));
  poner(BASE_DATOS.c + BASE_DATOS.r, <BaseDeDatos key="bd" activo={escena.consultando} />);

  // Gimnasio
  poner(10.2 + 6.7, <Banco key="banco" />);
  poner(18, <Jaula key="jaula-fondo" parte="fondo" />);
  poner(19, <Jaula key="jaula-frente" parte="frente" />);
  poner(11.45 + 7.05, <Mancuernero key="mancuernas" />);
  poner(18.3, <PesasRusas key="pesas" />);

  // Plantas
  for (const [pc, pr, tipo] of PLANTAS) poner(pc + pr, <Planta key={`pl${pc}-${pr}`} c={pc} r={pr} tipo={tipo} />);

  // Agentes
  for (const v of actores)
    poner(v.c + v.r + 0.01, <Personaje key={`agente-${v.agente.id}`} v={v} t={t} seleccionado={v.agente.id === seleccionado} alTocar={() => alAgente(v.agente.id)} />);

  objetos.sort((p, q) => p.clave - q.clave);

  const consultando = actores.filter((v) => v.trabajando);

  return (
    <div className="relative">
    <svg
      ref={svg}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className={`mx-auto block h-auto w-full select-none ${vista.z > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
      // Ampliado, arrastrar mueve el plano; sin zoom, el dedo sigue desplazando la página.
      style={{ touchAction: vista.z > 1 ? "none" : "pan-y" }}
      role="group"
      aria-label="Plano de la oficina"
      onPointerDown={(e) => {
        if (e.button !== 0 || vista.z === 1) return;
        arrastre.current = { x: e.clientX, y: e.clientY, cx: vista.cx, cy: vista.cy, movido: false };
      }}
      onPointerMove={(e) => {
        const ar = arrastre.current;
        if (!ar) return;
        const dx = e.clientX - ar.x;
        const dy = e.clientY - ar.y;
        if (!ar.movido && Math.hypot(dx, dy) < 5) return;
        if (!ar.movido) e.currentTarget.setPointerCapture(e.pointerId);
        ar.movido = true;
        const escala = vb.w / e.currentTarget.getBoundingClientRect().width;
        setVista((v) => limitar({ z: v.z, cx: ar.cx - dx * escala, cy: ar.cy - dy * escala }));
      }}
      onPointerUp={() => {
        // Si fue un arrastre, el clic que viene después no debe abrir un puesto.
        tragarClic.current = Boolean(arrastre.current?.movido);
        arrastre.current = null;
      }}
      onPointerCancel={() => (arrastre.current = null)}
      onClickCapture={(e) => {
        if (!tragarClic.current) return;
        tragarClic.current = false;
        e.stopPropagation();
      }}
    >
      {/* Muros del fondo y lo que cuelga en ellos */}
      <polygon points={puntos(a, b, subir(b, ALTO_MURO), subir(a, ALTO_MURO))} fill="var(--iso-muro-a)" />
      <polygon points={puntos(a, d, subir(d, ALTO_MURO), subir(a, ALTO_MURO))} fill="var(--iso-muro-b)" />
      <Ventanas />
      <Reloj minuto={minuto} />
      <Pizarra />
      <PantallaSala lineas={escena.pantalla} />

      {/* Piso: oficina abierta, alfombra de la sala, caucho del gimnasio y piso técnico de los datos */}
      <polygon points={puntos(a, b, c, d)} fill="var(--iso-piso)" />
      <Rejilla c={0} r={0} dc={COLUMNAS} dr={FILAS} paso={1} />
      <polygon points={rombo(7, 0, 5, 5)} fill="var(--iso-alfombra)" />
      <polygon points={rombo(7, 6, 5, 4)} fill="var(--iso-goma)" />
      <Rejilla c={7} r={6} dc={5} dr={4} paso={0.5} />
      <polygon points={rombo(0, 7, 3.2, 3)} fill="var(--iso-tecnico)" />
      <Rejilla c={0} r={7} dc={3.2} dr={3} paso={0.4} />
      <polygon points={rombo(3.8, 7.3, 2, 2)} fill="var(--iso-alfombra)" />
      <polygon points={rombo(7.6, 8.4, 1.1, 1)} fill="var(--iso-tapete)" />
      {/* Mampara lateral de la sala (detrás de todo lo que hay dentro) */}
      <Vidrio desde={iso(7, 0)} hasta={iso(7, 5)} />

      {objetos.map((o) => o.nodo)}

      {/* Encima de todo: nombres, globos y la consulta a la base de datos */}
      {PUESTOS.filter((p) => !puestos[p.id]).map((p) => (
        <Placa key={p.id} en={iso(centroDe(p).c, centroDe(p).r)} texto="Libre" tenue alTocar={enJunta ? undefined : () => alPuesto(p.id)} />
      ))}
      {actores.map((v) => {
        // Sentado en su escritorio, el nombre va bajo la mesa; si no, bajo los pies.
        const centro = v.enCasa ? (v.agente.id === LIDER.id ? OFICINA_LIDER : v.puesto ? centroDe(PUESTOS.find((p) => p.id === v.puesto)!) : null) : null;
        const en = centro ? iso(centro.c, centro.r) : { x: iso(v.c, v.r).x, y: iso(v.c, v.r).y - 14 };
        return <Placa key={v.agente.id} en={en} texto={v.agente.nombre} seleccionado={v.agente.id === seleccionado} alTocar={() => alAgente(v.agente.id)} />;
      })}
      {escena.consultando && consultando.map((v) => <FlujoDatos key={v.agente.id} hacia={{ x: iso(v.c, v.r).x, y: coronilla(v) + 4 }} />)}
      {actores.map((v) => {
        const texto = v.globo || (v.trabajando ? "…" : "");
        return texto ? <Globo key={v.agente.id} v={v} texto={texto} /> : null;
      })}
    </svg>

    <div className="absolute right-2 bottom-2 flex items-center gap-0.5 rounded-full bg-superficie/90 p-1 ring-1 ring-linea">
      <BotonZoom etiqueta="Alejar" disabled={vista.z <= 1} onClick={() => setVista((v) => escalar(v, 1 / 1.4))}>
        <ZoomOut aria-hidden className="size-4" />
      </BotonZoom>
      <span className="cifra w-11 text-center text-xs text-tenue" aria-live="polite">
        {Math.round(vista.z * 100)} %
      </span>
      <BotonZoom etiqueta="Acercar" disabled={vista.z >= ZOOM_MAX} onClick={() => setVista((v) => escalar(v, 1.4))}>
        <ZoomIn aria-hidden className="size-4" />
      </BotonZoom>
      <BotonZoom etiqueta="Ver toda la oficina" disabled={vista.z === 1} onClick={() => setVista(VISTA_INICIAL)}>
        <Maximize aria-hidden className="size-4" />
      </BotonZoom>
    </div>
    </div>
  );
}

function BotonZoom({ etiqueta, children, ...props }: React.ComponentProps<"button"> & { etiqueta: string }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      className="grid size-8 place-items-center rounded-full text-grafito transition-colors hover:bg-hueso hover:text-tinta disabled:opacity-40 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------- Piezas básicas ---------- */

/** Caja isométrica: tapa, cara izquierda (mira a +r) y cara derecha (mira a +c). */
function Caja({
  c,
  r,
  dc,
  dr,
  h,
  z = 0,
  tope = "var(--iso-tope)",
  izq = "var(--iso-izq)",
  der = "var(--iso-der)",
}: {
  c: number;
  r: number;
  dc: number;
  dr: number;
  h: number;
  z?: number;
  tope?: string;
  izq?: string;
  der?: string;
}) {
  const [n, e, s, o] = [iso(c, r), iso(c + dc, r), iso(c + dc, r + dr), iso(c, r + dr)];
  const arriba = z + h;
  return (
    <g>
      <polygon points={puntos(subir(o, arriba), subir(s, arriba), subir(s, z), subir(o, z))} fill={izq} />
      <polygon points={puntos(subir(e, arriba), subir(s, arriba), subir(s, z), subir(e, z))} fill={der} />
      <polygon points={puntos(subir(n, arriba), subir(e, arriba), subir(s, arriba), subir(o, arriba))} fill={tope} />
    </g>
  );
}

function Rejilla({ c, r, dc, dr, paso }: { c: number; r: number; dc: number; dr: number; paso: number }) {
  const lineas: [Pantalla, Pantalla][] = [];
  for (let i = paso; i < dc - 0.001; i += paso) lineas.push([iso(c + i, r), iso(c + i, r + dr)]);
  for (let i = paso; i < dr - 0.001; i += paso) lineas.push([iso(c, r + i), iso(c + dc, r + i)]);
  return (
    <g className="stroke-linea" strokeWidth={1}>
      {lineas.map(([p, q], i) => (
        <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />
      ))}
    </g>
  );
}

function Placa({
  en,
  texto,
  tenue = false,
  seleccionado = false,
  alTocar,
}: {
  en: Pantalla;
  texto: string;
  tenue?: boolean;
  seleccionado?: boolean;
  alTocar?: () => void;
}) {
  const ancho = texto.length * 6.4 + 20;
  const base = en.y + 23;
  return (
    // El foco lo llevan los escritorios; la placa solo amplía la zona clicable.
    <g aria-hidden onClick={alTocar} className={alTocar ? "cursor-pointer" : undefined}>
      <rect x={en.x - ancho / 2} y={base} width={ancho} height={20} rx={10} className={seleccionado ? "fill-tinta" : "fill-hueso"} />
      <text x={en.x} y={base + 14} textAnchor="middle" fontSize={11} className={seleccionado ? "fill-sobre-tinta" : tenue ? "fill-tenue" : "fill-tinta"}>
        {texto}
      </text>
    </g>
  );
}

/* ---------- Personajes ---------- */

/** Altura de la coronilla sobre los pies (sentado, el cuerpo baja). */
const coronilla = (v: VistaActor) => {
  const { peinado, accesorio } = v.agente.apariencia;
  const extra = accesorio === "corona" ? 8 : peinado === "rizado" || peinado === "mono" ? 6 : 0;
  return iso(v.c, v.r).y + (v.sentado ? 10 : 0) - 68 - extra;
};

/** Agente con su camiseta, su piel, su peinado y su detalle: camina (piernas alternas), se sienta y mira hacia donde va. */
function Personaje({ v, t, seleccionado, alTocar }: { v: VistaActor; t: number; seleccionado: boolean; alTocar: () => void }) {
  const { x, y } = iso(v.c, v.r);
  const { apariencia: ap, tinte, icono: Icono } = v.agente;
  const cara = v.mira === "frente" || v.mira === "c+" || v.mira === "r+";
  const ojo = v.mira === "c+" ? 2.5 : v.mira === "r+" ? -2.5 : 0;
  // Paso tranquilo cuando pasean, rápido cuando van a una junta.
  const zancada = v.caminando ? Math.floor(t / (v.velocidad > 2 ? 170 : 320)) % 2 : 0;
  const yb = y + (v.sentado ? 10 : v.caminando ? -zancada : 0);
  const hombro = ap.fornido ? 17 : 14;
  const hy = yb - 56;

  return (
    <g aria-hidden onClick={alTocar} className="cursor-pointer">
      {!v.sentado && <ellipse cx={x} cy={y} rx={12} ry={5} fill="#000" opacity={0.22} />}
      {seleccionado && !v.sentado && <ellipse cx={x} cy={y} rx={17} ry={7.5} fill="none" strokeWidth={2} className="stroke-acento" />}
      {!v.sentado && (
        <>
          <rect x={x - 8} y={yb - 22} width={6} height={22 - (zancada ? 4 : 0)} rx={2} fill="#3a3f4b" />
          <rect x={x + 2} y={yb - 22} width={6} height={22 - (zancada ? 0 : v.caminando ? 4 : 0)} rx={2} fill="#3a3f4b" />
        </>
      )}
      <path d={`M ${x - hombro} ${yb - 18} V ${yb - 42} a ${hombro} ${hombro * 0.8} 0 0 1 ${hombro * 2} 0 V ${yb - 18} z`} fill={tinte} />
      {cara && <Icono x={x - 7} y={yb - 38} width={14} height={14} color="#1e1e2a" strokeWidth={2} aria-hidden />}
      {cara && ap.accesorio === "silbato" && (
        <>
          <path d={`M ${x - 4} ${yb - 45} L ${x - 9} ${yb - 33}`} stroke="#1e1e2a" strokeWidth={0.8} />
          <rect x={x - 13} y={yb - 34} width={7} height={4} rx={1.5} fill="#c0c6ce" />
        </>
      )}
      <Peinado ap={ap} x={x} hy={hy} cara={cara} capa="detras" />
      <circle cx={x} cy={hy} r={11} fill={ap.piel} />
      {cara && (
        <>
          <circle cx={x - 4 + ojo} cy={hy - 1} r={1.4} fill="#1e1e2a" />
          <circle cx={x + 4 + ojo} cy={hy - 1} r={1.4} fill="#1e1e2a" />
          <path d={`M ${x - 3.5 + ojo} ${hy + 4} q 3.5 2.5 7 0`} stroke="#1e1e2a" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          {ap.accesorio === "gafas" && (
            <g fill="none" stroke="#1e1e2a" strokeWidth={1.1}>
              <circle cx={x - 4 + ojo} cy={hy - 1} r={3.3} />
              <circle cx={x + 4 + ojo} cy={hy - 1} r={3.3} />
              <path d={`M ${x - 0.7 + ojo} ${hy - 1} h 1.4`} />
            </g>
          )}
        </>
      )}
      <Peinado ap={ap} x={x} hy={hy} cara={cara} capa="delante" />
      {ap.accesorio === "cinta" && <rect x={x - 11.5} y={hy - 7} width={23} height={3.5} rx={1} fill="#d9534f" />}
      {ap.accesorio === "audifonos" && (
        <g fill="#2a2a33">
          <path d={`M ${x - 12} ${hy} a 12 12 0 0 1 24 0`} fill="none" stroke="#2a2a33" strokeWidth={2.5} />
          <rect x={x - 14.5} y={hy - 3} width={4.5} height={8} rx={1.5} />
          <rect x={x + 10} y={hy - 3} width={4.5} height={8} rx={1.5} />
          {cara && <path d={`M ${x + 11} ${hy + 4} Q ${x + 9} ${hy + 8} ${x + 4 + ojo} ${hy + 7}`} fill="none" stroke="#2a2a33" strokeWidth={1.2} />}
        </g>
      )}
      {ap.accesorio === "corona" && (
        <polygon
          points={puntos(
            { x: x - 7, y: hy - 10 },
            { x: x - 7.5, y: hy - 17 },
            { x: x - 3.5, y: hy - 13.5 },
            { x, y: hy - 19 },
            { x: x + 3.5, y: hy - 13.5 },
            { x: x + 7.5, y: hy - 17 },
            { x: x + 7, y: hy - 10 },
          )}
          fill="#e2b766"
          stroke="#b8893a"
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
      )}
      {seleccionado && v.sentado && <circle cx={x} cy={hy} r={14.5} fill="none" strokeWidth={2} className="stroke-acento" />}
    </g>
  );
}

const GORRA = "#2f6f6a";

/** El pelo en dos capas: lo que queda detrás de la cabeza y lo que va encima. */
function Peinado({ ap, x, hy, cara, capa }: { ap: Agente["apariencia"]; x: number; hy: number; cara: boolean; capa: "detras" | "delante" }) {
  const pelo = ap.pelo;
  const casquete = (color: string, alto = 6) => <path d={`M ${x - 11.5} ${hy - 1} a 11.5 11.5 0 0 1 23 0 q -11.5 ${-alto} -23 0 z`} fill={color} />;
  const nuca = <circle cx={x} cy={hy - 0.5} r={11.2} fill={pelo} />;

  if (capa === "detras") {
    if (ap.peinado === "largo") return <rect x={x - 12.5} y={hy - 2} width={25} height={cara ? 16 : 18} rx={5} fill={pelo} />;
    if (ap.peinado === "rizado")
      return (
        <g fill={pelo}>
          {[
            [-10, -3],
            [-7, -9],
            [0, -12],
            [7, -9],
            [10, -3],
            [-11, 4],
            [11, 4],
          ].map(([dx, dy]) => (
            <circle key={`${dx},${dy}`} cx={x + dx} cy={hy + dy} r={6.5} />
          ))}
        </g>
      );
    if (ap.peinado === "cola") return cara ? <circle cx={x + 12} cy={hy + 1} r={5} fill={pelo} /> : null;
    if (ap.peinado === "mono") return <circle cx={x} cy={hy - 12.5} r={5.5} fill={pelo} />;
    return null;
  }

  if (!cara) {
    if (ap.peinado === "gorra")
      return (
        <g>
          {nuca}
          {casquete(GORRA, 2)}
        </g>
      );
    if (ap.peinado === "cola")
      return (
        <g fill={pelo}>
          {nuca}
          <ellipse cx={x} cy={hy + 11} rx={4} ry={6} />
        </g>
      );
    return <g opacity={ap.peinado === "rapado" ? 0.85 : 1}>{nuca}</g>;
  }
  if (ap.peinado === "rapado") return <g opacity={0.9}>{casquete(pelo, 2.5)}</g>;
  if (ap.peinado === "gorra")
    return (
      <g>
        {casquete(GORRA, 3)}
        <ellipse cx={x} cy={hy - 2} rx={12.5} ry={2.8} fill="#24524e" />
      </g>
    );
  return casquete(pelo);
}

/** Globo sobre la cabeza: lo que dice, o puntos mientras trabaja. */
function Globo({ v, texto }: { v: VistaActor; texto: string }) {
  const { x } = iso(v.c, v.r);
  const base = coronilla(v) - 8;
  const puntos3 = texto === "…";
  const ancho = puntos3 ? 30 : Math.min(180, texto.length * 6.1 + 18);
  return (
    <motion.g {...APARECE} aria-hidden>
      <rect x={x - ancho / 2} y={base - 20} width={ancho} height={20} rx={10} className="fill-superficie stroke-linea-fuerte" strokeWidth={1} />
      <path d={`M ${x - 4} ${base - 1} l 4 6 l 4 -6`} className="fill-superficie" />
      {puntos3 ? (
        [-6, 0, 6].map((dx, i) => <Luz key={dx} cx={x + dx} cy={base - 10} className="fill-tinta" suave retraso={i * 0.16} />)
      ) : (
        <text x={x} y={base - 6} textAnchor="middle" fontSize={11} className="fill-tinta">
          {texto}
        </text>
      )}
    </motion.g>
  );
}

/**
 * Luz de 1,8 px que late: a saltos como un LED, o `suave` como los puntos de "escribiendo".
 * `retraso` (s) desfasa luces vecinas para que no parpadeen al unísono.
 */
function Luz({ cx, cy, className, suave = false, retraso = 0 }: { cx: number; cy: number; className: string; suave?: boolean; retraso?: number }) {
  const bucle = useBucle();
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={1.8}
      className={className}
      animate={bucle ? (suave ? { opacity: [1, 0.25, 1] } : { opacity: [1, 1, 0.25, 0.25] }) : undefined}
      transition={
        suave
          ? { duration: 1, repeat: Infinity, ease: "easeInOut", delay: retraso }
          : { duration: 1.8, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1], delay: retraso }
      }
    />
  );
}

/* ---------- Muebles ---------- */

function Silla({ punto }: { punto: Punto }) {
  const { x, y } = iso(punto.c, punto.r);
  return <rect x={x - 17} y={y - 50} width={34} height={44} rx={9} fill="var(--iso-silla)" aria-hidden />;
}

/** Respaldo de una silla vista desde atrás: tapa el cuerpo de quien se sienta, deja ver hombros y cabeza. */
function Respaldo({ punto }: { punto: Punto }) {
  const { x, y } = iso(punto.c, punto.r);
  return <rect x={x - 16} y={y - 36} width={32} height={34} rx={9} fill="var(--iso-silla)" aria-hidden />;
}

function Escritorio({
  centro,
  silla,
  ancho = 0.72,
  etiqueta,
  ocupado,
  monitor,
  deshabilitado,
  alAbrir,
  dosPantallas = false,
}: {
  centro: Punto;
  silla: Punto;
  ancho?: number;
  etiqueta: string;
  ocupado: boolean;
  monitor: EstadoMonitor;
  deshabilitado: boolean;
  alAbrir: () => void;
  dosPantallas?: boolean;
}) {
  const { x, y } = iso(centro.c, centro.r);
  const asiento = iso(silla.c, silla.r);
  const h = 20;
  const luz = (cx: number) =>
    monitor === "apagado" ? null : (
      monitor === "trabajando" ? (
        <Luz cx={cx} cy={y - h - 22} className="fill-acento" />
      ) : (
        <circle cx={cx} cy={y - h - 22} r={1.8} className={monitor === "listo" ? "fill-tinta" : "fill-linea-fuerte"} />
      )
    );

  return (
    <g
      role="button"
      tabIndex={deshabilitado ? -1 : 0}
      aria-label={etiqueta}
      aria-disabled={deshabilitado || undefined}
      onClick={deshabilitado ? undefined : alAbrir}
      onKeyDown={(e) => {
        if (!deshabilitado && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          alAbrir();
        }
      }}
      className={`group outline-none ${deshabilitado ? "" : "cursor-pointer"}`}
    >
      {/* Baldosa: filo al pasar, cobalto con el foco */}
      <polygon
        points={rombo(centro.c - 0.5, centro.r - 0.5, 1, 1)}
        fill="transparent"
        strokeWidth={2}
        strokeDasharray={ocupado ? undefined : "5 4"}
        className={`transition-colors ${deshabilitado ? "stroke-transparent" : "stroke-transparent group-hover:stroke-linea-fuerte group-focus-visible:stroke-acento"}`}
      />

      {!ocupado && !deshabilitado && (
        <g className="opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <circle cx={asiento.x} cy={asiento.y - 66} r={13} className="fill-hueso stroke-linea-fuerte" strokeWidth={1} />
          <Plus x={asiento.x - 8} y={asiento.y - 74} width={16} height={16} className="text-tinta" aria-hidden />
        </g>
      )}

      <Caja c={centro.c - ancho / 2} r={centro.r - 0.36} dc={ancho} dr={0.72} h={h} />

      {/* Monitores (los vemos por detrás, con su luz) y taza */}
      <rect x={x + 10} y={y - h - 26} width={24} height={17} rx={2} fill="var(--iso-pantalla)" />
      <rect x={x + 19} y={y - h - 10} width={6} height={5} fill="var(--iso-pantalla)" />
      {luz(x + 30)}
      {dosPantallas && (
        <>
          <rect x={x + 36} y={y - h - 14} width={20} height={14} rx={2} fill="var(--iso-pantalla)" />
        </>
      )}
      <rect x={x - 26} y={y - h - 7} width={7} height={8} rx={1.5} fill="var(--iso-izq)" />
    </g>
  );
}

function MesaJuntas({ conPapeles }: { conPapeles: boolean }) {
  const m = MESA_JUNTAS;
  return (
    <g aria-hidden>
      <Caja c={m.c} r={m.r} dc={m.dc} dr={m.dr} h={22} tope="var(--iso-mesa)" />
      {conPapeles &&
        [8.5, 9.5, 10.5].map((c) => {
          const p = subir(iso(c, 2.6), 22);
          return (
            <motion.polygon
              key={c}
              {...APARECE}
              points={puntos(p, { x: p.x + 9, y: p.y + 4.5 }, { x: p.x, y: p.y + 9 }, { x: p.x - 9, y: p.y + 4.5 })}
              fill="var(--iso-tope)"
              style={{ opacity: 0.9 }}
            />
          );
        })}
    </g>
  );
}

function Vidrio({ desde, hasta }: { desde: Pantalla; hasta: Pantalla }) {
  const alto = 62;
  return (
    <g aria-hidden>
      <polygon points={puntos(desde, hasta, subir(hasta, alto), subir(desde, alto))} className="fill-tinta" opacity={0.045} />
      <line x1={desde.x} y1={desde.y - alto} x2={hasta.x} y2={hasta.y - alto} className="stroke-linea-fuerte" strokeWidth={1.5} opacity={0.6} />
      <line x1={desde.x} y1={desde.y} x2={desde.x} y2={desde.y - alto} className="stroke-linea-fuerte" strokeWidth={1.5} opacity={0.6} />
      <line x1={hasta.x} y1={hasta.y} x2={hasta.x} y2={hasta.y - alto} className="stroke-linea-fuerte" strokeWidth={1.5} opacity={0.6} />
    </g>
  );
}

/** Rack de servidores contra el muro izquierdo; sus luces se vuelven cobalto mientras el equipo consulta. */
function Rack({ r, activo, desfase }: { r: number; activo: boolean; desfase: number }) {
  const c = 0.12;
  const dc = 0.7;
  const dr = 0.8;
  const cara = c + dc;
  return (
    <g aria-hidden>
      <Caja c={c} r={r} dc={dc} dr={dr} h={96} tope="var(--iso-izq)" izq="var(--iso-der)" der="var(--iso-pantalla)" />
      {[16, 30, 44, 58, 72].map((nivel, i) => {
        const p = subir(iso(cara, r + 0.08), nivel);
        const q = subir(iso(cara, r + dr - 0.08), nivel);
        const luz = subir(iso(cara, r + 0.18), nivel + 5);
        const luz2 = subir(iso(cara, r + 0.3), nivel + 5);
        return (
          <g key={nivel}>
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="stroke-linea" strokeWidth={1.5} />
            <Luz cx={luz.x} cy={luz.y} className={activo ? "fill-acento" : "fill-linea-fuerte"} retraso={(i * 3 + desfase * 5) * 0.13} />
            <circle cx={luz2.x} cy={luz2.y} r={1.8} className="fill-linea-fuerte" opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
}

function BaseDeDatos({ activo }: { activo: boolean }) {
  const { x, y } = iso(BASE_DATOS.c, BASE_DATOS.r);
  const rx = 24;
  const ry = 12;
  return (
    <g aria-hidden>
      {[0, 18, 36].map((z) => {
        const base = y - 8 - z;
        return (
          <g key={z}>
            <path d={`M ${x - rx} ${base - 14} V ${base} A ${rx} ${ry} 0 0 0 ${x + rx} ${base} V ${base - 14} z`} fill="var(--iso-izq)" />
            <ellipse cx={x} cy={base - 14} rx={rx} ry={ry} fill="var(--iso-tope)" />
            <Luz cx={x + 12} cy={base - 2} className={activo ? "fill-acento" : "fill-linea-fuerte"} retraso={z * 0.02} />
          </g>
        );
      })}
    </g>
  );
}

/** Consulta en curso: de la base de datos a quien la hace, sentado en la sala de juntas. */
function FlujoDatos({ hacia }: { hacia: Pantalla }) {
  const bucle = useBucle();
  const desde = subir(iso(BASE_DATOS.c, BASE_DATOS.r), 66);
  const control = { x: (desde.x + hacia.x) / 2, y: Math.min(desde.y, hacia.y) - 120 };
  return (
    <motion.path
      d={`M ${desde.x} ${desde.y} Q ${control.x} ${control.y} ${hacia.x} ${hacia.y}`}
      fill="none"
      strokeWidth={2}
      strokeDasharray="6 8"
      strokeLinecap="round"
      className="stroke-acento"
      // El trazo discontinuo corre de la base de datos hacia quien consulta.
      animate={bucle ? { strokeDashoffset: [0, -28] } : undefined}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
      aria-hidden
    />
  );
}

/* ---------- Gimnasio ---------- */

const JAULA = { c: 9.9, r: 7.9, dc: 1.15, dr: 0.85, h: 92 };

/** La jaula se dibuja en dos mitades para que quien entrena quede entre los postes de atrás y los de adelante. */
function Jaula({ parte }: { parte: "fondo" | "frente" }) {
  const j = JAULA;
  const esquinas = [iso(j.c, j.r), iso(j.c + j.dc, j.r), iso(j.c, j.r + j.dr), iso(j.c + j.dc, j.r + j.dr)];
  const arriba = esquinas.map((p) => subir(p, j.h));
  const poste = (p: Pantalla, i: number) => <rect key={i} x={p.x - 2.5} y={p.y - j.h} width={5} height={j.h} fill="var(--iso-metal)" />;
  const travesano = (p: Pantalla, q: Pantalla) => <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--iso-metal)" strokeWidth={4} />;
  if (parte === "fondo")
    return (
      <g aria-hidden>
        {poste(esquinas[0], 0)}
        {poste(esquinas[1], 1)}
        {travesano(arriba[0], arriba[1])}
      </g>
    );
  const barraR = j.r + j.dr / 2;
  const barraA = subir(iso(j.c - 0.25, barraR), 58);
  const barraB = subir(iso(j.c + j.dc + 0.25, barraR), 58);
  return (
    <g aria-hidden>
      <line x1={barraA.x} y1={barraA.y} x2={barraB.x} y2={barraB.y} className="stroke-linea-fuerte" strokeWidth={3} strokeLinecap="round" />
      {[0.1, 0.18].map((k) => (
        <g key={k}>
          <ellipse cx={barraA.x + (barraB.x - barraA.x) * k} cy={barraA.y + (barraB.y - barraA.y) * k} rx={5} ry={15} fill="var(--iso-metal)" />
          <ellipse cx={barraA.x + (barraB.x - barraA.x) * (1 - k)} cy={barraA.y + (barraB.y - barraA.y) * (1 - k)} rx={5} ry={15} fill="var(--iso-metal)" />
        </g>
      ))}
      {poste(esquinas[2], 2)}
      {poste(esquinas[3], 3)}
      {travesano(arriba[0], arriba[2])}
      {travesano(arriba[1], arriba[3])}
      {travesano(arriba[2], arriba[3])}
    </g>
  );
}

function Banco() {
  return (
    <g aria-hidden>
      <Caja c={9.6} r={6.5} dc={1.2} dr={0.4} h={10} tope="var(--iso-metal)" izq="var(--iso-metal)" der="var(--iso-metal)" />
      <Caja c={9.65} r={6.53} dc={1.1} dr={0.34} h={6} z={10} tope="var(--iso-tapete)" izq="var(--iso-pantalla)" der="var(--iso-pantalla)" />
    </g>
  );
}

function Mancuernero() {
  return (
    <g aria-hidden>
      <Caja c={11.2} r={6.3} dc={0.5} dr={1.5} h={20} />
      {[6.5, 6.85, 7.2, 7.55].map((r) => {
        const p = subir(iso(11.45, r), 24);
        return (
          <g key={r}>
            <circle cx={p.x - 6} cy={p.y} r={4.5} fill="var(--iso-metal)" />
            <circle cx={p.x + 6} cy={p.y} r={4.5} fill="var(--iso-metal)" />
            <line x1={p.x - 6} y1={p.y} x2={p.x + 6} y2={p.y} stroke="var(--iso-metal)" strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

function PesasRusas() {
  return (
    <g aria-hidden>
      {[
        { c: 8.9, r: 9.4 },
        { c: 9.3, r: 9.6 },
      ].map(({ c, r }) => {
        const { x, y } = iso(c, r);
        return (
          <g key={c}>
            <path d={`M ${x - 5} ${y - 12} a 5 5 0 0 1 10 0`} fill="none" stroke="var(--iso-metal)" strokeWidth={2.5} />
            <circle cx={x} cy={y - 6} r={7} fill="var(--iso-metal)" />
          </g>
        );
      })}
    </g>
  );
}

/* ---------- Decoración de muros ---------- */

/** Ventanas en el muro del fondo, sobre la oficina abierta. */
function Ventanas() {
  return (
    <g fill="var(--iso-piso)" aria-hidden>
      {[1.4, 4.1].map((c) => {
        const p = iso(c, 0);
        const q = iso(c + 1.6, 0);
        return <polygon key={c} points={puntos(subir(p, 76), subir(q, 76), subir(q, 28), subir(p, 28))} />;
      })}
    </g>
  );
}

/** Pantalla de la sala de juntas: una gráfica, o el caso y los encargos durante una junta. */
function PantallaSala({ lineas }: { lineas: string[] }) {
  const p = iso(8.4, 0);
  const q = iso(10.8, 0);
  const libre = lineas.length <= 1;
  const punto = (k: number, alto: number) => subir(iso(8.6 + k * 2, 0), alto);
  const curva = [0, 0.2, 0.4, 0.6, 0.8, 1].map((k, i) => punto(k, 40 + [0, 8, 4, 16, 14, 26][i]));
  const inicio = subir(iso(8.55, 0), 68);
  return (
    <g aria-hidden>
      <polygon points={puntos(subir(p, 80), subir(q, 80), subir(q, 30), subir(p, 30))} fill="var(--iso-pantalla)" />
      {libre ? (
        <polyline points={puntos(...curva)} fill="none" className="stroke-linea-fuerte" strokeWidth={2} strokeLinejoin="round" />
      ) : (
        // Texto inclinado con el muro (eje c).
        <g transform={`matrix(0.894 0.447 0 1 ${inicio.x} ${inicio.y})`}>
          {lineas.slice(-4).map((linea, i) => (
            <text key={i} y={i * 11} fontSize={8.5} fill={i === 0 && lineas.length <= 4 ? "#9ff0c7" : "#d6e2ee"}>
              {linea.length > 30 ? `${linea.slice(0, 29)}…` : linea}
            </text>
          ))}
        </g>
      )}
    </g>
  );
}

/** Pizarra en el muro izquierdo. */
function Pizarra() {
  const p = iso(0, 1.2);
  const q = iso(0, 3.4);
  return (
    <g aria-hidden>
      <polygon points={puntos(subir(p, 76), subir(q, 76), subir(q, 32), subir(p, 32))} fill="var(--iso-tope)" />
      {[0, 1, 2].map((i) => {
        const a = iso(0, 1.5 + i * 0.25);
        const b = iso(0, 2.6 + i * 0.25 - (i === 2 ? 0.5 : 0));
        return <line key={i} x1={a.x} y1={a.y - 62 + i * 9} x2={b.x} y2={b.y - 62 + i * 9} className="stroke-linea-fuerte" strokeWidth={2} strokeLinecap="round" />;
      })}
    </g>
  );
}

/** Reloj de pared con la hora real, en el muro del fondo. */
function Reloj({ minuto }: { minuto: number | null }) {
  const centro = subir(iso(6.7, 0), 62);
  const h = minuto === null ? null : { hora: ((minuto / 60) % 12) * 30, min: (minuto % 60) * 6 };
  // Redondeado: Node y el navegador difieren en el último decimal de sin/cos y eso rompe la hidratación.
  const redondo = (n: number) => Math.round(n * 100) / 100;
  const aguja = (grados: number, largo: number) => ({
    x: redondo(Math.sin((grados * Math.PI) / 180) * largo),
    y: redondo(-Math.cos((grados * Math.PI) / 180) * largo),
  });
  return (
    // Plano del muro: el eje x sigue la pared (c), el y queda vertical.
    <g transform={`matrix(0.894 0.447 0 1 ${centro.x} ${centro.y})`} aria-hidden>
      <circle r={15} fill="var(--iso-tope)" stroke="var(--iso-pantalla)" strokeWidth={2.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const p = aguja(i * 30, 11.5);
        const q = aguja(i * 30, i % 3 === 0 ? 8.5 : 10);
        return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--iso-pantalla)" strokeWidth={i % 3 === 0 ? 1.6 : 0.8} />;
      })}
      {h && (
        <>
          <line x2={aguja(h.hora, 6.5).x} y2={aguja(h.hora, 6.5).y} stroke="var(--iso-pantalla)" strokeWidth={2.2} strokeLinecap="round" />
          <line x2={aguja(h.min, 10).x} y2={aguja(h.min, 10).y} stroke="var(--iso-pantalla)" strokeWidth={1.4} strokeLinecap="round" />
        </>
      )}
      <circle r={1.6} className="fill-acento" />
    </g>
  );
}

type TipoPlanta = "monstera" | "lengua" | "arbusto";
const PLANTAS: [number, number, TipoPlanta][] = [
  [6.5, 0.45, "monstera"],
  [0.45, 6.4, "lengua"],
  [5.75, 7.55, "arbusto"],
  [11.55, 0.5, "lengua"],
  [6.55, 4.45, "arbusto"],
  [3.4, 9.55, "monstera"],
];

/** Tres plantas distintas: monstera de hojas anchas, lengua de suegra alta y un arbusto redondo en maceta blanca. */
function Planta({ c, r, tipo }: { c: number; r: number; tipo: TipoPlanta }) {
  const { x, y } = iso(c, r);
  const maceta =
    tipo === "arbusto" ? (
      <g>
        <path d={`M ${x - 10} ${y - 24} h 20 v 20 a 10 4 0 0 1 -20 0 z`} fill="var(--iso-tope)" />
        <ellipse cx={x} cy={y - 24} rx={10} ry={4} fill="var(--iso-izq)" />
      </g>
    ) : (
      <g>
        <path d={`M ${x - 11} ${y - 18} h 22 l -3 18 h -16 z`} fill="var(--iso-maceta)" />
        <rect x={x - 12.5} y={y - 21} width={25} height={4.5} rx={2} fill="var(--iso-maceta-clara)" />
      </g>
    );

  if (tipo === "lengua")
    return (
      <g aria-hidden>
        {maceta}
        {[
          [-7, 38, -3, "var(--iso-hoja-oscura)"],
          [6, 34, 4, "var(--iso-hoja-oscura)"],
          [-2.5, 48, -1, "var(--iso-hoja)"],
          [3, 42, 2, "var(--iso-hoja)"],
          [0, 30, 0, "var(--iso-hoja-clara)"],
        ].map(([dx, alto, inclina, color]) => {
          const base = x + (dx as number);
          const tope = y - 20 - (alto as number);
          return (
            <path
              key={`${dx}`}
              d={`M ${base - 3.5} ${y - 19} Q ${base - 3} ${tope + 14} ${base + (inclina as number)} ${tope} Q ${base + 3} ${tope + 14} ${base + 3.5} ${y - 19} z`}
              fill={color as string}
              stroke="var(--iso-hoja-clara)"
              strokeWidth={0.8}
              strokeOpacity={0.6}
            />
          );
        })}
      </g>
    );

  if (tipo === "arbusto")
    return (
      <g aria-hidden>
        {maceta}
        {[
          [-9, -32, 10, "var(--iso-hoja-oscura)"],
          [9, -32, 10, "var(--iso-hoja-oscura)"],
          [0, -38, 13, "var(--iso-hoja)"],
          [-5, -46, 9, "var(--iso-hoja)"],
          [6, -47, 8, "var(--iso-hoja-clara)"],
        ].map(([dx, dy, radio, color]) => (
          <circle key={`${dx},${dy}`} cx={x + (dx as number)} cy={y + (dy as number)} r={radio as number} fill={color as string} />
        ))}
        <circle cx={x + 3} cy={y - 50} r={2.5} fill="var(--iso-hoja-clara)" opacity={0.8} />
      </g>
    );

  // Monstera: tallos y hojas anchas en abanico.
  const hojas: [number, number, number, number, string][] = [
    [-14, -30, -30, 11, "var(--iso-hoja-oscura)"],
    [14, -31, 30, 11, "var(--iso-hoja-oscura)"],
    [-8, -43, -60, 10, "var(--iso-hoja)"],
    [9, -44, 58, 10, "var(--iso-hoja)"],
    [0, -50, 90, 9, "var(--iso-hoja-clara)"],
  ];
  return (
    <g aria-hidden>
      {hojas.map(([dx, dy]) => (
        <line key={`t${dx}`} x1={x} y1={y - 19} x2={x + dx * 0.7} y2={y + dy * 0.85} stroke="var(--iso-hoja-oscura)" strokeWidth={1.5} />
      ))}
      {maceta}
      {hojas.map(([dx, dy, giro, largo, color]) => (
        <g key={`h${dx}`} transform={`translate(${x + dx} ${y + dy}) rotate(${giro})`}>
          <ellipse rx={largo} ry={6.5} fill={color} />
          <path d={`M ${-largo + 2} 0 H ${largo - 2} M ${-3} 0 l -2 4 M 3 0 l 2 -4`} stroke="var(--iso-piso)" strokeWidth={0.9} opacity={0.6} />
        </g>
      ))}
    </g>
  );
}
