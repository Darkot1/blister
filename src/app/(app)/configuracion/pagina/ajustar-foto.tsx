"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";

/** Proporción del recorte: ancha, como la portada en escritorio (en móvil se ve el centro). */
const PROPORCION = 16 / 9;
const ZOOM_MAX = 3;
/** Lado mayor de la imagen final: nítida en pantallas grandes y ligera de cargar. */
const ANCHO_SALIDA = 1600;

type Punto = { x: number; y: number };

/**
 * Ajustar la portada antes de subirla: se arrastra para encuadrar (o flechas del teclado) y se acerca
 * con el zoom. Al confirmar se recorta en el navegador y se entrega como WebP listo para subir.
 */
export function AjustarFoto({
  archivo,
  alCancelar,
  alConfirmar,
}: {
  /** La imagen elegida; con null el diálogo está cerrado. */
  archivo: File | null;
  alCancelar: () => void;
  alConfirmar: (recorte: Blob) => void;
}) {
  const marco = useRef<HTMLDivElement>(null);
  const [imagen, setImagen] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [anchoMarco, setAnchoMarco] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [desplazamiento, setDesplazamiento] = useState<Punto>({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const inicio = useRef<{ puntero: Punto; desplazamiento: Punto } | null>(null);

  // Cargar la imagen elegida (y liberar su URL temporal al cerrar o cambiarla).
  useEffect(() => {
    if (!archivo) return;
    const temporal = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      setImagen(img);
      setUrl(temporal);
      setZoom(1);
      setDesplazamiento({ x: 0, y: 0 });
    };
    img.src = temporal;
    return () => {
      URL.revokeObjectURL(temporal);
      setImagen(null);
      setUrl(null);
    };
  }, [archivo]);

  // El marco cambia de ancho con la ventana: las cuentas usan su medida real.
  useEffect(() => {
    const caja = marco.current;
    if (!caja) return;
    const observador = new ResizeObserver(([e]) => setAnchoMarco(e.contentRect.width));
    observador.observe(caja);
    return () => observador.disconnect();
  }, [imagen]);

  const altoMarco = anchoMarco / PROPORCION;
  // Escala para que la imagen cubra el marco con zoom 1; el zoom multiplica sobre eso.
  const base = imagen ? Math.max(anchoMarco / imagen.naturalWidth, altoMarco / imagen.naturalHeight) : 1;
  const escala = base * zoom;
  const ancho = (imagen?.naturalWidth ?? 0) * escala;
  const alto = (imagen?.naturalHeight ?? 0) * escala;

  /** Mantiene la imagen cubriendo todo el marco: nunca asoma un borde vacío. */
  const limitar = (p: Punto, w = ancho, h = alto): Punto => ({
    x: Math.min(0, Math.max(anchoMarco - w, p.x)),
    y: Math.min(0, Math.max(altoMarco - h, p.y)),
  });
  // Posición efectiva: el desplazamiento se guarda relativo al centro para sobrevivir a cambios de tamaño.
  const centrado = { x: (anchoMarco - ancho) / 2, y: (altoMarco - alto) / 2 };
  const posicion = limitar({ x: centrado.x + desplazamiento.x, y: centrado.y + desplazamiento.y });

  const mover = (dx: number, dy: number) =>
    setDesplazamiento((d) => {
      const p = limitar({ x: centrado.x + d.x + dx, y: centrado.y + d.y + dy });
      return { x: p.x - centrado.x, y: p.y - centrado.y };
    });

  const cambiarZoom = (nuevo: number) => {
    const z = Math.min(ZOOM_MAX, Math.max(1, nuevo));
    // Acercar hacia el centro del marco: el punto que está en medio se queda en medio.
    const factor = z / zoom;
    setDesplazamiento((d) => ({ x: d.x * factor, y: d.y * factor }));
    setZoom(z);
  };

  const confirmar = async () => {
    if (!imagen) return;
    setPreparando(true);
    // Rectángulo de la imagen original que se ve dentro del marco.
    const sx = -posicion.x / escala;
    const sy = -posicion.y / escala;
    const sw = anchoMarco / escala;
    const sh = altoMarco / escala;
    const salidaAncho = Math.round(Math.min(ANCHO_SALIDA, sw));
    const lienzo = document.createElement("canvas");
    lienzo.width = salidaAncho;
    lienzo.height = Math.round(salidaAncho / PROPORCION);
    const ctx = lienzo.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imagen, sx, sy, sw, sh, 0, 0, lienzo.width, lienzo.height);
    lienzo.toBlob(
      (blob) => {
        setPreparando(false);
        if (blob) alConfirmar(blob);
      },
      "image/webp",
      0.86,
    );
  };

  return (
    <Dialogo abierto={archivo !== null} alCerrar={alCancelar} titulo="Ajustar la portada" amplio>
      <p className="mb-3 text-sm text-tenue">Arrastra la foto para encuadrarla y usa el zoom para acercarla. Lo que ves en el recuadro es lo que se publicará.</p>

      <div
        ref={marco}
        role="application"
        aria-label="Encuadre de la portada. Usa las flechas para mover la foto y + o − para el zoom."
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          inicio.current = { puntero: { x: e.clientX, y: e.clientY }, desplazamiento };
          setArrastrando(true);
        }}
        onPointerMove={(e) => {
          if (!inicio.current) return;
          const d = inicio.current.desplazamiento;
          const p = limitar({ x: centrado.x + d.x + e.clientX - inicio.current.puntero.x, y: centrado.y + d.y + e.clientY - inicio.current.puntero.y });
          setDesplazamiento({ x: p.x - centrado.x, y: p.y - centrado.y });
        }}
        onPointerUp={() => {
          inicio.current = null;
          setArrastrando(false);
        }}
        onPointerCancel={() => {
          inicio.current = null;
          setArrastrando(false);
        }}
        onKeyDown={(e) => {
          const paso = e.shiftKey ? 40 : 10;
          const teclas: Record<string, () => void> = {
            ArrowLeft: () => mover(paso, 0),
            ArrowRight: () => mover(-paso, 0),
            ArrowUp: () => mover(0, paso),
            ArrowDown: () => mover(0, -paso),
            "+": () => cambiarZoom(zoom + 0.1),
            "=": () => cambiarZoom(zoom + 0.1),
            "-": () => cambiarZoom(zoom - 0.1),
          };
          if (teclas[e.key]) {
            e.preventDefault();
            teclas[e.key]();
          }
        }}
        // Ancho limitado para que el alto no pase de ~52 % de la pantalla: los botones siempre quedan a la vista.
        className={`relative mx-auto aspect-video w-full max-w-[calc(52dvh*16/9)] touch-none overflow-hidden rounded-2xl bg-hueso outline-none select-none focus-visible:ring-2 focus-visible:ring-acento ${
          arrastrando ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {url && imagen && anchoMarco > 0 && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen local (blob) mientras se recorta
          <img
            src={url}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-0 left-0 max-w-none"
            style={{ width: ancho, height: alto, transform: `translate(${posicion.x}px, ${posicion.y}px)` }}
          />
        )}
        {/* Tercios mientras se arrastra: ayudan a encuadrar a la persona. */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${arrastrando ? "opacity-100" : "opacity-0"}`}
          style={{
            backgroundImage:
              "linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255,255,255,.5) calc(33.33% - 0.5px), rgba(255,255,255,.5) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,.5) calc(66.66% - 0.5px), rgba(255,255,255,.5) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,.5) calc(33.33% - 0.5px), rgba(255,255,255,.5) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,.5) calc(66.66% - 0.5px), rgba(255,255,255,.5) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))",
          }}
        />
        {!arrastrando && imagen && (
          <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur">
            <Move className="size-3.5" /> Arrastra para encuadrar
          </span>
        )}
        {!imagen && <p className="absolute inset-0 grid place-items-center text-sm text-tenue">Cargando foto…</p>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => cambiarZoom(zoom - 0.2)}
          disabled={zoom <= 1}
          aria-label="Alejar"
          className="grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30"
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <label className="flex-1">
          <span className="sr-only">Zoom</span>
          <input
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => cambiarZoom(Number(e.target.value))}
            className="w-full accent-[var(--acento)]"
          />
        </label>
        <button
          type="button"
          onClick={() => cambiarZoom(zoom + 0.2)}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Acercar"
          className="grid size-8 shrink-0 place-items-center rounded-full text-tenue hover:bg-hueso hover:text-tinta disabled:opacity-30"
        >
          <Plus aria-hidden className="size-4" />
        </button>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-tenue">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Boton
          type="button"
          variante="fantasma"
          className="sm:mr-auto"
          onClick={() => {
            setZoom(1);
            setDesplazamiento({ x: 0, y: 0 });
          }}
        >
          <RotateCcw aria-hidden className="size-4" /> Restablecer
        </Boton>
        <Boton type="button" variante="secundario" onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="button" disabled={!imagen || preparando} onClick={confirmar}>
          {preparando ? "Preparando…" : "Usar esta foto"}
        </Boton>
      </div>
    </Dialogo>
  );
}
