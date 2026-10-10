"use client";

import { useState, useTransition } from "react";
import { Eye, Mail, Phone } from "lucide-react";
import { verContacto } from "../acciones";

const clasePastilla =
  "inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-linea bg-superficie px-2 font-mono text-xs hover:border-tinta/30 hover:text-tinta";

/** Teléfono o correo oculto: se pide al servidor al tocarlo y entonces se muestra como enlace. */
export function ContactoOculto({ alumnoId, campo }: { alumnoId: string; campo: "telefono" | "correo" }) {
  /** undefined = aún oculto; null = el alumno no lo tiene registrado. */
  const [valor, setValor] = useState<string | null | undefined>(undefined);
  const [pendiente, iniciar] = useTransition();
  const Icono = campo === "telefono" ? Phone : Mail;
  const texto = campo === "telefono" ? "teléfono" : "correo";

  if (valor === null) return <span className={`${clasePastilla} font-sans text-tenue`}>Sin {texto}</span>;
  if (valor) {
    return (
      <a href={campo === "telefono" ? `tel:${valor}` : `mailto:${valor}`} className={clasePastilla}>
        <Icono aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{valor}</span>
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => iniciar(async () => setValor(await verContacto(alumnoId, campo)))}
      className={`${clasePastilla} font-sans text-tenue`}
    >
      <Icono aria-hidden className="size-3 shrink-0" />
      {pendiente ? "Cargando…" : `Ver ${texto}`}
      <Eye aria-hidden className="size-3 shrink-0" />
    </button>
  );
}
