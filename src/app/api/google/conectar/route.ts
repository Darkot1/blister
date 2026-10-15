import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerContexto } from "@/lib/sesion";
import { ALCANCES, googleConfigurado } from "@/lib/google/calendario";
import { COOKIE_ESTADO, origenPublico, uriRetorno, valorCookieEstado } from "@/lib/google/oauth";

/** Inicia la conexión con Google Calendar: pide el permiso de eventos y un refresh token. */
export async function GET(request: NextRequest) {
  const { usuarioId } = await obtenerContexto(); // Exige sesión.
  const origen = origenPublico(request);
  if (!googleConfigurado()) return NextResponse.redirect(`${origen}/configuracion?google=sin-configurar`);

  // Contra CSRF: Google devuelve este valor y se compara con la cookie.
  const estado = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: uriRetorno(request),
    response_type: "code",
    scope: ALCANCES,
    access_type: "offline",
    // Siempre consentimiento: así Google entrega el refresh token también al reconectar.
    prompt: "consent",
    include_granted_scopes: "true",
    state: estado,
  }).toString();

  const respuesta = NextResponse.redirect(url);
  respuesta.cookies.set(COOKIE_ESTADO, valorCookieEstado(estado, usuarioId), {
    httpOnly: true,
    secure: origen.startsWith("https"),
    sameSite: "lax",
    path: "/api/google",
    maxAge: 600,
  });
  return respuesta;
}
