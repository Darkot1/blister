import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Contexto } from "@/lib/sesion";

// Citas en el Google Calendar del entrenador (ver la migración google_calendar).
// Variables del servidor: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_TOKEN_KEY
// (32 bytes en base64: `openssl rand -base64 32`). Sin ellas, la integración se apaga sola.

type Supabase = Contexto["supabase"];

export const ALCANCES = "openid email https://www.googleapis.com/auth/calendar.events";
const ZONA = "America/Bogota";
const API = "https://www.googleapis.com/calendar/v3";
const TIPO_CITA: Record<string, string> = { entrenamiento: "Entrenamiento", evaluacion: "Evaluación", consulta: "Consulta", otro: "Cita" };

export function googleConfigurado() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && clave());
}

function clave() {
  const valor = process.env.GOOGLE_TOKEN_KEY;
  if (!valor) return null;
  const bytes = Buffer.from(valor, "base64");
  return bytes.length === 32 ? bytes : null;
}

const VERSION = "v1";

/**
 * AES-256-GCM: "v1.iv.etiqueta.cifrado" en base64url. El usuario va como dato asociado:
 * un token copiado a la fila de otro usuario no se puede descifrar. La versión permite rotar la clave.
 */
export function cifrar(texto: string, usuarioId: string) {
  const k = clave();
  if (!k) throw new Error("Falta GOOGLE_TOKEN_KEY");
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", k, iv);
  cifrador.setAAD(Buffer.from(usuarioId));
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  return [VERSION, ...[iv, cifrador.getAuthTag(), cifrado].map((b) => b.toString("base64url"))].join(".");
}

export function descifrar(valor: string, usuarioId: string) {
  const k = clave();
  if (!k) throw new Error("Falta GOOGLE_TOKEN_KEY");
  const [version, ...partes] = valor.split(".");
  if (version !== VERSION || partes.length !== 3) throw new ErrorCifrado();
  const [iv, etiqueta, cifrado] = partes.map((p) => Buffer.from(p, "base64url"));
  try {
    const descifrador = createDecipheriv("aes-256-gcm", k, iv);
    descifrador.setAAD(Buffer.from(usuarioId));
    descifrador.setAuthTag(etiqueta);
    return Buffer.concat([descifrador.update(cifrado), descifrador.final()]).toString("utf8");
  } catch {
    throw new ErrorCifrado();
  }
}

/** El token guardado no se puede descifrar (otra clave o dato dañado): hay que reconectar. */
class ErrorCifrado extends Error {
  constructor() {
    super("No se pudo leer la conexión con Google");
  }
}

/** Pide tokens a Google (código de autorización o refresh token). */
export async function pedirTokens(parametros: Record<string, string>) {
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      ...parametros,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorGoogle(respuesta.status, datos.error_description ?? datos.error ?? "Google rechazó el permiso");
  return datos as { access_token: string; expires_in: number; refresh_token?: string; scope?: string };
}

/** Error de la API de Google, con su código HTTP (404 = el evento no existe). */
class ErrorGoogle extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

type Conexion = { usuario_id: string; refresh_token_cifrado: string; acceso_cifrado: string | null; acceso_expira_en: string | null; calendario_id: string };

/** Token de acceso del usuario actual: el guardado si sigue vigente, o uno nuevo. Null si no conectó Google. */
async function acceso(supabase: Supabase, usuarioId: string) {
  if (!googleConfigurado()) return null;
  const { data } = await supabase
    .from("conexiones_google")
    .select("usuario_id, refresh_token_cifrado, acceso_cifrado, acceso_expira_en, calendario_id")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  const conexion = data as Conexion | null;
  if (!conexion) return null;

  // Margen de un minuto para no usar un token que vence en pleno envío.
  if (conexion.acceso_cifrado && conexion.acceso_expira_en && new Date(conexion.acceso_expira_en).getTime() > Date.now() + 60_000) {
    return { token: descifrar(conexion.acceso_cifrado, usuarioId), calendario: conexion.calendario_id };
  }
  const nuevo = await pedirTokens({ grant_type: "refresh_token", refresh_token: descifrar(conexion.refresh_token_cifrado, usuarioId) });
  await supabase
    .from("conexiones_google")
    .update({ acceso_cifrado: cifrar(nuevo.access_token, usuarioId), acceso_expira_en: new Date(Date.now() + nuevo.expires_in * 1000).toISOString() })
    .eq("usuario_id", usuarioId);
  return { token: nuevo.access_token, calendario: conexion.calendario_id };
}

/** El id del evento sale de la cita: crear es idempotente y un reintento nunca lo duplica. */
const idEvento = (citaId: string) => `blister${citaId.replace(/-/g, "")}`;

async function llamar(token: string, metodo: string, ruta: string, cuerpo?: unknown) {
  const respuesta = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  // 410 = ya borrado: solo es "éxito" cuando lo que se pedía era borrar.
  if (!respuesta.ok && !(metodo === "DELETE" && respuesta.status === 410)) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new ErrorGoogle(respuesta.status, datos.error?.message ?? `Google respondió ${respuesta.status}`);
  }
  return respuesta;
}

const ACTIVAS = ["programada", "confirmada", "completada", "no_asistio"];

/**
 * Deja el evento de Google igual que la cita: lo crea, lo mueve o lo borra.
 * `avisarAlumno`: Google le envía correo al alumno (al crear, mover o cancelar; no al marcar asistencia).
 * Nunca lanza: si Google falla, la cita ya está guardada y el error queda en citas.google_error.
 * Solo sincroniza las citas del propio usuario (su Google Calendar).
 */
export async function sincronizarCita(supabase: Supabase, usuarioId: string, citaId: string, avisarAlumno: boolean) {
  try {
    const { data: cita } = await supabase
      .from("citas")
      .select("id, entrenador_id, alumno_id, sesion_id, tipo, estado, inicia_en, termina_en, google_evento_id")
      .eq("id", citaId)
      .maybeSingle();
    if (!cita || cita.entrenador_id !== usuarioId) return;
    const google = await acceso(supabase, usuarioId);
    if (!google) return;

    const ruta = `/calendars/${encodeURIComponent(google.calendario)}/events`;
    const envios = `sendUpdates=${avisarAlumno ? "all" : "none"}`;
    const id = idEvento(cita.id);

    if (!ACTIVAS.includes(cita.estado)) {
      // Cancelada: se borra el evento (Google avisa al alumno).
      // Se intenta siempre (por si el id no llegó a guardarse); si ya no existe, no pasa nada.
      await llamar(google.token, "DELETE", `${ruta}/${id}?${envios}`).catch((e) => {
        if (!(e instanceof ErrorGoogle && e.estado === 404)) throw e;
      });
      await supabase.from("citas").update({ google_evento_id: null, google_error: null }).eq("id", cita.id);
      return;
    }

    const [{ data: alumno }, dia] = await Promise.all([
      supabase.from("alumnos").select("nombres, apellidos, correo").eq("id", cita.alumno_id).maybeSingle(),
      diaDelPlan(supabase, cita.sesion_id),
    ]);
    const nombre = alumno ? `${alumno.nombres} ${alumno.apellidos}` : "Alumno";
    const correo = alumno?.correo?.trim();
    const evento = {
      id,
      status: "confirmed",
      summary: `${TIPO_CITA[cita.tipo] ?? "Cita"}: ${nombre}${dia ? ` · ${dia}` : ""}`,
      // Sin las notas de la cita: son del entrenador y el alumno ve el evento.
      description: dia ? `Toca ${dia}.\n\nAgendado con Blister Fitness.` : "Agendado con Blister Fitness.",
      start: { dateTime: cita.inicia_en, timeZone: ZONA },
      end: { dateTime: cita.termina_en, timeZone: ZONA },
      attendees: correo ? [{ email: correo, displayName: nombre }] : [],
      // Si el entrenador comparte su calendario, los demás solo ven "Ocupado".
      visibility: "private",
      // Recordatorios del entrenador; el alumno recibe los de su propio calendario.
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "email", minutes: 24 * 60 }] },
      guestsCanModify: false,
    };

    try {
      await llamar(google.token, "PATCH", `${ruta}/${id}?${envios}`, evento);
    } catch (e) {
      // No existe (o se borró): se crea con el mismo id.
      if (!(e instanceof ErrorGoogle && (e.estado === 404 || e.estado === 410))) throw e;
      await llamar(google.token, "POST", `${ruta}?${envios}`, evento);
    }
    await supabase.from("citas").update({ google_evento_id: id, google_error: null }).eq("id", cita.id);
  } catch (e) {
    // El detalle (puede traer correos o datos internos) solo va al registro del servidor.
    console.error("sincronizarCita", citaId, e instanceof Error ? e.message : e);
    await supabase.from("citas").update({ google_error: mensajeError(e) }).eq("id", citaId);
  }
}

/** Mensaje propio para la interfaz según el tipo de fallo (nunca el texto crudo de Google). */
function mensajeError(e: unknown) {
  if (e instanceof ErrorCifrado) return "Google Calendar se desconectó. Vuelve a conectarlo en Ajustes.";
  if (e instanceof ErrorGoogle) {
    if (e.estado === 400 && /invalid_grant/i.test(e.message)) return "Google Calendar se desconectó. Vuelve a conectarlo en Ajustes.";
    if (e.estado === 401) return "Google Calendar se desconectó. Vuelve a conectarlo en Ajustes.";
    if (e.estado === 403 && /rate|quota|limit/i.test(e.message)) return "Google está limitando las peticiones. Reintenta en unos minutos.";
    if (e.estado === 403) return "Tu cuenta de Google no dio permiso para editar este calendario. Vuelve a conectarlo.";
    if (e.estado === 400) return "Google no aceptó la cita (revisa el correo del alumno).";
    if (e.estado >= 500) return "Google Calendar no respondió. Reintenta en unos minutos.";
  }
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return "Google Calendar tardó demasiado. Reintenta en unos minutos.";
  return "No se pudo sincronizar con Google Calendar.";
}

async function diaDelPlan(supabase: Supabase, sesionId: string | null) {
  if (!sesionId) return null;
  const { data: sesion } = await supabase.from("sesiones").select("plan_dia_id").eq("id", sesionId).maybeSingle();
  if (!sesion?.plan_dia_id) return null;
  const { data: dia } = await supabase.from("plan_dias").select("nombre").eq("id", sesion.plan_dia_id).maybeSingle();
  return dia?.nombre ?? null;
}

/**
 * Citas cambiadas fuera de la app (botones del bot de Telegram, que no tiene los tokens de Google):
 * se pasan a Google la próxima vez que el entrenador entra. Pocas por vez para no alargar la petición.
 */
export async function sincronizarPendientes(supabase: Supabase, usuarioId: string) {
  const { data: citas } = await supabase
    .from("citas")
    .select("id, google_avisar")
    .eq("entrenador_id", usuarioId)
    .eq("google_pendiente", true)
    .limit(20);
  for (const c of citas ?? []) {
    await sincronizarCita(supabase, usuarioId, c.id, c.google_avisar);
    await supabase.from("citas").update({ google_pendiente: false, google_avisar: false }).eq("id", c.id);
  }
}

/** Al conectar: pasa a Google las próximas citas pendientes del entrenador (sin avisar a los alumnos de nuevo). */
export async function sincronizarProximas(supabase: Supabase, usuarioId: string) {
  const { data: citas } = await supabase
    .from("citas")
    .select("id")
    .eq("entrenador_id", usuarioId)
    .in("estado", ["programada", "confirmada"])
    .gte("inicia_en", new Date().toISOString())
    .order("inicia_en")
    .limit(100);
  for (const c of citas ?? []) await sincronizarCita(supabase, usuarioId, c.id, false);
}

/** Desconectar: se revoca el permiso en Google y se borra la conexión. Los eventos ya creados se quedan. */
export async function desconectarGoogle(supabase: Supabase, usuarioId: string) {
  const { data } = await supabase.from("conexiones_google").select("refresh_token_cifrado").eq("usuario_id", usuarioId).maybeSingle();
  // Revocar es un extra: si la clave cambió o Google no responde, la conexión se borra igual.
  try {
    if (data && googleConfigurado()) {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: descifrar(data.refresh_token_cifrado, usuarioId) }),
        signal: AbortSignal.timeout(10_000),
      });
    }
  } catch (e) {
    console.error("desconectarGoogle: no se pudo revocar", e instanceof Error ? e.message : e);
  }
  await supabase.from("conexiones_google").delete().eq("usuario_id", usuarioId);
}
