"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Copy, Download, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { clasesBoton } from "@/components/ui/boton";
import { TextoCopiable, useCopiar } from "./ayudas";

const sinSuscripcion = () => () => {};

/**
 * Llevar gente a la página: el enlace para copiar, compartir por WhatsApp (o con el menú del celular),
 * un texto para la bio y las historias, y un código QR para imprimir o poner en el gimnasio.
 */
export function Compartir({ enlace, quien }: { enlace: string; quien: string }) {
  const { copiado, copiar } = useCopiar();
  // El menú de compartir del sistema solo existe en algunos navegadores (sobre todo en el celular).
  const puedeCompartir = useSyncExternalStore(sinSuscripcion, () => typeof navigator.share === "function", () => false);
  const mensaje = `Hola, te comparto mi página para que entrenes conmigo. Ahí ves cómo trabajo y puedes pedir tu cupo: ${enlace}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 rounded-2xl bg-hueso py-1.5 pr-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm tabular-nums">{enlace}</span>
        <button
          type="button"
          onClick={() => copiar(enlace, "enlace")}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-superficie px-3 text-xs font-medium text-tinta transition-colors hover:bg-fondo"
        >
          {copiado === "enlace" ? <Check aria-hidden className="size-3.5 text-exito" /> : <Copy aria-hidden className="size-3.5" />}
          {copiado === "enlace" ? "Copiado" : "Copiar"}
        </button>
        <span role="status" className="sr-only">{copiado === "enlace" ? "Enlace copiado" : ""}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noreferrer"
          className={clasesBoton("secundario", "min-w-0")}
        >
          <MessageCircle aria-hidden className="size-4" /> <span className="truncate">WhatsApp</span>
        </a>
        {puedeCompartir ? (
          <button
            type="button"
            onClick={() => navigator.share({ title: `Entrena con ${quien}`, text: "Mira cómo trabajo y pide tu cupo:", url: enlace }).catch(() => {})}
            className={clasesBoton("secundario", "min-w-0")}
          >
            <Share2 aria-hidden className="size-4" /> <span className="truncate">Compartir</span>
          </button>
        ) : (
          <a href={enlace} target="_blank" rel="noreferrer" className={clasesBoton("secundario", "min-w-0")}>
            <ExternalLink aria-hidden className="size-4" /> <span className="truncate">Ver mi página</span>
          </a>
        )}
      </div>

      <TextoCopiable etiqueta="Para tu bio de Instagram o tus historias" texto={`Entrena conmigo. Pide tu cupo aquí:\n${enlace}`} />

      <CodigoQr texto={enlace} />
    </div>
  );
}

/** Código QR del enlace, dibujado como SVG (se adapta al tema) y descargable como PNG para imprimir. */
function CodigoQr({ texto }: { texto: string }) {
  const [matriz, setMatriz] = useState<boolean[][] | null>(null);

  useEffect(() => {
    let vivo = true;
    // La librería solo se carga aquí, cuando hace falta el QR.
    void import("uqr").then(({ encode }) => {
      if (vivo) setMatriz(encode(texto, { ecc: "M", border: 2 }).data);
    });
    return () => {
      vivo = false;
    };
  }, [texto]);

  const descargar = () => {
    if (!matriz) return;
    const escala = 16;
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = matriz.length * escala;
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.fillStyle = "#12121b";
    matriz.forEach((fila, y) => fila.forEach((negro, x) => negro && ctx.fillRect(x * escala, y * escala, escala, escala)));
    const a = document.createElement("a");
    a.href = lienzo.toDataURL("image/png");
    a.download = "qr-mi-pagina.png";
    a.click();
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-linea p-3">
      {/* Siempre negro sobre blanco: los lectores de QR fallan con colores invertidos. */}
      <div className="grid size-28 shrink-0 place-items-center rounded-xl bg-white p-1">
        {matriz ? (
          <svg role="img" aria-label="Código QR de tu página" viewBox={`0 0 ${matriz.length} ${matriz.length}`} className="size-full" shapeRendering="crispEdges">
            <path
              fill="#12121b"
              d={matriz.flatMap((fila, y) => fila.map((negro, x) => (negro ? `M${x} ${y}h1v1h-1z` : ""))).join("")}
            />
          </svg>
        ) : (
          <span className="text-xs text-[#62626f]">Generando…</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">Código QR</p>
        <p className="mt-0.5 text-xs text-tenue">Imprímelo en el gimnasio o en tus tarjetas: al escanearlo abren tu página.</p>
        <button type="button" onClick={descargar} disabled={!matriz} className={clasesBoton("fantasma", "mt-2 h-8 px-3 text-xs")}>
          <Download aria-hidden className="size-3.5" /> Descargar PNG
        </button>
      </div>
    </div>
  );
}
