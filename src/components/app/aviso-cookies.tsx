"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { clasesBoton } from "@/components/ui/boton";
import { CLAVE_AVISO_COOKIES as CLAVE } from "./scripts-iniciales";

const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function visto() {
  try {
    return localStorage.getItem(CLAVE) === "visto";
  } catch {
    // Sin almacenamiento (modo privado): se muestra hasta que lo cierren en esta página.
    return false;
  }
}

let cerradoEnMemoria = false;

function cerrar() {
  cerradoEnMemoria = true;
  try {
    localStorage.setItem(CLAVE, "visto");
  } catch {}
  for (const oyente of oyentes) oyente();
}

/**
 * Aviso informativo: solo hay cookies necesarias y de preferencias, así que no se pide consentimiento,
 * se informa. En el servidor no se pinta (no sabe si ya se vio): aparece al hidratar.
 */
export function AvisoCookies() {
  const mostrar = useSyncExternalStore(
    suscribir,
    () => !cerradoEnMemoria && !visto(),
    () => false,
  );
  if (!mostrar) return null;

  return (
    <section
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-[var(--radius-elevada)] bg-superficie p-4 text-sm text-grafito shadow-flotante ring-1 ring-linea sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <Cookie aria-hidden className="hidden size-5 shrink-0 text-tenue sm:block" />
      <p className="flex-1">
        Solo usamos cookies necesarias para mantener tu sesión y recordar tus preferencias. Nada de publicidad ni rastreo.{" "}
        <Link href="/cookies" className="font-medium text-tinta underline underline-offset-2 hover:no-underline">
          Más información
        </Link>
      </p>
      <button type="button" onClick={cerrar} className={clasesBoton("primario", "h-10 shrink-0 self-end sm:self-auto")}>
        Entendido
      </button>
    </section>
  );
}
