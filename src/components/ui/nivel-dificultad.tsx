import { ETIQUETA_DIFICULTAD } from "@/lib/ejercicios/etiquetas";

const TONO: Record<string, string> = {
  principiante: "bg-exito",
  intermedio: "bg-aviso",
  avanzado: "bg-peligro",
};

/** Dificultad de un ejercicio: punto de color + texto. */
export function NivelDificultad({ dificultad }: { dificultad: string }) {
  return (
    <span className="inline-flex h-6 w-fit items-center gap-1.5 rounded-full bg-hueso px-2.5 text-xs font-medium">
      <span aria-hidden className={`size-1.5 rounded-full ${TONO[dificultad] ?? "bg-tenue"}`} />
      {ETIQUETA_DIFICULTAD[dificultad] ?? dificultad}
    </span>
  );
}
