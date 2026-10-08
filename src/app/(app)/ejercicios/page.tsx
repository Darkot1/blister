import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { EsqueletoLista } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ejercicios" };

const TIPOS: Record<string, string> = {
  fuerza: "Fuerza",
  movilidad: "Movilidad",
  estiramiento: "Estiramiento",
  activacion: "Activación",
  cardio: "Cardio",
  calentamiento: "Calentamiento",
  enfriamiento: "Enfriamiento",
  otro: "Otros",
};

const DIFICULTAD: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export default function PaginaEjercicios() {
  return (
    <>
      <Encabezado
        titulo="Ejercicios"
        descripcion="Biblioteca base. Pronto podrás crear tus propios ejercicios y buscarlos por músculo."
      />
      <Suspense fallback={<EsqueletoLista filas={8} />}>
        <Biblioteca />
      </Suspense>
    </>
  );
}

async function Biblioteca() {
  const { supabase } = await obtenerContexto();
  const [{ data: ejercicios }, { data: relaciones }, { data: musculos }] = await Promise.all([
    supabase.from("ejercicios").select("id, nombre, tipo, dificultad, es_global").eq("estado", "activo").order("nombre"),
    supabase.from("ejercicios_musculos").select("ejercicio_id, musculo_id, rol").eq("rol", "principal"),
    supabase.from("musculos").select("id, nombre"),
  ]);

  const nombreMusculo = new Map((musculos ?? []).map((m) => [m.id, m.nombre]));
  const principales = new Map<string, string[]>();
  for (const r of relaciones ?? []) {
    const lista = principales.get(r.ejercicio_id) ?? [];
    lista.push(nombreMusculo.get(r.musculo_id) ?? "");
    principales.set(r.ejercicio_id, lista);
  }

  const porTipo = Object.keys(TIPOS)
    .map((tipo) => ({ tipo, lista: (ejercicios ?? []).filter((e) => e.tipo === tipo) }))
    .filter((g) => g.lista.length);

  return (
    <div className="space-y-10">
      {porTipo.map(({ tipo, lista }) => (
        <section key={tipo} aria-labelledby={`tipo-${tipo}`}>
          <h2 id={`tipo-${tipo}`} className="mb-3 font-titulo text-2xl font-semibold">
            {TIPOS[tipo]} <span className="text-base font-medium text-tenue">({lista.length})</span>
          </h2>
          <ul className="divide-y divide-linea rounded-lg border border-linea bg-superficie">
            {lista.map((e) => (
              <li key={e.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[2fr_2fr_auto] sm:items-center sm:gap-4">
                <span className="font-semibold">{e.nombre}</span>
                <span className="text-sm text-tenue">{(principales.get(e.id) ?? []).join(", ") || "—"}</span>
                <span className="text-sm text-tenue">{e.dificultad ? DIFICULTAD[e.dificultad] : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
