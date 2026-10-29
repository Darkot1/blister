import { BellRing, Send, Unplug } from "lucide-react";
import { BotonAccion } from "@/components/ui/boton-accion";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { fechaCorta } from "@/lib/formato";
import { desconectarTelegram, probarTelegram } from "./acciones";
import { ConectarTelegram } from "./telegram-conectar";

/** Avisos en Telegram: solicitudes nuevas de la página, las citas del día y cada cita 1 h antes. */
export function TarjetaTelegram({ vinculadoEn, configurado }: { vinculadoEn: string | null; configurado: boolean }) {
  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby="titulo-telegram">
        <CabeceraTarjeta id="titulo-telegram" titulo="Avisos en Telegram" />
        <div className="space-y-4 p-4">
          {vinculadoEn ? (
            <p className="flex items-start gap-2.5 text-sm">
              <BellRing aria-hidden className="mt-0.5 size-4 shrink-0 text-exito" />
              <span>
                Conectado
                <span className="block text-tenue">Desde el {fechaCorta(vinculadoEn)}</span>
              </span>
            </p>
          ) : (
            <p className="text-sm text-tenue">Recibe en tu celular, por Telegram:</p>
          )}
          <ul className="space-y-1.5 text-sm text-tenue">
            <li>Cada solicitud nueva de tu página pública, al momento.</li>
            <li>Tus citas del día, cada mañana.</li>
            <li>Un aviso 1 hora antes de cada cita.</li>
          </ul>
          {vinculadoEn ? (
            <div className="flex flex-wrap gap-2">
              <BotonAccion accion={probarTelegram} textoPendiente="Enviando…">
                <Send aria-hidden className="size-4" /> Enviar prueba
              </BotonAccion>
              <BotonAccion
                accion={desconectarTelegram}
                textoPendiente="Desconectando…"
                confirmacion={{
                  titulo: "¿Desconectar Telegram?",
                  texto: "Dejarás de recibir avisos de solicitudes y citas en Telegram. Puedes volver a conectarlo cuando quieras.",
                  textoConfirmar: "Desconectar",
                }}
              >
                <Unplug aria-hidden className="size-4" /> Desconectar
              </BotonAccion>
            </div>
          ) : configurado ? (
            <ConectarTelegram />
          ) : (
            <p className="rounded-lg bg-hueso px-3 py-2.5 text-sm text-tenue">
              Falta configurar el bot en el servidor (TELEGRAM_BOT_USUARIO y TELEGRAM_WEBHOOK_SECRETO).
            </p>
          )}
        </div>
      </section>
    </Tarjeta>
  );
}
