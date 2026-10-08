export const TIPOS_EJERCICIO = [
  "fuerza",
  "movilidad",
  "estiramiento",
  "activacion",
  "cardio",
  "calentamiento",
  "enfriamiento",
  "otro",
] as const;

export const ETIQUETA_TIPO: Record<string, string> = {
  fuerza: "Fuerza",
  movilidad: "Movilidad",
  estiramiento: "Estiramiento",
  activacion: "Activación",
  cardio: "Cardio",
  calentamiento: "Calentamiento",
  enfriamiento: "Enfriamiento",
  otro: "Otros",
};

export const DIFICULTADES = ["principiante", "intermedio", "avanzado"] as const;

export const ETIQUETA_DIFICULTAD: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const ROLES_MUSCULO = ["principal", "secundario", "estabilizador"] as const;

export const ETIQUETA_ROL_MUSCULO: Record<string, string> = {
  principal: "Principal",
  secundario: "Secundario",
  estabilizador: "Estabilizador",
};
