import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { after, NextResponse, type NextRequest } from "next/server";
import type { Database, Json } from "@/lib/supabase/tipos-bd";

// Transcribir un audio o subir una foto puede tardar más que un mensaje: se hace después de responder.
export const maxDuration = 60;

type Mensaje = { chat?: { id?: number }; voice?: Json; audio?: Json; photo?: Json; [clave: string]: Json | undefined };
type Update = { message?: Mensaje; [clave: string]: Json | undefined };
/** Lo que devuelve telegram_preparar_archivo: qué hacer con el audio o la foto. */
type Preparado = { accion?: "voz" | "foto"; token?: string; archivo?: string; ruta?: string };

const iguales = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Sin sesión: cada función de la base vuelve a exigir el secreto del webhook (guardado en Vault). */
const cliente = () =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function descargar(token: string, archivo: string) {
  const info = (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(archivo)}`, {
    signal: AbortSignal.timeout(10_000),
  }).then((r) => r.json())) as { result?: { file_path?: string } };
  if (!info.result?.file_path) return null;
  const respuesta = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`, { signal: AbortSignal.timeout(20_000) });
  return respuesta.ok ? respuesta.blob() : null;
}

/** Nota de voz → texto con Whisper en Groq (la misma clave que usan los agentes de la oficina). */
async function transcribir(audio: Blob) {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) return null;
  const formulario = new FormData();
  formulario.append("file", audio, "nota.ogg");
  formulario.append("model", "whisper-large-v3-turbo");
  formulario.append("language", "es");
  formulario.append("response_format", "json");
  const respuesta = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}` },
    body: formulario,
    signal: AbortSignal.timeout(30_000),
  });
  if (!respuesta.ok) {
    console.error("transcribir", respuesta.status);
    return null;
  }
  const datos = (await respuesta.json()) as { text?: string };
  return datos.text?.trim() || null;
}

async function avisar(token: string, chat: number | undefined, texto: string) {
  if (!chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

/**
 * Audio o foto: la base dice qué hacer (y con qué token y ruta). La voz se transcribe y vuelve a la base
 * como texto (`voz: true`); la foto se sube a fotos-progreso, a la ruta de un solo uso que dio la base.
 */
async function procesarArchivo(secreto: string, update: Update) {
  const supabase = cliente();
  const { data, error } = await supabase.rpc("telegram_preparar_archivo", { p_secreto: secreto, p_update: update });
  if (error) return console.error("telegram_preparar_archivo", error.message);
  const plan = (data ?? {}) as Preparado;
  if (!plan.accion || !plan.token || !plan.archivo) return;
  const chat = update.message?.chat?.id;
  const archivo = await descargar(plan.token, plan.archivo).catch(() => null);

  if (plan.accion === "voz") {
    const texto = archivo ? await transcribir(archivo).catch(() => null) : null;
    if (!texto) {
      return avisar(
        plan.token,
        chat,
        process.env.GROQ_API_KEY ? "🎙️ No pude entender el audio. Inténtalo de nuevo o escríbelo." : "🎙️ Las notas de voz aún no están activadas.",
      );
    }
    const { error: errorTexto } = await supabase.rpc("telegram_procesar", {
      p_secreto: secreto,
      p_update: { ...update, message: { ...update.message, text: texto, voz: true } },
    });
    if (errorTexto) console.error("telegram_procesar (voz)", errorTexto.message);
    return;
  }

  let subida = false;
  if (archivo && plan.ruta) {
    const { error: errorSubida } = await supabase.storage.from("fotos-progreso").upload(plan.ruta, archivo, { contentType: "image/jpeg", upsert: false });
    if (errorSubida) console.error("subir foto", errorSubida.message);
    subida = !errorSubida;
  }
  await supabase.rpc("telegram_confirmar_foto", { p_secreto: secreto, p_ruta: plan.ruta ?? "", p_ok: subida });
}

/**
 * Webhook del bot: comprueba que viene de Telegram y le pasa el update a la base (`telegram_procesar`),
 * que atiende comandos y botones y responde. Audios y fotos se procesan después de contestar.
 * Siempre contesta 200 para que Telegram no reintente.
 */
export async function POST(request: NextRequest) {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRETO ?? "";
  const recibido = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secreto || !iguales(secreto, recibido)) return new NextResponse(null, { status: 401 });

  const update = (await request.json().catch(() => null)) as Update | null;
  if (!update || typeof update !== "object" || Array.isArray(update)) return NextResponse.json({ ok: true });

  const mensaje = update.message;
  if (mensaje && (mensaje.voice || mensaje.audio || mensaje.photo)) {
    after(() => procesarArchivo(secreto, update).catch((e) => console.error("telegram archivo", e)));
    return NextResponse.json({ ok: true });
  }

  const { error } = await cliente().rpc("telegram_procesar", { p_secreto: secreto, p_update: update });
  if (error) console.error("telegram_procesar", error.message);
  return NextResponse.json({ ok: true });
}
