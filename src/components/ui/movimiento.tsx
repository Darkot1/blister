"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

/** Entrada corta: sube 6 px mientras aparece. Se esparce en cualquier `motion.*` ({...APARECE}). */
export const APARECE = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" } satisfies Transition,
};

/** Latido de opacidad para "cargando" o "pendiente". */
export const PULSO = { opacity: [1, 0.5, 1] };
export const RITMO_PULSO: Transition = { duration: 2, repeat: Infinity, ease: "easeInOut" };

/**
 * Bucles infinitos (pulsos, LEDs, flujos): con movimiento reducido se quedan quietos.
 * MotionConfig solo frena desplazamientos y escalas, no la opacidad; por eso este hook.
 */
export const useBucle = () => !useReducedMotion();

/** Bloque que late mientras carga: base de los esqueletos. */
export function Pulso({ className = "" }: { className?: string }) {
  const bucle = useBucle();
  return <motion.div aria-hidden className={className} animate={bucle ? PULSO : undefined} transition={RITMO_PULSO} />;
}

/** Onda que se expande y se desvanece (como un radar) sobre un círculo SVG: "en curso". */
export function Onda({ className = "", ...circulo }: { cx: number; cy: number; r: number; className?: string }) {
  const bucle = useBucle();
  return (
    <motion.circle
      {...circulo}
      className={className}
      style={{ transformBox: "fill-box", originX: 0.5, originY: 0.5 }}
      animate={bucle ? { scale: [1, 2], opacity: [1, 0] } : undefined}
      transition={{ duration: 1, repeat: Infinity, ease: [0, 0, 0.2, 1] }}
    />
  );
}

/** Bloque que entra con {@link APARECE}; `retraso` (s) escalona bloques vecinos (bento, tarjetas). */
export function Aparece({ retraso = 0, className, children }: { retraso?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={APARECE.initial} animate={APARECE.animate} transition={{ ...APARECE.transition, delay: retraso }} className={className}>
      {children}
    </motion.div>
  );
}
