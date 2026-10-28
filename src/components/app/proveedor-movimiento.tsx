"use client";

import { MotionConfig } from "motion/react";

/**
 * Todas las animaciones de la app pasan por Motion (motion.dev). Con "user", si el dispositivo
 * pide movimiento reducido, Motion salta los desplazamientos y escalas; los bucles infinitos
 * (pulsos, LEDs) además se apagan con `useReducedMotion` donde se usan.
 */
export function ProveedorMovimiento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
