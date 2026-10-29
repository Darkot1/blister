import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/tipos-bd";

/** Lo que nos importa de un update de Telegram: un mensaje de texto en un chat privado. */
type Update = { message?: { text?: string; chat?: { id?: number; type?: string } } };

const iguales = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Webhook del bot. Solo atiende "/start <codigo>" (el enlace que abre Ajustes → Telegram) y deja que
 * la base vincule el chat y responda. Siempre contesta 200 para que Telegram no reintente.
 */
export async function POST(request: NextRequest) {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRETO ?? "";
  const recibido = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secreto || !iguales(secreto, recibido)) return new NextResponse(null, { status: 401 });

  const update = (await request.json().catch(() => null)) as Update | null;
  const chat = update?.message?.chat;
  const inicio = update?.message?.text?.match(/^\/start(?:@\w+)?\s+([a-f0-9]{36})$/);
  if (!inicio || chat?.type !== "private" || typeof chat.id !== "number") return NextResponse.json({ ok: true });

  // Sin sesión: la RPC exige el mismo secreto (guardado en Vault) antes de tocar nada.
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.rpc("vincular_telegram", { p_secreto: secreto, p_codigo: inicio[1], p_chat_id: chat.id });
  if (error) console.error("vincular_telegram", error.message);
  return NextResponse.json({ ok: true });
}
