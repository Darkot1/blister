import { Dumbbell, Flame, HeartPulse, Link2, Move, Repeat, Shapes, Wind, type LucideIcon } from "lucide-react";
import type { TipoBloque } from "@/lib/entrenamiento/prescripcion";

/** Un icono por tipo de bloque: se reconoce el bloque sin leer su nombre. */
export const ICONO_BLOQUE: Record<TipoBloque, LucideIcon> = {
  calentamiento: Flame,
  fuerza: Dumbbell,
  superserie: Link2,
  circuito: Repeat,
  movilidad: Move,
  cardio: HeartPulse,
  enfriamiento: Wind,
  libre: Shapes,
};
