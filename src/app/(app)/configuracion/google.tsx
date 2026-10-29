import { CalendarCheck2, CalendarPlus, Unplug } from "lucide-react";
import { Aviso } from "@/components/ui/aviso";
import { clasesBoton } from "@/components/ui/boton";
import { CabeceraTarjeta, Tarjeta } from "@/components/ui/tarjeta";
import { fechaCorta } from "@/lib/formato";
import { desconectarGoogleCalendar } from "./acciones";
import { BotonAccion } from "@/components/ui/boton-accion";

const MENSAJES: Record<string, { tipo: "exito" | "error"; texto: string }> = {
  conectado: { tipo: "exito", texto: "Google Calendar conectado. Tus próximas citas ya se están pasando a tu calendario." },
  cancelado: { tipo: "error", texto: "Cancelaste la conexión con Google. Puedes intentarlo cuando quieras." },
  "sin-permiso": { tipo: "error", texto: "Hace falta el permiso para ver y editar eventos. Vuelve a conectar y déjalo marcado." },
  error: { tipo: "error", texto: "No se pudo conectar con Google. Inténtalo de nuevo." },
  "sin-configurar": { tipo: "error", texto: "La conexión con Google aún no está configurada en el servidor." },
};

/** Conectar el Google Calendar del entrenador: ahí van sus citas, con invitación y recordatorios para el alumno. */
export function TarjetaGoogle({
  resultado,
  conexion,
  configurado,
}: {
  /** ?google=… al volver del flujo de Google. */
  resultado?: string;
  conexion: { correo_google: string; conectado_en: string } | null;
  /** Hay credenciales de Google en el servidor. */
  configurado: boolean;
}) {
  const mensaje = resultado ? MENSAJES[resultado] : undefined;

  return (
    <Tarjeta className="overflow-hidden">
      <section aria-labelledby="titulo-google">
        <CabeceraTarjeta id="titulo-google" titulo="Google Calendar" />
        <div className="space-y-4 p-4">
          {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
          {conexion ? (
            <>
              <p className="flex items-start gap-2.5 text-sm">
                <CalendarCheck2 aria-hidden className="mt-0.5 size-4 shrink-0 text-exito" />
                <span>
                  Conectado con <span className="font-medium">{conexion.correo_google}</span>
                  <span className="block text-tenue">Desde el {fechaCorta(conexion.conectado_en)}</span>
                </span>
              </p>
              <ul className="space-y-1.5 text-sm text-tenue">
                <li>Cada cita que agendes, muevas o canceles se refleja en tu calendario.</li>
                <li>Si el alumno tiene correo, Google le envía la invitación, los cambios y sus recordatorios.</li>
                <li>Tú recibes un aviso 1 h antes y un correo 24 h antes.</li>
              </ul>
              <BotonAccion
                accion={desconectarGoogleCalendar}
                textoPendiente="Desconectando…"
                confirmacion={{
                  titulo: "¿Desconectar Google Calendar?",
                  texto: "Tus próximas citas dejarán de sincronizarse con tu calendario. Puedes volver a conectarlo cuando quieras.",
                  textoConfirmar: "Desconectar",
                }}
              >
                <Unplug aria-hidden className="size-4" /> Desconectar
              </BotonAccion>
            </>
          ) : (
            <>
              <p className="text-sm text-tenue">
                Conecta tu cuenta de Google y tus citas aparecerán en tu calendario con recordatorios. Tus alumnos con correo recibirán la
                invitación y los avisos de cambios.
              </p>
              {configurado ? (
                // Enlace normal (no <Link>): la ruta redirige a Google.
                <a href="/api/google/conectar" className={clasesBoton("primario")}>
                  <CalendarPlus aria-hidden className="size-4" /> Conectar Google Calendar
                </a>
              ) : (
                <p className="rounded-lg bg-hueso px-3 py-2.5 text-sm text-tenue">
                  Falta configurar las credenciales de Google en el servidor (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_TOKEN_KEY).
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </Tarjeta>
  );
}
