// Sugerencia de ejercicios por músculo, sin IA: lógica determinista (blueprint §56).
// Puntaje = suma, por cada músculo elegido que el ejercicio trabaja, del peso de su rol.
// Desempate: más músculos elegidos como principal, luego menor dificultad, luego nombre.

export type Rol = "principal" | "secundario" | "estabilizador";

export const PESO_ROL: Record<Rol, number> = { principal: 3, secundario: 1.5, estabilizador: 0.5 };

const ORDEN_DIFICULTAD: Record<string, number> = { principiante: 0, intermedio: 1, avanzado: 2 };

export type Coincidencia = { slug: string; rol: Rol };

export type Sugerencia<E> = {
  ejercicio: E;
  puntaje: number;
  /** 1–5, relativo al mejor resultado de la búsqueda. */
  relevancia: number;
  coincidencias: Coincidencia[];
};

export function rankearEjercicios<E extends { id: string; nombre: string; dificultad: string | null }>(
  ejercicios: E[],
  relaciones: { ejercicioId: string; slug: string; rol: Rol }[],
  seleccionados: string[],
): Sugerencia<E>[] {
  const elegidos = new Set(seleccionados);
  const porEjercicio = new Map<string, Coincidencia[]>();
  for (const r of relaciones) {
    if (!elegidos.has(r.slug)) continue;
    const lista = porEjercicio.get(r.ejercicioId) ?? [];
    lista.push({ slug: r.slug, rol: r.rol });
    porEjercicio.set(r.ejercicioId, lista);
  }

  const resultado = ejercicios.flatMap((ejercicio) => {
    const coincidencias = porEjercicio.get(ejercicio.id);
    if (!coincidencias?.length) return [];
    coincidencias.sort((a, b) => PESO_ROL[b.rol] - PESO_ROL[a.rol]);
    const puntaje = coincidencias.reduce((total, c) => total + PESO_ROL[c.rol], 0);
    return [{ ejercicio, puntaje, relevancia: 0, coincidencias }];
  });

  const principales = (s: Sugerencia<E>) => s.coincidencias.filter((c) => c.rol === "principal").length;
  resultado.sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      principales(b) - principales(a) ||
      (ORDEN_DIFICULTAD[a.ejercicio.dificultad ?? ""] ?? 1) - (ORDEN_DIFICULTAD[b.ejercicio.dificultad ?? ""] ?? 1) ||
      a.ejercicio.nombre.localeCompare(b.ejercicio.nombre, "es"),
  );

  const mejor = resultado[0]?.puntaje ?? 0;
  for (const s of resultado) s.relevancia = Math.max(1, Math.round((s.puntaje / mejor) * 5));
  return resultado;
}
