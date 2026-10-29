"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Todas las animaciones de la app pasan por Motion (motion.dev). Con "user", si el dispositivo
 * pide movimiento reducido, Motion salta los desplazamientos y escalas; los bucles infinitos
 * (pulsos, LEDs) además se apagan con `useReducedMotion` donde se usan.
 *
 * LazyMotion + `m.*` en lugar de `motion.*`: solo se carga lo que la app usa (animar, salir, tocar),
 * no el paquete entero. `strict` avisa si algún componente vuelve a importar `motion`. Las animaciones
 * de diseño (`layout`) cargan aparte, donde hacen falta (ver el editor de la página pública).
 */
export function ProveedorMovimiento({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
