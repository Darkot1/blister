import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { obtenerContexto } from "@/lib/sesion";
import { cifrar, googleConfigurado, pedirTokens, sincronizarProximas } from "@/lib/google/calendario";
import { COOKIE_ESTADO, origenPublico, uriRetorno, valorCookieEstado } from "@/lib/google/oauth";

const PERMISO_EVENTOS = "https://www.googleapis.com/auth/calendar.events";

/** Google vuelve aquí: se cambia el código por tokens, se guardan cifrados y se pasan las próximas citas. */
export async function GET(request: NextRequest) {
  const { supabase, usuarioId } = await obtenerContexto();
  const origen = origenPublico(request);
  const volver = (resultado: string) => {
    const respuesta = NextResponse.redirect(`${origen}/configuracion?google=${resultado}`);
    respuesta.cookies.delete({ name: COOKIE_ESTADO, path: "/api/google" });
    return respuesta;
  };

  const params = request.nextUrl.searchParams;
  // La cookie trae "estado.usuario": debe coincidir con lo que devuelve Google y con quien tiene la sesión ahora.
  const esperado = request.cookies.get(COOKIE_ESTADO)?.value ?? "";
  const recibido = valorCookieEstado(params.get("state") ?? "", usuarioId);
  const estadoValido =
    esperado.length > 0 && esperado.length === recibido.length && timingSafeEqual(Buffer.from(esperado), Buffer.from(recibido));
  if (!estadoValido) return volver("error");
  if (params.get("error")) return volver("cancelado");
  const codigo = params.get("code");
  if (!codigo || !googleConfigurado()) return volver("error");

  try {
    const tokens = await pedirTokens({ grant_type: "authorization_code", code: codigo, redirect_uri: uriRetorno(request) });
    // Google deja desmarcar permisos: sin el de eventos no hay nada que hacer.
    if (!tokens.scope?.split(" ").includes(PERMISO_EVENTOS)) return volver("sin-permiso");
    if (!tokens.refresh_token) return volver("error");

    const perfil = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    }).then((r) => (r.ok ? (r.json() as Promise<{ email?: unknown }>) : {}));
    const correo = "email" in perfil && typeof perfil.email === "string" ? perfil.email : "Cuenta de Google";

    const { error } = await supabase.from("conexiones_google").upsert({
      usuario_id: usuarioId,
      correo_google: correo,
      refresh_token_cifrado: cifrar(tokens.refresh_token, usuarioId),
      acceso_cifrado: cifrar(tokens.access_token, usuarioId),
      acceso_expira_en: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });
    if (error) return volver("error");
  } catch (e) {
    console.error("google/callback", e instanceof Error ? e.message : e);
    return volver("error");
  }

  // Las próximas citas pasan a Google sin hacer esperar la redirección. Sin correos: esas citas el alumno ya las conocía.
  after(() => sincronizarProximas(supabase, usuarioId));
  return volver("conectado");
}
