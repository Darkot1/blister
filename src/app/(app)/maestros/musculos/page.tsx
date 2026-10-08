import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { PestanasMaestros } from "../pestanas";
import { GestorMusculos } from "./gestor-musculos";

export const metadata: Metadata = { title: "Maestro de músculos" };

export default function PaginaMaestroMusculos() {
  return (
    <>
      <Encabezado
        titulo="Maestros"
        miga="Catálogo"
        descripcion="Crea tus propios ejercicios y músculos. Los globales los mantiene Blister y no se pueden editar."
      />
      <PestanasMaestros activa="/maestros/musculos" />
      <Suspense fallback={<Cargando />}>
        <Musculos />
      </Suspense>
    </>
  );
}

function Cargando() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando">
      {Array.from({ length: 6 }, (_, i) => <Esqueleto key={i} className="h-48" />)}
    </div>
  );
}

async function Musculos() {
  const { supabase } = await obtenerContexto();
  const [{ data: grupos }, { data: musculos }, { data: usos }] = await Promise.all([
    supabase.from("grupos_musculares").select("id, nombre, orden").order("orden"),
    supabase.from("musculos").select("id, nombre, descripcion, grupo_muscular_id, organizacion_id, orden").order("orden").order("nombre"),
    supabase.from("ejercicios_musculos").select("musculo_id"),
  ]);
  const enUso = new Map<string, number>();
  for (const u of usos ?? []) enUso.set(u.musculo_id, (enUso.get(u.musculo_id) ?? 0) + 1);

  return (
    <GestorMusculos
      grupos={(grupos ?? []).map((g) => ({
        id: g.id,
        nombre: g.nombre,
        musculos: (musculos ?? [])
          .filter((m) => m.grupo_muscular_id === g.id)
          .map((m) => ({
            id: m.id,
            nombre: m.nombre,
            descripcion: m.descripcion,
            propio: m.organizacion_id !== null,
            ejercicios: enUso.get(m.id) ?? 0,
          })),
      }))}
    />
  );
}
