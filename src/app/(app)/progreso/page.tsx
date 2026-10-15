import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Esqueleto, EsqueletoLista } from "@/components/ui/esqueleto";
import { progresoAlumno, resumenAlumnos } from "@/lib/entrenamiento/progreso";
import { obtenerContexto } from "@/lib/sesion";
import { Resumen, VistaAlumno } from "./vistas";

export const metadata: Metadata = { title: "Progreso" };

const esId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export default function PaginaProgreso({ searchParams }: PageProps<"/progreso">) {
  return (
    <Suspense
      fallback={
        <>
          <Esqueleto className="mb-6 h-20 w-full max-w-md" />
          <EsqueletoLista filas={8} />
        </>
      }
    >
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/progreso">["searchParams"] }) {
  const { alumno, ejercicio, filtro } = await searchParams;
  const { supabase } = await obtenerContexto();
  if (esId(alumno)) {
    const [datos, filas] = await Promise.all([progresoAlumno(supabase, alumno), resumenAlumnos(supabase)]);
    if (!datos) notFound();
    return <VistaAlumno datos={datos} ejercicioId={esId(ejercicio) ? ejercicio : null} filas={filas} />;
  }
  return <Resumen filas={await resumenAlumnos(supabase)} filtro={typeof filtro === "string" ? filtro : ""} />;
}
