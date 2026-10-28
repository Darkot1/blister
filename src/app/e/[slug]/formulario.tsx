"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Aviso } from "@/components/ui/aviso";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { AreaTexto, Campo, Selector } from "@/components/ui/campo";
import { claseSegmento } from "@/components/ui/tarjeta";
import { ETIQUETA_TIPO_OBJETIVO } from "@/lib/formato";
import { enviarSolicitud, type EstadoSolicitud } from "./acciones";

type Tipo = "registro" | "contacto";

const TIPOS: { valor: Tipo; texto: string }[] = [
  { valor: "registro", texto: "Quiero entrenar" },
  { valor: "contacto", texto: "Tengo una pregunta" },
];

/**
 * Formulario de la página pública: pedir entrenar (con objetivo) o solo escribir.
 * Lo que se envía llega como solicitud al entrenador; nada se publica.
 */
export function FormularioSolicitud({ slug, entrenador }: { slug: string; entrenador: string }) {
  const [estado, enviar] = useActionState<EstadoSolicitud, FormData>(enviarSolicitud.bind(null, slug), {});
  const [tipo, setTipo] = useState<Tipo>((estado.valores?.tipo as Tipo) ?? "registro");
  const quieto = useReducedMotion();
  const v = (campo: string) => estado.valores?.[campo] ?? "";
  const e = estado.errores ?? {};

  return (
    <AnimatePresence mode="wait" initial={false}>
      {estado.enviada ? (
        <motion.div
          key="enviada"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[var(--radius-tarjeta)] border border-linea bg-superficie p-6 text-center sm:p-8"
          role="status"
        >
          <svg aria-hidden viewBox="0 0 48 48" className="mx-auto size-14">
            <circle cx="24" cy="24" r="22" className="fill-exito/15" />
            <motion.path
              d="M15 24.5 21.5 31 33 18"
              className="fill-none stroke-exito [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:3.5]"
              initial={{ pathLength: quieto ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
            />
          </svg>
          <h2 className="titulo-display mt-4 text-2xl">¡Listo, recibido!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-tenue">
            {tipo === "registro"
              ? `${entrenador} revisará tu solicitud y te contactará para empezar.`
              : `${entrenador} leerá tu mensaje y te responderá pronto.`}
          </p>
        </motion.div>
      ) : (
        <motion.form key="formulario" action={enviar} exit={{ opacity: 0, y: -8 }} className="space-y-4" noValidate>
          {estado.error && <Aviso>{estado.error}</Aviso>}

          <fieldset>
            <legend className="sr-only">¿Qué quieres hacer?</legend>
            <div className="grid w-full grid-cols-2 rounded-full bg-hueso p-1">
              {TIPOS.map((t) => (
                <label key={t.valor} className={`${claseSegmento(tipo === t.valor)} inline-flex cursor-pointer items-center justify-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento`}>
                  <input type="radio" name="tipo" value={t.valor} checked={tipo === t.valor} onChange={() => setTipo(t.valor)} className="sr-only" />
                  {t.texto}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre" nombre="nombres" required autoComplete="given-name" defaultValue={v("nombres")} errores={e.nombres} />
            <Campo etiqueta="Apellidos" nombre="apellidos" autoComplete="family-name" defaultValue={v("apellidos")} errores={e.apellidos} />
            <Campo etiqueta="Correo" nombre="correo" type="email" autoComplete="email" inputMode="email" defaultValue={v("correo")} errores={e.correo} />
            <Campo etiqueta="Teléfono o WhatsApp" nombre="telefono" type="tel" autoComplete="tel" inputMode="tel" defaultValue={v("telefono")} errores={e.telefono} />
          </div>
          <p className="-mt-2 text-xs text-tenue">Basta con uno de los dos para que te contacten.</p>

          <AnimatePresence initial={false}>
            {tipo === "registro" && (
              <motion.div
                key="objetivo"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: quieto ? 0 : 0.2 }}
                className="overflow-hidden"
              >
                <Selector
                  etiqueta="¿Qué te gustaría lograr?"
                  nombre="objetivo"
                  defaultValue={v("objetivo")}
                  errores={e.objetivo}
                  opciones={[{ valor: "", texto: "Elige uno (opcional)" }, ...Object.entries(ETIQUETA_TIPO_OBJETIVO).map(([valor, texto]) => ({ valor, texto }))]}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AreaTexto
            etiqueta={tipo === "registro" ? "Cuéntale algo más (opcional)" : "Tu mensaje"}
            nombre="mensaje"
            rows={4}
            maxLength={1000}
            placeholder={tipo === "registro" ? "Experiencia previa, lesiones, horarios que te sirven…" : "¿Qué te gustaría saber?"}
            defaultValue={v("mensaje")}
            errores={e.mensaje}
          />

          {/* Trampa para bots: invisible y fuera del orden de tabulación; una persona no la llena. */}
          <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
            <label>
              Sitio web
              <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <BotonEnvio textoPendiente="Enviando…" className="w-full">
            {tipo === "registro" ? "Enviar solicitud" : "Enviar mensaje"}
          </BotonEnvio>
          <p className="text-center text-xs text-tenue">Tus datos solo los verá {entrenador}.</p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
