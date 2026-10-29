"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Boton } from "@/components/ui/boton";
import { prepararTelegram } from "./acciones";

/** Cada cuánto se mira si el chat ya quedó vinculado, y hasta cuándo (luego, botón para comprobar). */
const CADA_MS = 3000;
const HASTA_MS = 3 * 60_000;

/**
 * Abre el chat del bot con el código y espera a que la persona toque "Iniciar": el webhook vincula el
 * chat y la tarjeta pasa sola a "Conectado".
 */
export function ConectarTelegram() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [esperando, setEsperando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!esperando) return;
    const intervalo = setInterval(() => router.refresh(), CADA_MS);
    const fin = setTimeout(() => clearInterval(intervalo), HASTA_MS);
    return () => {
      clearInterval(intervalo);
      clearTimeout(fin);
    };
  }, [esperando, router]);

  const conectar = () => {
    // La pestaña se abre ya, dentro del clic: abierta después de esperar al servidor, el navegador la bloquea.
    const ventana = window.open("", "_blank");
    iniciar(async () => {
      setError(null);
      const resultado = await prepararTelegram();
      if ("error" in resultado) {
        ventana?.close();
        setError(resultado.error);
        return;
      }
      if (ventana) ventana.location.href = resultado.url;
      else window.location.href = resultado.url;
      setEsperando(true);
    });
  };

  return (
    <div className="space-y-2">
      <Boton onClick={conectar} disabled={pendiente}>
        <Send aria-hidden className="size-4" /> {pendiente ? "Abriendo Telegram…" : esperando ? "Abrir Telegram otra vez" : "Conectar Telegram"}
      </Boton>
      {esperando && (
        <p role="status" className="text-sm text-tenue">
          En Telegram toca <span className="font-medium text-tinta">Iniciar</span>. Esta tarjeta se actualiza sola al quedar conectado.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}
