import "server-only";
import type { NextRequest } from "next/server";

export const COOKIE_ESTADO = "google_estado";

/**
 * Origen público de la app. En producción se fija con APP_URL (p. ej. https://app.blister.co):
 * así ni la URI de retorno de Google ni las redirecciones dependen de cabeceras que podría falsear un proxy.
 * En desarrollo, si no está, se deduce de la petición.
 */
export function origenPublico(request: NextRequest) {
  const fijo = process.env.APP_URL?.replace(/\/+$/, "");
  if (fijo) return fijo;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocolo = request.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${protocolo}://${host}` : request.nextUrl.origin;
}

/** La cookie de estado lleva también quién inició el flujo: en un navegador compartido, otro usuario no puede terminarlo. */
export const valorCookieEstado = (estado: string, usuarioId: string) => `${estado}.${usuarioId}`;

export const uriRetorno = (request: NextRequest) => `${origenPublico(request)}/api/google/callback`;
