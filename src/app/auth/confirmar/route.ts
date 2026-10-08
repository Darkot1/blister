import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/** Destino de los enlaces de correo (confirmar cuenta, recuperar contraseña). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const siguienteCrudo = searchParams.get("siguiente") ?? "/inicio";
  const siguiente = siguienteCrudo.startsWith("/") && !siguienteCrudo.startsWith("//") ? siguienteCrudo : "/inicio";

  const supabase = await crearClienteServidor();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      : { error: new Error("Enlace incompleto") };

  if (error) {
    return NextResponse.redirect(`${origin}/ingresar?error=enlace`);
  }
  return NextResponse.redirect(`${origin}${siguiente}`);
}
