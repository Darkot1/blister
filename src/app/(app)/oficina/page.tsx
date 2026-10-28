import type { Metadata } from "next";
import { Suspense } from "react";
import { Encabezado } from "@/components/app/encabezado";
import { Esqueleto } from "@/components/ui/esqueleto";
import type { CasoJunta } from "@/lib/agentes/juntas";
import { planesActivos } from "@/lib/entrenamiento/planes";
import { obtenerContexto } from "@/lib/sesion";
import { Oficina } from "./oficina";

export const metadata: Metadata = { title: "Oficina" };

export default function PaginaOficina() {
  return (
    <>
      <Encabezado
        titulo="Oficina"
        miga="Entrenamiento"
      />
      <Suspense
        fallback={
          <div className="grid gap-4">
            <Esqueleto className="h-36" />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
              <Esqueleto className="h-128" />
              <Esqueleto className="h-128" />
            </div>
          </div>
        }
      >
        <OficinaConAlumnos />
      </Suspense>
    </>
  );
}

/** Los alumnos activos para el buscador de la junta (con su rutina, para distinguirlos) y las últimas juntas. */
async function OficinaConAlumnos() {
  const { supabase } = await obtenerContexto();
  const [{ data: alumnos }, planes, { data: juntas }] = await Promise.all([
    supabase.from("alumnos").select("id, nombres, apellidos").eq("estado", "activo").order("nombres").order("apellidos"),
    planesActivos(supabase),
    supabase.from("juntas").select("id, alumno_id, pedido, resultado, modelos, creado_en").order("creado_en", { ascending: false }).limit(30),
  ]);
  return (
    <Oficina
      alumnos={(alumnos ?? []).map((a) => ({
        id: a.id,
        nombre: `${a.nombres} ${a.apellidos}`.trim(),
        detalle: planes.get(a.id) ? `Rutina: ${planes.get(a.id)!.nombre}` : undefined,
      }))}
      historial={(juntas ?? []).map((j) => ({
        id: j.id,
        alumnoId: j.alumno_id,
        creadoEn: j.creado_en,
        modelos: j.modelos,
        caso: j.resultado as CasoJunta,
      }))}
    />
  );
}
