import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, Json } from "@/lib/supabase/tipos-bd";

const iguales = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Webhook del bot: comprueba que viene de Telegram y le pasa el update entero a la base
 * (`telegram_procesar`), que vincula el chat, atiende comandos y botones y responde.
 * Siempre contesta 200 para que Telegram no reintente.
 */
export async function POST(request: NextRequest) {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRETO ?? "";
  const recibido = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secreto || !iguales(secreto, recibido)) return new NextResponse(null, { status: 401 });

  const update = (await request.json().catch(() => null)) as Json | null;
  if (!update || typeof update !== "object" || Array.isArray(update)) return NextResponse.json({ ok: true });

  // Sin sesión: la función vuelve a exigir el mismo secreto (guardado en Vault) antes de tocar nada.
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.rpc("telegram_procesar", { p_secreto: secreto, p_update: update });
  if (error) console.error("telegram_procesar", error.message);
  return NextResponse.json({ ok: true });
}
