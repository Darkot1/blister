import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { EnlaceBoton } from "@/components/ui/boton";
import { Esqueleto } from "@/components/ui/esqueleto";
import { obtenerContexto } from "@/lib/sesion";
import { fechaCorta } from "@/lib/formato";

export const metadata: Metadata = { title: "Inicio" };

export default function PaginaInicio() {
  return (
    <>
      <Encabezado
        titulo="Inicio"
        descripcion="El tablero con las sesiones del día llegará junto con el calendario."
        acciones={<EnlaceBoton href="/alumnos/nuevo"><Plus aria-hidden className="size-4" /> Nuevo alumno</EnlaceBoton>}
      />
      <Suspense fallback={<Esqueleto className="h-48 w-full" />}>
        <Resumen />
      </Suspense>
    </>
  );
}

async function Resumen() {
  const { supabase } = await obtenerContexto();
  const [{ count: activos }, { data: recientes }] = await Promise.all([
    supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    supabase.from("alumnos").select("id, nombres, apellidos, creado_en").neq("estado", "archivado")
      .order("creado_en", { ascending: false }).limit(5),
  ]);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Link href="/alumnos" className="rounded-lg border border-linea bg-superficie px-6 py-5 hover:border-tinta/30">
        <p className="text-sm text-tenue">Alumnos activos</p>
        <p className="cifra mt-1 text-7xl leading-none font-semibold">{activos ?? 0}</p>
      </Link>
      <section className="rounded-lg border border-linea bg-superficie px-6 py-5" aria-labelledby="titulo-recientes">
        <h2 id="titulo-recientes" className="mb-3 font-titulo text-xl font-semibold">Registrados recientemente</h2>
        {recientes?.length ? (
          <ul className="divide-y divide-linea">
            {recientes.map((a) => (
              <li key={a.id}>
                <Link href={`/alumnos/${a.id}`} className="flex items-center justify-between gap-4 py-2.5 hover:text-acento">
                  <span className="font-medium">{a.nombres} {a.apellidos}</span>
                  <span className="text-sm text-tenue">{fechaCorta(a.creado_en)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-tenue">Cuando registres alumnos aparecerán aquí.</p>
        )}
      </section>
    </div>
  );
}
